import assert from "node:assert/strict";
import { test } from "node:test";

import { formatShortDateTime, parseInviteTarget } from "./shared";

test("an address with @ inside is an email, anything else a username", () => {
  assert.deepEqual(parseInviteTarget(" Marko@Gmail.com "), { email: "marko@gmail.com" });
  assert.deepEqual(parseInviteTarget("@Marko_1"), { username: "marko_1" });
  assert.deepEqual(parseInviteTarget("ana.petrovic"), { username: "ana.petrovic" });
});

test("empty, broken emails and invalid usernames are rejected", () => {
  assert.equal(parseInviteTarget(""), null);
  assert.equal(parseInviteTarget("marko@"), null);
  assert.equal(parseInviteTarget("ab"), null);
  assert.equal(parseInviteTarget("ime sa razmakom"), null);
});

test("dates are shown as day, month and time", () => {
  const local = new Date(2026, 9, 15, 9, 5).toISOString();
  assert.equal(formatShortDateTime(local), "15. 10. u 09:05");
});
