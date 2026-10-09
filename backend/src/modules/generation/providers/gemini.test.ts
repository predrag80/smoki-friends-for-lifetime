import assert from "node:assert/strict";
import { test } from "node:test";

import { interpretFaceCheck } from "./gemini.js";

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
