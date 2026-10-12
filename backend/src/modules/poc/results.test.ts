import assert from "node:assert/strict";
import { test } from "node:test";

import { failureReasons, periodStats, type PocAttempt, type PocRun } from "./results.js";

function attempt(period: PocAttempt["period"], status: PocAttempt["status"], ms: number, detail?: string): PocAttempt {
  return {
    id: `${period}-${ms}`, period, targetAge: 30, sceneId: "s", sceneTitle: "S", territory: "RELAXING",
    status, ms, attempts: 1, prompt: "p", code: status === "ok" ? undefined : "BLOCKED", detail
  };
}

const run: PocRun = {
  runId: "r", provider: "mock", imageModel: "m", location: "global", startedAt: "",
  people: [{
    name: "a", currentAge: 40, faceCheck: "ok",
    attempts: [
      attempt("YESTERDAY", "ok", 10000),
      attempt("YESTERDAY", "blocked", 0, "IMAGE_SAFETY"),
      attempt("TODAY", "ok", 20000),
      attempt("TODAY", "ok", 30000),
      attempt("SOMEDAY", "error", 0, "TIMEOUT")
    ]
  }]
};

test("period stats count outcomes and time only successful generations", () => {
  const [yesterday, today, someday] = periodStats(run);
  assert.equal(yesterday.successRate, 0.5);
  assert.equal(yesterday.blocked, 1);
  assert.equal(today.avgSeconds, 25);
  assert.equal(today.p95Seconds, 30);
  assert.equal(someday.errors, 1);
  assert.equal(someday.avgSeconds, null);
});

test("failure reasons are grouped", () => {
  assert.deepEqual(failureReasons(run), [
    { reason: "BLOCKED: IMAGE_SAFETY", count: 1 },
    { reason: "BLOCKED: TIMEOUT", count: 1 }
  ]);
});

test("variant stats average likeness over successful images only", async () => {
  const { variantStats } = await import("./results.js");
  const ok = (variant: string, likeness: number, ms: number) => ({ ...attempt("YESTERDAY", "ok", ms), id: `${variant}-${ms}`, variant, likeness });
  const stats = variantStats({
    ...run,
    variants: ["A", "C"],
    people: [{ name: "a", currentAge: 40, faceCheck: "ok", attempts: [ok("A", 4, 10000), ok("A", 6, 20000), ok("C", 8, 30000), { ...attempt("YESTERDAY", "blocked", 0), variant: "C" }] }]
  });
  assert.deepEqual(stats.map((row) => [row.variant, row.ok, row.total, row.avgLikeness, row.avgSeconds]), [
    ["A", 2, 2, 5, 15],
    ["C", 1, 2, 8, 30]
  ]);
});
