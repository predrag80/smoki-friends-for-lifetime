import assert from "node:assert/strict";
import { test } from "node:test";

import sharp from "sharp";

import { createMockProvider } from "./mock.js";
import { ProviderError } from "./types.js";

const source = await sharp({ create: { width: 900, height: 1200, channels: 3, background: "#c08060" } }).jpeg().toBuffer();
const input = {
  sourceImage: source,
  sourceMimeType: "image/jpeg",
  prompt: "test",
  label: { sceneTitle: "Klupa u kraju", targetAge: 12, period: "YESTERDAY" as const }
};

test("mock provider returns a 3:4 JPEG placeholder", async () => {
  const provider = createMockProvider({ delayMs: 0, failureRate: 0, faceCheck: "pass" });
  const result = await provider.generatePhoto(input);
  const metadata = await sharp(result.image).metadata();

  assert.equal(result.mimeType, "image/jpeg");
  assert.equal(result.costMicroUsd, 0);
  assert.equal(metadata.width, 768);
  assert.equal(metadata.height, 1024);
});

test("mock provider can simulate retryable failures and face rejections", async () => {
  const failing = createMockProvider({ delayMs: 0, failureRate: 1, faceCheck: "reject", random: () => 0 });
  await assert.rejects(failing.generatePhoto(input), (error: unknown) => error instanceof ProviderError && error.retryable);
  assert.deepEqual(await failing.checkFace(source, "image/jpeg"), { ok: false, reason: "NO_FACE" });
});
