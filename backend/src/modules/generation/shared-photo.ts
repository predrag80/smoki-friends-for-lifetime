import { randomUUID } from "node:crypto";

import { getAge, sceneCatalog, sharedTargetAge } from "@sffl/shared";

import { getEnv } from "../../config/env.js";
import { toDeliveryImage } from "../../lib/images.js";
import { sendMail } from "../../lib/mailer.js";
import { prisma } from "../../lib/prisma.js";
import { deleteObjects, getObject, mediaKey, putObject } from "../../lib/storage.js";
import { sharedPhotoReadyMessage } from "../shared/emails.js";
import { sceneTitle } from "../shared/service.js";
import { needsAnotherCandidate, weakestScore } from "./likeness.js";
import { ensureAgedPortrait, ensureFaceTraits } from "./past-moment.js";
import { getProductReference } from "./product-reference.js";
import { buildSharedPhotoPrompt } from "./prompt.js";
import { ProviderError, type AiProvider } from "./providers/index.js";
import type { GeneratedImage, ImageInput } from "./providers/types.js";
import { nextRetryDelay } from "./retry.js";

type Logger = { info: (obj: object, msg?: string) => void; error: (obj: object, msg?: string) => void };

const personSelect = {
  id: true,
  email: true,
  locale: true,
  birthMonth: true,
  birthYear: true,
  deletedAt: true
} as const;

async function finishJob(jobId: string, status: "CANCELED", errorCode: string) {
  await prisma.generationJob.update({
    where: { id: jobId },
    data: { status, finishedAt: new Date(), lockedBy: null, errorCode }
  });
}

