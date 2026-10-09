import assert from "node:assert/strict";
import { test } from "node:test";

import { generationsLeft, retryDelayMs } from "./generation.js";

test("generations left never goes below zero", () => {
  assert.equal(generationsLeft(0), 3);
  assert.equal(generationsLeft(2), 1);
  assert.equal(generationsLeft(5), 0);
  assert.equal(generationsLeft(1, 5), 4);
});

test("retry delay grows exponentially with a cap", () => {
  assert.equal(retryDelayMs(1), 5000);
  assert.equal(retryDelayMs(2), 10000);
  assert.equal(retryDelayMs(3), 20000);
  assert.equal(retryDelayMs(20), 5 * 60 * 1000);
});
