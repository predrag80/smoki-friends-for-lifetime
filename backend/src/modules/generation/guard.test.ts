import assert from "node:assert/strict";
import { test } from "node:test";

import { isDailyCapReached, isEmailAllowed, parseAllowedEmails } from "./guard.js";

test("an empty allow-list lets everyone use AI", () => {
  assert.deepEqual(parseAllowedEmails(undefined), []);
  assert.equal(isEmailAllowed("anyone@example.com", parseAllowedEmails("")), true);
});

test("the allow-list ignores case and spaces", () => {
  const allowed = parseAllowedEmails(" Ana@Example.com , marko@example.com,");
  assert.deepEqual(allowed, ["ana@example.com", "marko@example.com"]);
  assert.equal(isEmailAllowed("ANA@example.com", allowed), true);
  assert.equal(isEmailAllowed("other@example.com", allowed), false);
});

test("a zero cap means unlimited", () => {
  assert.equal(isDailyCapReached(10_000, 0), false);
  assert.equal(isDailyCapReached(99, 100), false);
  assert.equal(isDailyCapReached(100, 100), true);
});
