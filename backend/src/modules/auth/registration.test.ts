import assert from "node:assert/strict";
import { test } from "node:test";

import { evaluateRegistration } from "./registration.js";

const now = new Date("2026-10-08T10:00:00Z");
const base = { email: "dete@example.com", market: "SRB" as const, marketingOptIn: true };

test("rejects users younger than 12", () => {
  assert.deepEqual(evaluateRegistration({ ...base, birthMonth: 10, birthYear: 2014 }, now), {
    ok: false,
    error: "UNDER_MIN_AGE"
  });
});

test("rejects impossible birth dates", () => {
  assert.deepEqual(evaluateRegistration({ ...base, birthMonth: 12, birthYear: 2026 }, now), {
    ok: false,
    error: "INVALID_BIRTH_DATE"
  });
});

test("minors below the market's consent age need a guardian email", () => {
  assert.deepEqual(evaluateRegistration({ ...base, birthMonth: 1, birthYear: 2013 }, now), {
    ok: false,
    error: "GUARDIAN_EMAIL_REQUIRED"
  });
});

test("guardian email must differ from the user's email", () => {
  assert.deepEqual(
    evaluateRegistration({ ...base, birthMonth: 1, birthYear: 2013, guardianEmail: base.email }, now),
    { ok: false, error: "GUARDIAN_EMAIL_SAME_AS_USER" }
  );
});

test("a 13-year-old with a guardian email is accepted without marketing", () => {
  assert.deepEqual(
    evaluateRegistration({ ...base, birthMonth: 1, birthYear: 2013, guardianEmail: "roditelj@example.com" }, now),
    { ok: true, age: 13, guardianEmail: "roditelj@example.com", marketing: false }
  );
});

test("the same age can need a guardian in one market and not in another", () => {
  const fourteen = { ...base, birthMonth: 1, birthYear: 2012 };
  assert.equal(evaluateRegistration({ ...fourteen, market: "AUT" }, now).ok, true);
  assert.deepEqual(evaluateRegistration({ ...fourteen, market: "HRV" }, now), {
    ok: false,
    error: "GUARDIAN_EMAIL_REQUIRED"
  });
});

test("adults keep their marketing choice and never get a guardian", () => {
  assert.deepEqual(
    evaluateRegistration({ ...base, birthMonth: 5, birthYear: 1990, guardianEmail: "x@example.com" }, now),
    { ok: true, age: 36, guardianEmail: null, marketing: true }
  );
});
