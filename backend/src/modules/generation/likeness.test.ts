import assert from "node:assert/strict";
import { test } from "node:test";

import { needsAnotherCandidate, PORTRAIT_LIKENESS_RETRY_AT, weakestScore } from "./likeness.js";

test("only a clear miss against the portrait triggers a second candidate", () => {
  assert.equal(PORTRAIT_LIKENESS_RETRY_AT, 4);
  assert.equal(needsAnotherCandidate(3), true);
  assert.equal(needsAnotherCandidate(4), true);
  assert.equal(needsAnotherCandidate(5), false);
  assert.equal(needsAnotherCandidate(null), false);
});

test("a group photo is as good as its least recognisable person", () => {
  assert.equal(weakestScore([8, 4, 7]), 4);
  assert.equal(weakestScore([null, 6]), 6);
  assert.equal(weakestScore([null, null]), null);
});
