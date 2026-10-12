import { randomUUID } from "node:crypto";

import { toDeliveryImage } from "../../lib/images.js";
import { prisma } from "../../lib/prisma.js";
import { getObject, mediaKey, putObject } from "../../lib/storage.js";
import { buildAgedPortraitPrompt } from "./prompt.js";
import type { AiProvider, ImageInput } from "./providers/types.js";

export { needsAnotherCandidate, PORTRAIT_LIKENESS_RETRY_AT } from "./likeness.js";

type SourceAsset = { id: string; userId: string; faceTraits: string | null };

/** Facial traits of the source photo, computed once and stored; an empty string when the provider cannot describe them. */
export async function ensureFaceTraits(provider: AiProvider, source: SourceAsset, image: ImageInput): Promise<string> {
  if (source.faceTraits !== null) return source.faceTraits;
  const traits = await provider.describeFace(image.data, image.mimeType).catch(() => "");
  await prisma.mediaAsset.update({ where: { id: source.id }, data: { faceTraits: traits } });
  return traits;
}

/**
 * Step 1 of a past moment: the person at `targetAge` as a neutral portrait. Made once per source photo and age,
 * then reused for every scene and regeneration of that age so the user always gets the same younger self.
 */
export async function ensureAgedPortrait(options: {
  provider: AiProvider;
  model: string;
  source: SourceAsset;
  image: ImageInput;
  targetAge: number;
  currentAge: number;
  traits: string;
}): Promise<ImageInput> {
  const { provider, source, targetAge } = options;
  const existing = await prisma.agedPortrait.findUnique({
    where: { sourceAssetId_targetAge: { sourceAssetId: source.id, targetAge } },
    include: { asset: true }
  });
  if (existing) return { data: await getObject(existing.asset.storageKey), mimeType: existing.asset.contentType };

  const result = await provider.generatePhoto({
    sourceImage: options.image.data,
    sourceMimeType: options.image.mimeType,
    prompt: buildAgedPortraitPrompt({ targetAge, currentAge: options.currentAge, identityTraits: options.traits || undefined }),
    label: { sceneTitle: "Portret", targetAge, period: "YESTERDAY" }
  });
  const image = await toDeliveryImage(result.image);
  const storageKey = mediaKey(source.userId, "photo", randomUUID(), image.extension);
  await putObject(storageKey, image.buffer, image.contentType);
  await prisma.$transaction(async (tx) => {
    const asset = await tx.mediaAsset.create({
      data: {
        userId: source.userId,
        kind: "AGED_PORTRAIT",
        storageKey,
        contentType: image.contentType,
        byteSize: image.buffer.length,
        width: image.width,
        height: image.height
      }
    });
    // Another job may have made the same portrait meanwhile; the unique key keeps only one.
    await tx.agedPortrait.upsert({
      where: { sourceAssetId_targetAge: { sourceAssetId: source.id, targetAge } },
      create: { userId: source.userId, sourceAssetId: source.id, targetAge, assetId: asset.id, model: options.model },
      update: {}
    });
  });
  return { data: image.buffer, mimeType: image.contentType };
}
