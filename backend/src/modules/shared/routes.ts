import {
  chooseSharedYearsOffset,
  createSharedMomentRequestSchema,
  fitsSharedPhotoAge,
  getAge,
  GENERATION_WINDOW_MS,
  INVITES_PER_DAY,
  inviteFriendRequestSchema,
  isSharedMomentUnlocked,
  MAX_SHARED_FRIENDS,
  SHARED_GENERATIONS_PER_DAY,
  tokenRequestSchema,
  type AppLocale,
  type InvitePreview
} from "@sffl/shared";
import { Prisma } from "@prisma/client";
import type { FastifyBaseLogger, FastifyInstance, FastifyReply } from "fastify";

import { getEnv } from "../../config/env.js";
import { generateToken, hashToken } from "../../lib/crypto.js";
import { sendMail } from "../../lib/mailer.js";
import { prisma } from "../../lib/prisma.js";
import { deleteObjects } from "../../lib/storage.js";
import { loadMe } from "../auth/load-me.js";
import { getUserId, requireUser } from "../auth/require-user.js";
import { aiGuard } from "../generation/ai-guard.js";
import {
  afterMemberLeft,
  countManualSharedJobs,
  countPeriodsWithPhoto,
  enqueueSharedPhoto,
  latestSourcePhoto,
  loadMembers,
  loadSharingPerson
} from "./data.js";
import { inviteAcceptedMessage, sharedInviteMessage } from "./emails.js";
import { displayName, fitsGroup, isOpenInvite, sceneTitle, slotsLeft } from "./service.js";

function fail(reply: FastifyReply, status: number, error: string) {
  reply.log.info({ status, code: error }, "Shared moment request rejected");
  return reply.code(status).send({ error });
}

const strictRateLimit = { rateLimit: { max: 10, timeWindow: "1 minute" } };

const inviteInclude = {
  sharedMoment: {
    include: {
      owner: { select: { id: true, username: true, email: true, locale: true, deletedAt: true } },
      scene: { include: { translations: true } },
      participants: { select: { userId: true } }
    }
  }
} satisfies Prisma.SharedInviteInclude;

type InviteWithMoment = Prisma.SharedInviteGetPayload<{ include: typeof inviteInclude }>;

type AcceptResult = { status: number; error: string } | { status: 200; sharedMomentId: string };

/** Joins the friend to the photo and queues a new photo with everyone who accepted. */
async function acceptInvite(invite: InviteWithMoment, userId: string, log: FastifyBaseLogger): Promise<AcceptResult> {
  const moment = invite.sharedMoment;
  if (invite.inviteeUserId && invite.inviteeUserId !== userId) return { status: 404, error: "INVITE_NOT_FOUND" };
  if (moment.owner.deletedAt) return { status: 409, error: "INVITE_CLOSED" };
  if (invite.status !== "PENDING") return { status: 409, error: "INVITE_CLOSED" };
  if (invite.expiresAt <= new Date()) {
    await prisma.sharedInvite.update({ where: { id: invite.id }, data: { status: "EXPIRED", email: null } });
    return { status: 410, error: "INVITE_EXPIRED" };
  }
  if (moment.ownerId === userId) return { status: 422, error: "INVITE_SELF" };
  if (moment.participants.some((participant) => participant.userId === userId)) {
    return { status: 409, error: "ALREADY_PARTICIPANT" };
  }
  if (moment.participants.length >= MAX_SHARED_FRIENDS) return { status: 409, error: "FRIEND_LIMIT_REACHED" };

  if (!(await loadMe(userId)).readiness.canCreate) return { status: 403, error: "INVITE_NEEDS_READY" };
  if (!(await latestSourcePhoto(userId))) return { status: 409, error: "INVITE_NEEDS_PHOTO" };
  const guard = await aiGuard(userId, { checkCap: true });
  if (guard) return { status: guard.status, error: guard.code };

  const candidate = await loadSharingPerson(userId);
  // The friend cannot fix these; the owner sees the reason next to the invite.
  const ageProblem = !fitsGroup(candidate, await loadMembers(moment.id))
    ? "INVITE_AGE_RULE"
    : !fitsSharedPhotoAge(candidate.age, moment.yearsOffset, moment.scene)
      ? "INVITE_PERIOD_AGE"
      : null;
  if (ageProblem) {
    await prisma.sharedInvite.update({ where: { id: invite.id }, data: { problem: ageProblem } });
    return { status: 422, error: ageProblem };
  }

  const accepted = await prisma.$transaction(async (tx) => {
    // Only one acceptance per invite, even if the link is opened twice at the same time.
    const claimed = await tx.sharedInvite.updateMany({
      where: { id: invite.id, status: "PENDING" },
      data: { status: "ACCEPTED", respondedAt: new Date(), email: null, inviteeUserId: userId }
    });
    if (claimed.count === 0) return false;
    await tx.sharedParticipant.create({ data: { sharedMomentId: moment.id, userId } });
    await enqueueSharedPhoto(tx, moment, { manual: false });
    return true;
  });
  if (!accepted) return { status: 409, error: "INVITE_CLOSED" };

  const friend = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { username: true, email: true } });
  await sendMail(
    inviteAcceptedMessage(moment.owner.locale, moment.owner.email, `${getEnv().APP_URL}/story`, displayName(friend)),
    log
  );
  return { status: 200, sharedMomentId: moment.id };
}

