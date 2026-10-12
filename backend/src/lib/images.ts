import type { PhotoRejectionCode } from "@sffl/shared";
import sharp from "sharp";

export class PhotoRejectedError extends Error {
  constructor(readonly code: PhotoRejectionCode) {
    super(code);
  }
}

type ImageMetadata = Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;

const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp"]);

export type PreparedPhoto = { buffer: Buffer; width: number; height: number; contentType: "image/jpeg" };

/**
 * Technical check and normalisation of an uploaded face photo:
 * accepted formats only, minimum resolution, EXIF rotation applied, all metadata
 * (EXIF/GPS/device) removed, resized to at most `maxDimension` and re-encoded as JPEG.
 */
export async function prepareSourcePhoto(
  input: Buffer,
  options: { minDimension: number; maxDimension?: number }
): Promise<PreparedPhoto> {
  let metadata: ImageMetadata;
  try {
    metadata = await sharp(input).metadata();
  } catch {
    throw new PhotoRejectedError("PHOTO_UNREADABLE");
  }

  if (!metadata.format || !ACCEPTED_FORMATS.has(metadata.format)) {
    throw new PhotoRejectedError("PHOTO_UNSUPPORTED_FORMAT");
  }
  if (!metadata.width || !metadata.height || Math.min(metadata.width, metadata.height) < options.minDimension) {
    throw new PhotoRejectedError("PHOTO_TOO_SMALL");
  }

  const maxDimension = options.maxDimension ?? 1600;
  // sharp drops all metadata unless withMetadata()/keepExif() is called.
  const { data, info } = await sharp(input)
    .rotate()
    .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  return { buffer: data, width: info.width, height: info.height, contentType: "image/jpeg" };
}

export type DeliveryImage = { buffer: Buffer; contentType: "image/webp"; extension: "webp"; width: number; height: number };

/**
 * Generated photos arrive as ~1.5 MB PNGs; WebP at quality 86 keeps them visually identical at ~5x less,
 * so the story page loads quickly on mobile. Metadata is not copied.
 */
export async function toDeliveryImage(input: Buffer): Promise<DeliveryImage> {
  const { data, info } = await sharp(input).rotate().webp({ quality: 86, effort: 4 }).toBuffer({ resolveWithObject: true });
  return { buffer: data, contentType: "image/webp", extension: "webp", width: info.width, height: info.height };
}
