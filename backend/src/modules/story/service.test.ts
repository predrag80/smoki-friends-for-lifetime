import assert from "node:assert/strict";
import { test } from "node:test";

import { mediaUrl, sortMoments, toMomentDto, type MomentRow } from "./service.js";

const row: MomentRow = {
  id: "m1",
  period: "YESTERDAY",
  targetAge: 12,
  status: "PHOTO_PENDING",
  photoAssetId: null,
  createdAt: new Date("2026-10-09T10:00:00Z"),
  scene: { id: "neighborhood-bench", territory: "SOCIALIZING", translations: [{ locale: "sr", title: "Klupa u kraju" }] },
  latestJob: { status: "QUEUED", errorCode: null },
  recentJobs: 1
};
const options = { apiUrl: "https://api.example.rs/", locale: "de" as const, dailyLimit: 3 };

test("a queued moment is pending, uses the Serbian title as fallback and counts the limit", () => {
  const dto = toMomentDto(row, options);
  assert.equal(dto.pending, true);
  assert.equal(dto.scene.title, "Klupa u kraju");
  assert.equal(dto.photoUrl, null);
  assert.equal(dto.generationsLeft, 2);
  assert.equal(dto.error, null);
});

test("a finished moment links its photo through the media endpoint", () => {
  const dto = toMomentDto({ ...row, status: "PHOTO_READY", photoAssetId: "a1", latestJob: { status: "SUCCEEDED", errorCode: null } }, options);
  assert.equal(dto.pending, false);
  assert.equal(dto.photoUrl, "https://api.example.rs/media/a1");
});

test("a failed moment without a photo reports a generic error", () => {
  const dto = toMomentDto({ ...row, status: "FAILED", latestJob: { status: "FAILED", errorCode: "TIMEOUT" } }, options);
  assert.equal(dto.error, "GENERATION_FAILED");
});

test("a refusal by the model is reported separately", () => {
  const dto = toMomentDto({ ...row, status: "FAILED", latestJob: { status: "FAILED", errorCode: "BLOCKED" } }, options);
  assert.equal(dto.error, "GENERATION_BLOCKED");
});

test("a failed regenerate keeps the photo and still reports the failure", () => {
  const dto = toMomentDto({ ...row, status: "PHOTO_READY", photoAssetId: "a1", latestJob: { status: "FAILED", errorCode: "TIMEOUT" } }, options);
  assert.equal(dto.photoUrl, "https://api.example.rs/media/a1");
  assert.equal(dto.error, "GENERATION_FAILED");
});

test("moments are ordered yesterday, today, someday", () => {
  const sorted = sortMoments([{ period: "SOMEDAY" }, { period: "YESTERDAY" }, { period: "TODAY" }] as const satisfies { period: "SOMEDAY" | "YESTERDAY" | "TODAY" }[]);
  assert.deepEqual(sorted.map((moment) => moment.period), ["YESTERDAY", "TODAY", "SOMEDAY"]);
  assert.equal(mediaUrl("http://api", "x"), "http://api/media/x");
});