async function closeInvite(inviteId: string, status: "DECLINED" | "CANCELED") {
  await prisma.sharedInvite.updateMany({
    where: { id: inviteId, status: "PENDING" },
    data: { status, respondedAt: new Date(), email: null }
  });
}

/** Invites addressed to this user (by account or by email). */
function isAddressedTo(invite: { inviteeUserId: string | null; email: string | null }, user: { id: string; email: string }) {
  return invite.inviteeUserId === user.id || (invite.email !== null && invite.email === user.email);
}

/** Public: what the invite link shows before signing in (token in the body, never in the URL log). */
async function publicInviteRoutes(app: FastifyInstance) {
  app.post("/shared/invite/lookup", { config: strictRateLimit }, async (request, reply) => {
    const parsed = tokenRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_BODY", issues: parsed.error.issues });

    const invite = await prisma.sharedInvite.findUnique({
      where: { tokenHash: hashToken(parsed.data.token) },
      include: inviteInclude
    });
    if (!invite || invite.sharedMoment.owner.deletedAt) return fail(reply, 404, "INVITE_NOT_FOUND");

    const expired = invite.status === "PENDING" && invite.expiresAt <= new Date();
    const preview: InvitePreview = {
      from: displayName(invite.sharedMoment.owner),
      sceneTitle: sceneTitle(invite.sharedMoment.scene, invite.sharedMoment.owner.locale),
      period: invite.sharedMoment.period,
      yearsOffset: invite.sharedMoment.yearsOffset,
      status: expired ? "EXPIRED" : invite.status,
      expiresAt: invite.expiresAt.toISOString()
    };
    return reply.send(preview);
  });
}

