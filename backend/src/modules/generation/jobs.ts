import { randomUUID } from "node:crypto";

import { getAge, GENERATION_WINDOW_MS, sceneCatalog } from "@sffl/shared";

import { getEnv } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { toDeliveryImage } from "../../lib/images.js";
import { deleteObjects, getObject, mediaKey, putObject } from "../../lib/storage.js";
import { leaveAllSharedMoments } from "../shared/data.js";
import { getProductReference } from "./product-reference.js";
import { ensureAgedPortrait, ensureFaceTraits, needsAnotherCandidate } from "./past-moment.js";
import { buildPhotoPrompt } from "./prompt.js";
import { ProviderError, type AiProvider } from "./providers/index.js";
import { nextRetryDelay } from "./retry.js";
import { processSharedPhotoJob } from "./shared-photo.js";

type Logger = { info: (obj: object, msg?: string) => void; error: (obj: object, msg?: string) => void };

/** Photo jobs started for a moment in the rolling 24-hour window (the daily limit). */
export async function countRecentPhotoJobs(momentId: string, now = new Date()): Promise<number> {
  return prisma.generationJob.count({
    where: { momentId, type: "PHOTO", createdAt: { gt: new Date(now.getTime() - GENERATION_WINDOW_MS) } }
  });
}

