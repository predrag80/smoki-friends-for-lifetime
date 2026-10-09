import assert from "node:assert/strict";
import { test } from "node:test";

import sharp from "sharp";

import { PhotoRejectedError, prepareSourcePhoto } from "./images.js";

function solid(width: number, height: number) {
  return sharp({ create: { width, height, channels: 3, background: { r: 200, g: 120, b: 90 } } });
}

test("strips EXIF metadata, re-encodes as JPEG and caps the size", async () => {
  const input = await solid(2400, 3200).withExif({ IFD0: { Copyright: "secret-device" } }).jpeg().toBuffer();
  assert.ok((await sharp(input).metadata()).exif, "fixture has EXIF");

  const prepared = await prepareSourcePhoto(input, { minDimension: 512 });
  const metadata = await sharp(prepared.buffer).metadata();

  assert.equal(metadata.format, "jpeg");
  assert.equal(metadata.exif, undefined);
  assert.equal(Math.max(prepared.width, prepared.height), 1600);
});

test("rejects images that are too small", async () => {
  const input = await solid(400, 600).png().toBuffer();
  await assert.rejects(prepareSourcePhoto(input, { minDimension: 512 }), (error: unknown) => {
    return error instanceof PhotoRejectedError && error.code === "PHOTO_TOO_SMALL";
  });
});

test("rejects unsupported formats and unreadable data", async () => {
  const gif = await solid(800, 800).gif().toBuffer();
  await assert.rejects(prepareSourcePhoto(gif, { minDimension: 512 }), { code: "PHOTO_UNSUPPORTED_FORMAT" });
  await assert.rejects(prepareSourcePhoto(Buffer.from("not an image"), { minDimension: 512 }), { code: "PHOTO_UNREADABLE" });
});
