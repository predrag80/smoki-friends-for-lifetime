import { readFile } from "node:fs/promises";

import sharp from "sharp";

const MAX_SIDE = 1024;

/** Packshot normalised to a PNG of at most 1024 px, so every request sends the same small reference. */
export async function loadProductReference(path: string): Promise<{ data: Buffer; mimeType: string }> {
  const data = await sharp(await readFile(path))
    .rotate()
    .resize(MAX_SIDE, MAX_SIDE, { fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  return { data, mimeType: "image/png" };
}

let cached: Promise<{ data: Buffer; mimeType: string } | undefined> | null = null;

/** Product reference configured with PRODUCT_REFERENCE_IMAGE; undefined when not set. */
export function getProductReference(path: string | undefined): Promise<{ data: Buffer; mimeType: string } | undefined> {
  if (!path) return Promise.resolve(undefined);
  cached ??= loadProductReference(path);
  return cached;
}