/** Atomically claims the next due job (FOR UPDATE SKIP LOCKED keeps workers from taking the same job). */
export async function claimNextJob(workerId: string): Promise<string | null> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    UPDATE "GenerationJob"
    SET "status" = 'IN_PROGRESS'::"GenerationJobStatus",
        "lockedBy" = ${workerId},
        "lockedAt" = NOW(),
        "startedAt" = COALESCE("startedAt", NOW()),
        "attempts" = "attempts" + 1
    WHERE "id" = (
      SELECT "id" FROM "GenerationJob"
      WHERE "status" = 'QUEUED'::"GenerationJobStatus" AND "runAfter" <= NOW()
      ORDER BY "runAfter" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING "id"`;
  return rows[0]?.id ?? null;
}

/** Puts jobs from crashed or stuck workers back in the queue. */
export async function requeueStaleJobs(): Promise<number> {
  const cutoff = new Date(Date.now() - getEnv().JOB_STALE_MINUTES * 60 * 1000);
  const result = await prisma.generationJob.updateMany({
    where: { status: "IN_PROGRESS", lockedAt: { lt: cutoff } },
    data: { status: "QUEUED", lockedBy: null, lockedAt: null, runAfter: new Date() }
  });
  return result.count;
}

function scenePromptFor(sceneId: string, stored: string | null): string {
  return stored ?? sceneCatalog.find((scene) => scene.id === sceneId)?.prompt ?? sceneId;
}

function productPlacementFor(sceneId: string): string | undefined {
  return sceneCatalog.find((scene) => scene.id === sceneId)?.productPlacement;
}

/** Runs a claimed job with the handler for its type. */
export async function processJob(jobId: string, provider: AiProvider, logger: Logger): Promise<void> {
  const { type } = await prisma.generationJob.findUniqueOrThrow({ where: { id: jobId }, select: { type: true } });
  if (type === "SHARED_PHOTO") return processSharedPhotoJob(jobId, provider, logger);
  if (type === "PHOTO") return processPhotoJob(jobId, provider, logger);
  await prisma.generationJob.update({
    where: { id: jobId },
    data: { status: "CANCELED", finishedAt: new Date(), lockedBy: null, errorCode: "UNSUPPORTED_JOB" }
  });
}

export async function processPhotoJob(jobId: string, provider: AiProvider, logger: Logger): Promise<void> {
  const job = await prisma.generationJob.findUniqueOrThrow({
    where: { id: jobId },
    include: {
      inputAsset: true,
      moment: {
        include: {
          scene: { include: { translations: { where: { locale: "sr" } } } },
          user: { select: { birthMonth: true, birthYear: true, deletedAt: true } }
        }
      }
    }
  });

  const moment = job.moment;
  if (!moment || !job.inputAsset || moment.user.deletedAt) {
    await prisma.generationJob.update({
      where: { id: job.id },
      data: { status: "CANCELED", finishedAt: new Date(), lockedBy: null, errorCode: "INVALID_JOB" }
    });
    return;
  }

  try {
    const source = await getObject(job.inputAsset.storageKey);
    const sourceImage = { data: source, mimeType: job.inputAsset.contentType };
    const productImage = await getProductReference(getEnv().PRODUCT_REFERENCE_IMAGE);
    const currentAge = getAge({ month: moment.user.birthMonth, year: moment.user.birthYear });
    const sceneTitle = moment.scene.translations[0]?.title ?? moment.sceneId;
    const promptBase = {
      scenePrompt: scenePromptFor(moment.sceneId, moment.scene.aiPrompt),
      territory: moment.scene.territory,
      period: moment.period,
      targetAge: moment.targetAge,
      currentAge,
      productReference: Boolean(productImage),
      productPlacement: productPlacementFor(moment.sceneId)
    };
    const label = { sceneTitle, targetAge: moment.targetAge, period: moment.period };

    let result: Awaited<ReturnType<AiProvider["generatePhoto"]>>;
    if (moment.period === "YESTERDAY") {
      // Two steps (chosen in the likeness experiment, variant E): a portrait at the target age is the exact face,
      // today's photo only confirms identity details. The portrait is reused for every scene of that age.
      const traits = await ensureFaceTraits(provider, job.inputAsset, sourceImage);
      const portrait = await ensureAgedPortrait({
        provider,
        model: provider.name === "mock" ? "mock" : getEnv().GEMINI_IMAGE_MODEL,
        source: job.inputAsset,
        image: sourceImage,
        targetAge: moment.targetAge,
        currentAge,
        traits
      });
      const generateScene = () =>
        provider.generatePhoto({
          sourceImage: portrait.data,
          sourceMimeType: portrait.mimeType,
          personReferences: [sourceImage],
          productImage,
          prompt: buildPhotoPrompt({
            ...promptBase,
            identityTraits: traits || undefined,
            closeFraming: true,
            agedPortraitReference: true,
            portraitPrimary: true,
            calmExpression: true
          }),
          label
        });
      const scoreScene = (image: { image: Buffer; mimeType: string }) =>
        provider
          .rateLikeness({
            reference: portrait,
            generated: { data: image.image, mimeType: image.mimeType },
            targetAge: moment.targetAge,
            currentAge: moment.targetAge
          })
          .catch(() => null);

      result = await generateScene();
      const score = await scoreScene(result);
      if (needsAnotherCandidate(score)) {
        logger.info({ jobId: job.id, score }, "Past moment far from the portrait, generating another candidate");
        const second = await generateScene().catch(() => null);
        const secondScore = second ? await scoreScene(second) : null;
        if (second && (secondScore ?? 0) > (score ?? 0)) result = second;
      }
    } else {
      result = await provider.generatePhoto({
        sourceImage: source,
        sourceMimeType: job.inputAsset.contentType,
        prompt: buildPhotoPrompt(promptBase),
        productImage,
        label
      });
    }

    const image = await toDeliveryImage(result.image);
    const storageKey = mediaKey(job.userId, "photo", randomUUID(), image.extension);
    await putObject(storageKey, image.buffer, image.contentType);

    const previousPhotoId = moment.photoAssetId;
    await prisma.$transaction(async (tx) => {
      const asset = await tx.mediaAsset.create({
        data: {
          userId: job.userId,
          kind: "GENERATED_PHOTO",
          storageKey,
          contentType: image.contentType,
          byteSize: image.buffer.length,
          width: image.width,
          height: image.height
        }
      });
      await tx.moment.update({ where: { id: moment.id }, data: { photoAssetId: asset.id, status: "PHOTO_READY" } });
      await tx.generationJob.update({
        where: { id: job.id },
        data: {
          status: "SUCCEEDED",
          outputAssetId: asset.id,
          provider: provider.name,
          costMicroUsd: result.costMicroUsd,
          finishedAt: new Date(),
          lockedBy: null,
          errorCode: null,
          errorMessage: null
        }
      });
    });

    // A regenerated photo replaces the previous one; remove the old file.
    if (previousPhotoId) {
      const previous = await prisma.mediaAsset.delete({ where: { id: previousPhotoId } }).catch(() => null);
      if (previous) await deleteObjects([previous.storageKey]).catch(() => undefined);
    }

    logger.info({ jobId: job.id, momentId: moment.id, provider: provider.name }, "Photo generated");
  } catch (error) {
    const retryable = error instanceof ProviderError ? error.retryable : true;
    const code = error instanceof ProviderError ? error.code : "INTERNAL_ERROR";
    const message = error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500);
    logger.error({ jobId: job.id, code, attempt: job.attempts, err: error }, "Photo generation failed");

    if (retryable && job.attempts < job.maxAttempts) {
      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: "QUEUED",
          runAfter: new Date(Date.now() + nextRetryDelay(error, job.attempts)),
          lockedBy: null,
          lockedAt: null,
          errorCode: code,
          errorMessage: message
        }
      });
      return;
    }

    await prisma.$transaction([
      prisma.generationJob.update({
        where: { id: job.id },
        data: { status: "FAILED", finishedAt: new Date(), lockedBy: null, errorCode: code, errorMessage: message }
      }),
      prisma.moment.update({
        where: { id: moment.id },
        data: { status: moment.photoAssetId ? "PHOTO_READY" : "FAILED" }
      })
    ]);
  }
}

/** Removes files and all rows of accounts the users deleted. */
export async function purgeDeletedAccounts(logger: Logger, batchSize = 20): Promise<number> {
  const users = await prisma.user.findMany({
    where: { deletedAt: { not: null } },
    select: { id: true, mediaAssets: { select: { storageKey: true } } },
    take: batchSize
  });

  for (const user of users) {
    // Shared photos of other people that show this user are removed and made again without them.
    await leaveAllSharedMoments(user.id, logger);
    await deleteObjects(user.mediaAssets.map((asset) => asset.storageKey));
    await prisma.$transaction([
      prisma.generationJob.deleteMany({ where: { userId: user.id } }),
      prisma.sharedMoment.deleteMany({ where: { ownerId: user.id } }),
      prisma.shareLink.deleteMany({ where: { userId: user.id } }),
      prisma.finalFilm.deleteMany({ where: { userId: user.id } }),
      prisma.moment.deleteMany({ where: { userId: user.id } }),
      prisma.agedPortrait.deleteMany({ where: { userId: user.id } }),
      prisma.mediaAsset.deleteMany({ where: { userId: user.id } }),
      prisma.user.delete({ where: { id: user.id } })
    ]);
    logger.info({ files: user.mediaAssets.length }, "Deleted account purged");
  }
  return users.length;
}
