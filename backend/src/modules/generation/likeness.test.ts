import assert from "node:assert/strict";
import { test } from "node:test";

import { needsAnotherCandidate, PORTRAIT_LIKENESS_RETRY_AT } from "./likeness.js";

test("only a clear miss against the portrait triggers a second candidate", () => {
  assert.equal(PORTRAIT_LIKENESS_RETRY_AT, 4);
  assert.equal(needsAnotherCandidate(3), true);
  assert.equal(needsAnotherCandidate(4), true);
  assert.equal(needsAnotherCandidate(5), false);
  assert.equal(needsAnotherCandidate(null), false);
});