async function memberRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireUser);

  /** Starts the user's shared moment (one per user) once all three life periods have a photo. */
  app.post("/shared", async (request, reply) => {
    const parsed = createSharedMomentRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_BODY", issues: parsed.error.issues });

    const userId = getUserId(request);
    if (!(await loadMe(userId)).readiness.canCreate) return fail(reply, 403, "NOT_READY");
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { username: true, birthMonth: true, birthYear: true }
    });
    if (!user.username) return fail(reply, 409, "USERNAME_REQUIRED");
    if (!isSharedMomentUnlocked(await countPeriodsWithPhoto(userId))) return fail(reply, 403, "SHARED_LOCKED");
    const guard = await aiGuard(userId, { checkCap: false });
    if (guard) return fail(reply, guard.status, guard.code);

    const scene = await prisma.scene.findUnique({ where: { id: parsed.data.sceneId } });
    const age = getAge({ month: user.birthMonth, year: user.birthYear });
    const { period } = parsed.data;
    const yearsOffset = scene?.isActive ? chooseSharedYearsOffset(period, age, scene) : null;
    if (!scene || yearsOffset === null) return fail(reply, 422, "SCENE_NOT_AVAILABLE");

    try {
      const moment = await prisma.sharedMoment.create({
        data: { ownerId: userId, sceneId: scene.id, period, yearsOffset }
      });
      return reply.code(201).send({ id: moment.id });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return fail(reply, 409, "SHARED_EXISTS");
      }
      throw error;
    }
  });

  /** Deletes the user's own shared moment with its photo and invites (e.g. to start over with another scene). */
  app.delete("/shared", async (request, reply) => {
    const userId = getUserId(request);
    const moment = await prisma.sharedMoment.findUnique({ where: { ownerId: userId }, include: { photoAsset: true } });
    if (!moment) return fail(reply, 404, "SHARED_NOT_FOUND");

    await prisma.$transaction(async (tx) => {
      await tx.generationJob.updateMany({
        where: { sharedMomentId: moment.id, status: "QUEUED" },
        data: { status: "CANCELED", finishedAt: new Date(), errorCode: "SHARED_DELETED" }
      });
      await tx.sharedMoment.delete({ where: { id: moment.id } });
      if (moment.photoAsset) await tx.mediaAsset.delete({ where: { id: moment.photoAsset.id } });
    });
    if (moment.photoAsset) await deleteObjects([moment.photoAsset.storageKey]).catch(() => undefined);
    return reply.code(204).send();
  });

  /** Invites a friend by email or username; the link is sent by email in both cases. */
  app.post("/shared/invites", { config: { rateLimit: { max: 20, timeWindow: "10 minutes" } } }, async (request, reply) => {
    const parsed = inviteFriendRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_BODY", issues: parsed.error.issues });

    const env = getEnv();
    const userId = getUserId(request);
    const now = new Date();
    const moment = await prisma.sharedMoment.findUnique({
      where: { ownerId: userId },
      include: {
        owner: { select: { username: true, email: true } },
        scene: { include: { translations: true } },
        participants: { select: { userId: true } },
        invites: true
      }
    });
    if (!moment) return fail(reply, 404, "SHARED_NOT_FOUND");

    const recent = moment.invites.filter((invite) => invite.createdAt.getTime() > now.getTime() - GENERATION_WINDOW_MS);
    if (recent.length >= INVITES_PER_DAY) return fail(reply, 429, "INVITE_LIMIT_REACHED");
    const open = moment.invites.filter((invite) => isOpenInvite(invite, now));
    if (slotsLeft(moment.participants.length, open.length) === 0) return fail(reply, 409, "FRIEND_LIMIT_REACHED");

    let invitee: { id: string; email: string; locale: AppLocale } | null = null;
    let toEmail: string;
    if ("username" in parsed.data) {
      const found = await prisma.user.findFirst({
        where: { username: parsed.data.username, deletedAt: null },
        select: { id: true, email: true, locale: true }
      });
      if (!found) return fail(reply, 404, "USER_NOT_FOUND");
      if (found.id === userId) return fail(reply, 422, "INVITE_SELF");
      if (moment.participants.some((participant) => participant.userId === found.id)) {
        return fail(reply, 409, "ALREADY_PARTICIPANT");
      }
      if (open.some((invite) => invite.inviteeUserId === found.id)) return fail(reply, 409, "ALREADY_INVITED");
      // The age rule is checked now for usernames; for an email it is checked when the invite is accepted,
      // so an invite never reveals whether an address has an account.
      const candidate = await loadSharingPerson(found.id);
      if (!fitsGroup(candidate, await loadMembers(moment.id))) return fail(reply, 422, "INVITE_AGE_RULE");
      if (!fitsSharedPhotoAge(candidate.age, moment.yearsOffset, moment.scene)) {
        return fail(reply, 422, "INVITE_PERIOD_AGE");
      }
      invitee = found;
      toEmail = found.email;
    } else {
      toEmail = parsed.data.email;
      if (toEmail === moment.owner.email) return fail(reply, 422, "INVITE_SELF");
      if (open.some((invite) => invite.email === toEmail)) return fail(reply, 409, "ALREADY_INVITED");
    }

    const token = generateToken();
    const invite = await prisma.sharedInvite.create({
      data: {
        sharedMomentId: moment.id,
        channel: invitee ? "USERNAME" : "EMAIL",
        email: invitee ? null : toEmail,
        inviteeUserId: invitee?.id ?? null,
        tokenHash: hashToken(token),
        expiresAt: new Date(now.getTime() + env.INVITE_TTL_HOURS * 60 * 60 * 1000)
      }
    });

    const locale = invitee?.locale ?? "sr";
    await sendMail(
      sharedInviteMessage(locale, toEmail, `${env.APP_URL}/invite?token=${encodeURIComponent(token)}`, {
        from: displayName(moment.owner),
        scene: sceneTitle(moment.scene, locale),
        hours: env.INVITE_TTL_HOURS,
        period: moment.period,
        yearsOffset: moment.yearsOffset
      }),
      request.log
    );
    return reply.code(201).send({ id: invite.id });
  });

  /** The owner withdraws an invite that was not answered yet. */
  app.delete<{ Params: { id: string } }>("/shared/invites/:id", async (request, reply) => {
    const invite = await prisma.sharedInvite.findFirst({
      where: { id: request.params.id, sharedMoment: { ownerId: getUserId(request) } }
    });
    if (!invite) return fail(reply, 404, "INVITE_NOT_FOUND");
    await closeInvite(invite.id, "CANCELED");
    return reply.code(204).send();
  });

  /** Accept or decline an invite shown in the app (addressed to this account or its email). */
  app.post<{ Params: { id: string; action: string } }>("/shared/invites/:id/:action", async (request, reply) => {
    const { action } = request.params;
    if (action !== "accept" && action !== "decline") return fail(reply, 404, "NOT_FOUND");
    const userId = getUserId(request);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, email: true } });
    const invite = await prisma.sharedInvite.findUnique({ where: { id: request.params.id }, include: inviteInclude });
    if (!invite || !isAddressedTo(invite, user)) return fail(reply, 404, "INVITE_NOT_FOUND");

    if (action === "decline") {
      await closeInvite(invite.id, "DECLINED");
      return reply.code(204).send();
    }
    const result = await acceptInvite(invite, userId, request.log);
    if ("error" in result) return fail(reply, result.status, result.error);
    return reply.send({ sharedMomentId: result.sharedMomentId });
  });

  /** Accept or decline from the invite link (the token is the proof; signing in is required). */
  app.post<{ Params: { action: string } }>("/shared/invite/:action", { config: strictRateLimit }, async (request, reply) => {
    const { action } = request.params;
    if (action !== "accept" && action !== "decline") return fail(reply, 404, "NOT_FOUND");
    const parsed = tokenRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_BODY", issues: parsed.error.issues });

    const userId = getUserId(request);
    const invite = await prisma.sharedInvite.findUnique({
      where: { tokenHash: hashToken(parsed.data.token) },
      include: inviteInclude
    });
    if (!invite || (invite.inviteeUserId && invite.inviteeUserId !== userId)) return fail(reply, 404, "INVITE_NOT_FOUND");

    if (action === "decline") {
      await closeInvite(invite.id, "DECLINED");
      return reply.code(204).send();
    }
    const result = await acceptInvite(invite, userId, request.log);
    if ("error" in result) return fail(reply, result.status, result.error);
    return reply.send({ sharedMomentId: result.sharedMomentId });
  });

  /** A friend leaves someone's shared photo; the photo with their face is removed and made again without them. */
  app.post<{ Params: { id: string } }>("/shared/:id/leave", async (request, reply) => {
    const userId = getUserId(request);
    const sharedMomentId = request.params.id;
    const membership = await prisma.sharedParticipant.findUnique({
      where: { sharedMomentId_userId: { sharedMomentId, userId } }
    });
    if (!membership) return fail(reply, 404, "SHARED_NOT_FOUND");

    const keys = await prisma.$transaction(async (tx) => {
      await tx.sharedParticipant.delete({ where: { id: membership.id } });
      return afterMemberLeft(tx, sharedMomentId);
    });
    await deleteObjects(keys).catch(() => undefined);
    return reply.code(204).send();
  });

  /** The owner asks for a new photo with the same people (daily limit; acceptances regenerate for free). */
  app.post("/shared/regenerate", async (request, reply) => {
    const userId = getUserId(request);
    if (!(await loadMe(userId)).readiness.canCreate) return fail(reply, 403, "NOT_READY");
    const moment = await prisma.sharedMoment.findUnique({
      where: { ownerId: userId },
      include: {
        participants: { select: { id: true } },
        jobs: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } }
      }
    });
    if (!moment) return fail(reply, 404, "SHARED_NOT_FOUND");
    if (moment.participants.length === 0) return fail(reply, 409, "SHARED_NEEDS_FRIEND");
    const latest = moment.jobs[0];
    if (latest && (latest.status === "QUEUED" || latest.status === "IN_PROGRESS")) {
      return fail(reply, 409, "GENERATION_IN_PROGRESS");
    }
    if ((await countManualSharedJobs(moment.id)) >= SHARED_GENERATIONS_PER_DAY) {
      return fail(reply, 429, "DAILY_LIMIT_REACHED");
    }
    const guard = await aiGuard(userId, { checkCap: true });
    if (guard) return fail(reply, guard.status, guard.code);

    await prisma.$transaction((tx) => enqueueSharedPhoto(tx, moment, { manual: true }));
    return reply.code(202).send({ id: moment.id });
  });
}

export async function sharedRoutes(app: FastifyInstance) {
  await app.register(publicInviteRoutes);
  await app.register(memberRoutes);
}