/** One photo with the owner and every friend who accepted, all at their current age. */
export async function processSharedPhotoJob(jobId: string, provider: AiProvider, logger: Logger): Promise<void> {
  const job = await prisma.generationJob.findUniqueOrThrow({
    where: { id: jobId },
    include: {
      sharedMoment: {
        include: {
          scene: { include: { translations: true } },
          owner: { select: personSelect },
          participants: { orderBy: { joinedAt: "asc" }, include: { user: { select: personSelect } } }
        }
      }
    }
  });

  const moment = job.sharedMoment;
  if (!moment || moment.owner.deletedAt) {
    await finishJob(job.id, "CANCELED", "INVALID_JOB");
    return;
  }
  const friends = moment.participants.map((participant) => participant.user).filter((user) => !user.deletedAt);
  if (friends.length === 0) {
    await finishJob(job.id, "CANCELED", "NO_FRIENDS");
    await prisma.sharedMoment.update({ where: { id: moment.id }, data: { status: "WAITING" } });
    return;
  }

  try {
    // Owner first, then friends in the order they joined; a friend without a usable photo is left out.
    // For YESTERDAY each person's reference is their portrait at the age on the photo (same two-step idea as
    // single past moments); for TODAY and SOMEDAY it is today's photo.
    const portraits = moment.period === "YESTERDAY";
    const model = provider.name === "mock" ? "mock" : getEnv().GEMINI_IMAGE_MODEL;
    const people: { id: string; currentAge: number; targetAge: number; reference: ImageInput }[] = [];
    for (const person of [moment.owner, ...friends]) {
      const asset = await prisma.mediaAsset.findFirst({
        where: { userId: person.id, kind: "SOURCE_PHOTO", deletedAt: null },
        orderBy: { createdAt: "desc" }
      });
      if (!asset) {
        if (person.id === moment.owner.id) throw new ProviderError("NO_SOURCE_PHOTO", false);
        logger.info({ jobId: job.id }, "Friend without a source photo left out of the shared photo");
        continue;
      }
      const currentAge = getAge({ month: person.birthMonth, year: person.birthYear });
      const targetAge = sharedTargetAge(currentAge, moment.yearsOffset);
      const photo = { data: await getObject(asset.storageKey), mimeType: asset.contentType };
      let reference: ImageInput = photo;
      if (portraits) {
        const traits = await ensureFaceTraits(provider, asset, photo);
        reference = await ensureAgedPortrait({ provider, model, source: asset, image: photo, targetAge, currentAge, traits });
      }
      people.push({ id: person.id, currentAge, targetAge, reference });
    }
    const [first, ...others] = people;
    if (!first || others.length === 0) throw new ProviderError("NO_FRIEND_PHOTOS", false);

    const productImage = await getProductReference(getEnv().PRODUCT_REFERENCE_IMAGE);
    const catalogScene = sceneCatalog.find((scene) => scene.id === moment.sceneId);
    const title = sceneTitle(moment.scene, "sr");
    const prompt = buildSharedPhotoPrompt({
      scenePrompt: moment.scene.aiPrompt ?? catalogScene?.prompt ?? moment.sceneId,
      territory: moment.scene.territory,
      period: moment.period,
      people: people.map(({ currentAge, targetAge }) => ({ currentAge, targetAge })),
      portraitReferences: portraits,
      productReference: Boolean(productImage),
      productPlacement: catalogScene?.productPlacement
    });

    const generate = () =>
      provider.generatePhoto({
        sourceImage: first.reference.data,
        sourceMimeType: first.reference.mimeType,
        personReferences: others.map((person) => person.reference),
        productImage,
        prompt,
        label: { sceneTitle: title, targetAge: first.targetAge, period: moment.period }
      });
    // A portrait already shows the age on the photo; today's photo is compared across the years.
    const score = async (image: GeneratedImage) =>
      weakestScore(
        await Promise.all(
          people.map((person) =>
            provider
              .rateLikeness({
                reference: person.reference,
                generated: { data: image.image, mimeType: image.mimeType },
                targetAge: person.targetAge,
                currentAge: portraits ? person.targetAge : person.currentAge,
                group: true
              })
              .catch(() => null)
          )
        )
      );

    let result = await generate();
    const firstScore = await score(result);
    if (needsAnotherCandidate(firstScore)) {
      logger.info({ jobId: job.id, score: firstScore }, "Someone in the shared photo looks off, generating another candidate");
      const second = await generate().catch(() => null);
      const secondScore = second ? await score(second) : null;
      if (second && (secondScore ?? 0) > (firstScore ?? 0)) result = second;
    }

    const image = await toDeliveryImage(result.image);
    const storageKey = mediaKey(moment.ownerId, "photo", randomUUID(), image.extension);
    await putObject(storageKey, image.buffer, image.contentType);

    // Someone may have left while the photo was being made; their face must not be shown.
    const stillThere = await prisma.sharedParticipant.count({
      where: { sharedMomentId: moment.id, userId: { in: others.map((person) => person.id) } }
    });
    const momentNow = await prisma.sharedMoment.findUnique({ where: { id: moment.id }, select: { photoAssetId: true } });
    if (!momentNow || stillThere < others.length) {
      await deleteObjects([storageKey]).catch(() => undefined);
      await finishJob(job.id, "CANCELED", "PARTICIPANTS_CHANGED");
      return;
    }

    await prisma.$transaction(async (tx) => {
      const asset = await tx.mediaAsset.create({
        data: {
          userId: moment.ownerId,
          kind: "GENERATED_PHOTO",
          storageKey,
          contentType: image.contentType,
          byteSize: image.buffer.length,
          width: image.width,
          height: image.height
        }
      });
      await tx.sharedMoment.update({ where: { id: moment.id }, data: { photoAssetId: asset.id, status: "PHOTO_READY" } });
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

    if (momentNow.photoAssetId) {
      const previous = await prisma.mediaAsset.delete({ where: { id: momentNow.photoAssetId } }).catch(() => null);
      if (previous) await deleteObjects([previous.storageKey]).catch(() => undefined);
    }
    logger.info({ jobId: job.id, sharedMomentId: moment.id, people: people.length }, "Shared photo generated");

    // Tell everyone on the photo, unless a newer photo with more friends is already queued.
    const newer = await prisma.generationJob.count({ where: { sharedMomentId: moment.id, status: "QUEUED" } });
    if (newer === 0) {
      const link = `${getEnv().APP_URL}/story`;
      for (const person of [moment.owner, ...friends].filter((user) => people.some((p) => p.id === user.id))) {
        await sendMail(sharedPhotoReadyMessage(person.locale, person.email, link, sceneTitle(moment.scene, person.locale)), logger);
      }
    }
  } catch (error) {
    const retryable = error instanceof ProviderError ? error.retryable : true;
    const code = error instanceof ProviderError ? error.code : "INTERNAL_ERROR";
    const message = error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500);
    logger.error({ jobId: job.id, code, attempt: job.attempts, err: error }, "Shared photo generation failed");

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

    const current = await prisma.sharedMoment.findUnique({ where: { id: moment.id }, select: { photoAssetId: true } });
    await prisma.generationJob.update({
      where: { id: job.id },
      data: { status: "FAILED", finishedAt: new Date(), lockedBy: null, errorCode: code, errorMessage: message }
    });
    if (current) {
      await prisma.sharedMoment.update({
        where: { id: moment.id },
        data: { status: current.photoAssetId ? "PHOTO_READY" : "FAILED" }
      });
    }
  }
}
