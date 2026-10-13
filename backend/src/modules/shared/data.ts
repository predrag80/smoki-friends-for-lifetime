import {
  GENERATION_WINDOW_MS,
  getAge,
  isSharedMomentUnlocked,
  type AppLocale,
  type SharedSection,
  type SharingPerson
} from "@sffl/shared";
import type { Prisma } from "@prisma/client";

import { getEnv } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { deleteObjects } from "../../lib/storage.js";
import { displayName, isOpenInvite, sceneTitle, toSharedMomentDto, type SharedRow } from "./service.js";

type Tx = Prisma.TransactionClient;
type Logger = { info: (obj: object, msg?: string) => void; error: (obj: object, msg?: string) => void };

const person = { select: { id: true, username: true, email: true } } as const;

export const sharedInclude = {
  scene: { include: { translations: true } },
  owner: person,
  participants: { orderBy: { joinedAt: "asc" }, include: { user: person } },
  invites: { orderBy: { createdAt: "asc" }, include: { invitee: { select: { username: true } } } },
  jobs: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, errorCode: true } }
} satisfies Prisma.SharedMomentInclude;

type SharedWithIncludes = Prisma.SharedMomentGetPayload<{ include: typeof sharedInclude }>;

/** Photos the owner asked for in the rolling 24-hour window (automatic photos after an acceptance are free). */
export async function countManualSharedJobs(sharedMomentId: string, now = new Date()): Promise<number> {
  return prisma.generationJob.count({
    where: {
      sharedMomentId,
      type: "SHARED_PHOTO",
      manual: true,
      createdAt: { gt: new Date(now.getTime() - GENERATION_WINDOW_MS) }
    }
  });
}

export async function toRow(moment: SharedWithIncludes): Promise<SharedRow> {
  return {
    ...moment,
    invites: moment.invites,
    latestJob: moment.jobs[0] ?? null,
    manualJobs: await countManualSharedJobs(moment.id)
  };
}

export async function latestSourcePhoto(userId: string) {
  return prisma.mediaAsset.findFirst({
    where: { userId, kind: "SOURCE_PHOTO", deletedAt: null },
    orderBy: { createdAt: "desc" }
  });
}

/** Number of life periods (Juče, Danas, Jednog dana) that already have a photo. */
export async function countPeriodsWithPhoto(userId: string): Promise<number> {
  return prisma.moment.count({ where: { userId, photoAssetId: { not: null } } });
}

/** Age, email and confirmed guardian email: what the adults/minors rule needs. */
export async function loadSharingPerson(userId: string): Promise<SharingPerson & { id: string }> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, email: true, birthMonth: true, birthYear: true, guardianConsent: true }
  });
  const consent = user.guardianConsent;
  return {
    id: user.id,
    age: getAge({ month: user.birthMonth, year: user.birthYear }),
    email: user.email,
    confirmedGuardianEmail: consent?.confirmedAt ? consent.guardianEmail.trim().toLowerCase() : null
  };
}

/** Owner and friends who joined (accounts not deleted). */
export async function loadMembers(sharedMomentId: string): Promise<(SharingPerson & { id: string })[]> {
  const moment = await prisma.sharedMoment.findUniqueOrThrow({
    where: { id: sharedMomentId },
    select: { ownerId: true, participants: { select: { userId: true, user: { select: { deletedAt: true } } } } }
  });
  const ids = [moment.ownerId, ...moment.participants.filter((p) => !p.user.deletedAt).map((p) => p.userId)];
  return Promise.all(ids.map((id) => loadSharingPerson(id)));
}

