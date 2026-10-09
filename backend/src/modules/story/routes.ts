import { randomUUID } from "node:crypto";

import {
  createMomentRequestSchema,
  GENERATION_WINDOW_MS,
  getAge,
  regenerateMomentRequestSchema,
  type StoryResponse
} from "@sffl/shared";
import { Prisma } from "@prisma/client";
import type { FastifyInstance, FastifyReply } from "fastify";

import { getEnv } from "../../config/env.js";
import { PhotoRejectedError, prepareSourcePhoto } from "../../lib/images.js";
import { prisma } from "../../lib/prisma.js";
import { acquireProviderSlot } from "../../lib/provider-gate.js";
import { getObject, mediaKey, putObject } from "../../lib/storage.js";
import { loadMe } from "../auth/load-me.js";
import { getUserId, requireUser } from "../auth/require-user.js";
import { isDailyCapReached, isEmailAllowed, parseAllowedEmails } from "../generation/guard.js";
import { countRecentPhotoJobs } from "../generation/jobs.js";
import { getAiProvider } from "../generation/providers/index.js";
import { checkMomentChoice } from "../generation/rules.js";
import { mediaUrl, sortMoments, toMomentDto } from "./service.js";

function fail(reply: FastifyReply, status: number, error: string) {
  return reply.code(status).send({ error });
}

async function latestSourcePhoto(userId: string) {
  return prisma.mediaAsset.findFirst({
    where: { userId, kind: "SOURCE_PHOTO", deletedAt: null },
    orderBy: { createdAt: "desc" }
  });
}

async function loadUser(userId: string) {
  return prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { birthMonth: true, birthYear: true, locale: true }
  });
}

/** Allow-list and server-wide daily cap for real AI generation (see AI_ALLOWED_EMAILS / AI_DAILY_CAP). */
async function aiGuard(
  userId: string,
  options: { checkCap: boolean }
): Promise<{ status: 403 | 429; code: "AI_NOT_ALLOWED" | "AI_DAILY_CAP_REACHED" } | null> {
  const env = getEnv();
  const allowed = parseAllowedEmails(env.AI_ALLOWED_EMAILS);
  if (allowed.length > 0) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user || !isEmailAllowed(user.email, allowed)) return { status: 403, code: "AI_NOT_ALLOWED" };
  }
  if (options.checkCap && env.AI_DAILY_CAP > 0) {
    const generated = await prisma.generationJob.count({
      where: { type: "PHOTO", createdAt: { gt: new Date(Date.now() - GENERATION_WINDOW_MS) } }
    });
    if (isDailyCapReached(generated, env.AI_DAILY_CAP)) return { status: 429, code: "AI_DAILY_CAP_REACHED" };
  }
  return null;
}

