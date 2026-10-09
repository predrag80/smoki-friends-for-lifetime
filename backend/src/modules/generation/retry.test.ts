import assert from "node:assert/strict";
import { test } from "node:test";

import { ProviderError } from "./providers/types.js";
import { nextRetryDelay } from "./retry.js";

test("quota errors wait longer than the normal backoff", () => {
  const quota = new ProviderError("RATE_LIMITED", true, "429", 30000);
  assert.equal(nextRetryDelay(quota, 1), 30000);
  assert.equal(nextRetryDelay(quota, 2), 60000);
  assert.ok(nextRetryDelay(new Error("x"), 1) < 30000);
});
