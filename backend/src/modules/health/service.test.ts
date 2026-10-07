import assert from "node:assert/strict";
import { test } from "node:test";

import { healthResponseSchema } from "@sffl/shared";

import { getHealth } from "./service.js";

const ok = async () => undefined;
const fail = async () => {
  throw new Error("down");
};

test("reports ok when all dependencies respond", async () => {
  const health = await getHealth({ service: "api", checkDatabase: ok, checkRedis: ok });

  assert.equal(health.status, "ok");
  assert.deepEqual(health.checks, { database: "ok", redis: "ok" });
  assert.doesNotThrow(() => healthResponseSchema.parse(health));
});

test("reports degraded when the database is unavailable", async () => {
  const health = await getHealth({ service: "api", checkDatabase: fail, checkRedis: ok });

  assert.equal(health.status, "degraded");
  assert.equal(health.checks.database, "error");
});

test("treats missing redis configuration as disabled, not degraded", async () => {
  const health = await getHealth({ service: "api", checkDatabase: ok, checkRedis: null });

  assert.equal(health.status, "ok");
  assert.equal(health.checks.redis, "disabled");
});