export async function storyRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireUser);

  /** Everything the "Moja Smoki priča" screen needs. */
  app.get("/story", async (request): Promise<StoryResponse> => {
    const env = getEnv();
    const userId = getUserId(request);
    const [me, user, photo, moments] = await Promise.all([
      loadMe(userId),
      loadUser(userId),
      latestSourcePhoto(userId),
      prisma.moment.findMany({
        where: { userId },
        include: {
          scene: { include: { translations: true } },
          jobs: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, errorCode: true } }
        }
      })
    ]);

    const rows = await Promise.all(
      moments.map(async (moment) => ({
        ...moment,
        latestJob: moment.jobs[0] ?? null,
        recentJobs: await countRecentPhotoJobs(moment.id)
      }))
    );

    return {
      canCreate: me.readiness.canCreate,
      currentAge: getAge({ month: user.birthMonth, year: user.birthYear }),
      sourcePhoto: photo ? { id: photo.id, url: mediaUrl(env.API_URL, photo.id) } : null,
      moments: sortMoments(rows).map((row) =>
        toMomentDto(row, { apiUrl: env.API_URL, locale: user.locale, dailyLimit: env.GENERATIONS_PER_PERIOD_PER_DAY })
      ),
      limits: { generationsPerPeriodPerDay: env.GENERATIONS_PER_PERIOD_PER_DAY }
    };
  });

  /** Upload of the face photo: technical check, metadata removal, AI face check, private storage. */
  app.post("/photos", { config: { rateLimit: { max: 10, timeWindow: "10 minutes" } } }, async (request, reply) => {
    const env = getEnv();
    const userId = getUserId(request);
    if (!(await loadMe(userId)).readiness.canCreate) return fail(reply, 403, "NOT_READY");
    const guard = await aiGuard(userId, { checkCap: false });
    if (guard) return fail(reply, guard.status, guard.code);

    const file = await request.file();
    if (!file) return fail(reply, 400, "PHOTO_MISSING");

    let upload: Buffer;
    try {
      upload = await file.toBuffer();
    } catch (error) {
      if ((error as { code?: string }).code === "FST_REQ_FILE_TOO_LARGE") return fail(reply, 413, "PHOTO_TOO_LARGE");
      throw error;
    }

    let prepared: Awaited<ReturnType<typeof prepareSourcePhoto>>;
    try {
      prepared = await prepareSourcePhoto(upload, { minDimension: env.PHOTO_MIN_DIMENSION });
    } catch (error) {
      if (error instanceof PhotoRejectedError) return fail(reply, 422, error.code);
      throw error;
    }

    if (!(await acquireProviderSlot())) return fail(reply, 503, "FACE_CHECK_UNAVAILABLE");
    let faceCheck;
    try {
      faceCheck = await getAiProvider().checkFace(prepared.buffer, prepared.contentType);
    } catch (error) {
      request.log.error({ err: error }, "Face check failed");
      return fail(reply, 503, "FACE_CHECK_UNAVAILABLE");
    }
    if (!faceCheck.ok) return fail(reply, 422, faceCheck.reason);

    const storageKey = mediaKey(userId, "source", randomUUID(), "jpg");
    await putObject(storageKey, prepared.buffer, prepared.contentType);
    const asset = await prisma.mediaAsset.create({
      data: {
        userId,
        kind: "SOURCE_PHOTO",
        storageKey,
        contentType: prepared.contentType,
        byteSize: prepared.buffer.length,
        width: prepared.width,
        height: prepared.height
      }
    });

    return reply.code(201).send({ id: asset.id, url: mediaUrl(env.API_URL, asset.id) });
  });

  /** Creates the moment for a life period and queues its photo. */
  app.post("/moments", async (request, reply) => {
    const parsed = createMomentRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_BODY", issues: parsed.error.issues });

    const env = getEnv();
    const userId = getUserId(request);
    if (!(await loadMe(userId)).readiness.canCreate) return fail(reply, 403, "NOT_READY");
    const guard = await aiGuard(userId, { checkCap: true });
    if (guard) return fail(reply, guard.status, guard.code);

    const [user, photo, scene] = await Promise.all([
      loadUser(userId),
      latestSourcePhoto(userId),
      prisma.scene.findUnique({ where: { id: parsed.data.sceneId } })
    ]);
    if (!photo) return fail(reply, 409, "NO_SOURCE_PHOTO");

    const choiceError = checkMomentChoice({
      ...parsed.data,
      currentAge: getAge({ month: user.birthMonth, year: user.birthYear }),
      scene
    });
    if (choiceError) return fail(reply, 422, choiceError);

    try {
      const moment = await prisma.moment.create({
        data: {
          userId,
          period: parsed.data.period,
          targetAge: parsed.data.targetAge,
          sceneId: parsed.data.sceneId,
          sourcePhotoId: photo.id,
          status: "PHOTO_PENDING",
          jobs: {
            create: { userId, type: "PHOTO", inputAssetId: photo.id, maxAttempts: env.GENERATION_MAX_ATTEMPTS }
          }
        }
      });
      return reply.code(201).send({ id: moment.id });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return fail(reply, 409, "MOMENT_EXISTS");
      }
      throw error;
    }
  });

  /** New photo for an existing moment (optionally another age or scene), within the daily limit. */
  app.post<{ Params: { id: string } }>("/moments/:id/regenerate", async (request, reply) => {
    const parsed = regenerateMomentRequestSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_BODY", issues: parsed.error.issues });

    const env = getEnv();
    const userId = getUserId(request);
    if (!(await loadMe(userId)).readiness.canCreate) return fail(reply, 403, "NOT_READY");

    const moment = await prisma.moment.findFirst({
      where: { id: request.params.id, userId },
      include: { jobs: { orderBy: { createdAt: "desc" }, take: 1 } }
    });
    if (!moment) return fail(reply, 404, "NOT_FOUND");

    const latest = moment.jobs[0];
    if (latest && (latest.status === "QUEUED" || latest.status === "IN_PROGRESS")) {
      return fail(reply, 409, "GENERATION_IN_PROGRESS");
    }
    if ((await countRecentPhotoJobs(moment.id)) >= env.GENERATIONS_PER_PERIOD_PER_DAY) {
      return fail(reply, 429, "DAILY_LIMIT_REACHED");
    }
    const guard = await aiGuard(userId, { checkCap: true });
    if (guard) return fail(reply, guard.status, guard.code);

    const targetAge = parsed.data.targetAge ?? moment.targetAge;
    const sceneId = parsed.data.sceneId ?? moment.sceneId;
    const [user, photo, scene] = await Promise.all([
      loadUser(userId),
      latestSourcePhoto(userId),
      prisma.scene.findUnique({ where: { id: sceneId } })
    ]);
    if (!photo) return fail(reply, 409, "NO_SOURCE_PHOTO");

    const choiceError = checkMomentChoice({
      period: moment.period,
      targetAge,
      currentAge: getAge({ month: user.birthMonth, year: user.birthYear }),
      scene
    });
    if (choiceError) return fail(reply, 422, choiceError);

    await prisma.moment.update({
      where: { id: moment.id },
      data: {
        targetAge,
        sceneId,
        sourcePhotoId: photo.id,
        status: "PHOTO_PENDING",
        jobs: {
          create: { userId, type: "PHOTO", inputAssetId: photo.id, maxAttempts: env.GENERATION_MAX_ATTEMPTS }
        }
      }
    });
    return reply.code(202).send({ id: moment.id });
  });

  /** Streams a stored file to its owner only. */
  app.get<{ Params: { id: string } }>("/media/:id", async (request, reply) => {
    const asset = await prisma.mediaAsset.findFirst({
      where: { id: request.params.id, userId: getUserId(request), deletedAt: null }
    });
    if (!asset) return fail(reply, 404, "NOT_FOUND");

    const body = await getObject(asset.storageKey);
    return reply
      .header("cache-control", "private, max-age=300")
      .header("x-content-type-options", "nosniff")
      .type(asset.contentType)
      .send(body);
  });
}