/** Everything the shared section of GET /story needs. */
export async function loadSharedSection(
  userId: string,
  viewer: { email: string; username: string | null; locale: AppLocale }
): Promise<SharedSection> {
  const env = getEnv();
  const now = new Date();
  const [periods, mine, joined, incoming] = await Promise.all([
    countPeriodsWithPhoto(userId),
    prisma.sharedMoment.findUnique({ where: { ownerId: userId }, include: sharedInclude }),
    prisma.sharedMoment.findMany({
      where: { participants: { some: { userId } }, owner: { deletedAt: null } },
      include: sharedInclude,
      orderBy: { createdAt: "asc" }
    }),
    prisma.sharedInvite.findMany({
      where: {
        status: "PENDING",
        expiresAt: { gt: now },
        OR: [{ inviteeUserId: userId }, { email: viewer.email }],
        sharedMoment: { ownerId: { not: userId }, owner: { deletedAt: null }, participants: { none: { userId } } }
      },
      include: { sharedMoment: { include: { owner: person, scene: { include: { translations: true } } } } },
      orderBy: { createdAt: "desc" }
    })
  ]);

  const dto = async (moment: SharedWithIncludes) =>
    toSharedMomentDto(await toRow(moment), { viewerId: userId, apiUrl: env.API_URL, locale: viewer.locale, now });

  return {
    unlocked: isSharedMomentUnlocked(periods),
    username: viewer.username,
    mine: mine ? await dto(mine) : null,
    joined: await Promise.all(joined.map(dto)),
    incoming: incoming
      .filter((invite) => isOpenInvite(invite, now))
      .map((invite) => ({
        id: invite.id,
        from: displayName(invite.sharedMoment.owner),
        sceneTitle: sceneTitle(invite.sharedMoment.scene, viewer.locale),
        expiresAt: invite.expiresAt.toISOString()
      }))
  };
}

/** Queues a new shared photo unless one is already waiting in the queue. */
export async function enqueueSharedPhoto(
  tx: Tx,
  moment: { id: string; ownerId: string },
  options: { manual: boolean }
): Promise<void> {
  const queued = await tx.generationJob.findFirst({
    where: { sharedMomentId: moment.id, status: "QUEUED" },
    select: { id: true }
  });
  if (!queued) {
    await tx.generationJob.create({
      data: {
        userId: moment.ownerId,
        type: "SHARED_PHOTO",
        sharedMomentId: moment.id,
        manual: options.manual,
        maxAttempts: getEnv().GENERATION_MAX_ATTEMPTS
      }
    });
  }
  await tx.sharedMoment.update({ where: { id: moment.id }, data: { status: "PHOTO_PENDING" } });
}

/**
 * After someone leaves: the photo with their face is removed, and a new one is made with the people who stay
 * (or the moment waits for friends again). Returns storage keys to delete once the transaction is done.
 */
export async function afterMemberLeft(tx: Tx, sharedMomentId: string): Promise<string[]> {
  const moment = await tx.sharedMoment.findUnique({
    where: { id: sharedMomentId },
    include: { photoAsset: true, participants: { select: { user: { select: { deletedAt: true } } } } }
  });
  if (!moment) return [];
  const keys: string[] = [];
  if (moment.photoAsset) {
    await tx.sharedMoment.update({ where: { id: moment.id }, data: { photoAssetId: null } });
    await tx.mediaAsset.delete({ where: { id: moment.photoAsset.id } });
    keys.push(moment.photoAsset.storageKey);
  }
  const friends = moment.participants.filter((p) => !p.user.deletedAt).length;
  if (friends > 0) {
    await enqueueSharedPhoto(tx, moment, { manual: false });
  } else {
    await tx.generationJob.updateMany({
      where: { sharedMomentId: moment.id, status: "QUEUED" },
      data: { status: "CANCELED", finishedAt: new Date(), errorCode: "NO_FRIENDS" }
    });
    await tx.sharedMoment.update({ where: { id: moment.id }, data: { status: "WAITING" } });
  }
  return keys;
}

/** Removes a user from every shared photo of other people (leaving or deleting the account). */
export async function leaveAllSharedMoments(userId: string, logger: Logger): Promise<number> {
  const memberships = await prisma.sharedParticipant.findMany({ where: { userId }, select: { sharedMomentId: true } });
  const keys: string[] = [];
  for (const { sharedMomentId } of memberships) {
    keys.push(
      ...(await prisma.$transaction(async (tx) => {
        await tx.sharedParticipant.deleteMany({ where: { sharedMomentId, userId } });
        return afterMemberLeft(tx, sharedMomentId);
      }))
    );
  }
  await prisma.sharedInvite.updateMany({
    where: { inviteeUserId: userId, status: "PENDING" },
    data: { status: "CANCELED", email: null, respondedAt: new Date() }
  });
  await deleteObjects(keys).catch((error: unknown) => logger.error({ err: error }, "Shared photo files not deleted"));
  return memberships.length;
}
