import assert from "node:assert/strict";
import { test } from "node:test";

import { classifyApiStatus, interpretFaceCheck, isSafetyStop, parseFaceCheckAnswer } from "./gemini.js";

const good = { isPhoto: true, faceCount: 1, clear: true, obstructed: false };

test("face check accepts one clear, uncovered face", () => {
  assert.deepEqual(interpretFaceCheck(good), { ok: true });
});

test("face check explains each rejection", () => {
  assert.deepEqual(interpretFaceCheck({ ...good, isPhoto: false }), { ok: false, reason: "NOT_A_PHOTO" });
  assert.deepEqual(interpretFaceCheck({ ...good, faceCount: 0 }), { ok: false, reason: "NO_FACE" });
  assert.deepEqual(interpretFaceCheck({ ...good, faceCount: 3 }), { ok: false, reason: "MULTIPLE_FACES" });
  assert.deepEqual(interpretFaceCheck({ ...good, obstructed: true }), { ok: false, reason: "FACE_OBSTRUCTED" });
  assert.deepEqual(interpretFaceCheck({ ...good, clear: false }), { ok: false, reason: "FACE_NOT_CLEAR" });
});

test("safety finish reasons are treated as a refusal", () => {
  assert.equal(isSafetyStop("IMAGE_SAFETY"), true);
  assert.equal(isSafetyStop("PROHIBITED_CONTENT"), true);
  assert.equal(isSafetyStop("IMAGE_PROHIBITED_CONTENT"), true);
  assert.equal(isSafetyStop("STOP"), false);
  assert.equal(isSafetyStop("MAX_TOKENS"), false);
});

test("API statuses map to the retry policy", () => {
  assert.deepEqual(classifyApiStatus(429), { code: "RATE_LIMITED", retryable: true, retryAfterMs: 30000 });
  assert.equal(classifyApiStatus(503).retryable, true);
  assert.equal(classifyApiStatus(400).retryable, false);
  assert.equal(classifyApiStatus(403).code, "PROVIDER_REJECTED");
});

test("an empty face check answer is a refusal, not 'not a photo'", () => {
  assert.throws(() => parseFaceCheckAnswer(""), { code: "FACE_CHECK_REFUSED" });
  assert.throws(() => parseFaceCheckAnswer(undefined), { code: "FACE_CHECK_REFUSED" });
  assert.throws(() => parseFaceCheckAnswer("{}"), { code: "FACE_CHECK_INVALID_RESPONSE" });
  assert.deepEqual(parseFaceCheckAnswer('{"isPhoto":true,"faceCount":1,"clear":true,"obstructed":false}'), {
    isPhoto: true, faceCount: 1, clear: true, obstructed: false
  });
});
