import assert from "node:assert/strict";
import { test } from "node:test";

import { getAccountReadiness, maskEmail } from "./account.js";
import {
  canOfferMarketing,
  digitalConsentAgeByMarket,
  getAge,
  isValidBirth,
  MIN_USER_AGE,
  requiresGuardianConsent
} from "./age.js";
import { marketCodes } from "./markets.js";

const now = new Date("2026-10-08T10:00:00Z");

test("age counts the birthday as passed only after the birth month", () => {
  assert.equal(getAge({ month: 9, year: 2014 }, now), 12);
  assert.equal(getAge({ month: 10, year: 2014 }, now), 11);
  assert.equal(getAge({ month: 11, year: 2014 }, now), 11);
});

test("someone born in the current month is not yet old enough", () => {
  assert.ok(getAge({ month: 10, year: 2014 }, now) < MIN_USER_AGE);
});

test("birth date validation rejects future dates and invalid months", () => {
  assert.equal(isValidBirth({ month: 10, year: 2026 }, now), true);
  assert.equal(isValidBirth({ month: 11, year: 2026 }, now), false);
  assert.equal(isValidBirth({ month: 13, year: 2000 }, now), false);
  assert.equal(isValidBirth({ month: 0, year: 2000 }, now), false);
  assert.equal(isValidBirth({ month: 5, year: 1890 }, now), false);
});

test("guardian consent follows the market's digital consent age", () => {
  for (const market of marketCodes) {
    const limit = digitalConsentAgeByMarket[market];
    assert.equal(requiresGuardianConsent(limit - 1, market), true, market);
    assert.equal(requiresGuardianConsent(limit, market), false, market);
  }
});

test("every market's digital consent age is between the app minimum and adulthood", () => {
  for (const market of marketCodes) {
    const limit = digitalConsentAgeByMarket[market];
    assert.ok(limit > MIN_USER_AGE && limit <= 18, market);
  }
});

test("marketing is offered to adults only", () => {
  assert.equal(canOfferMarketing(17), false);
  assert.equal(canOfferMarketing(18), true);
});

test("readiness lists every missing step", () => {
  assert.deepEqual(
    getAccountReadiness({ emailVerified: false, guardianRequired: true, guardianConfirmed: false, photoConsent: false }),
    { canCreate: false, missing: ["EMAIL_VERIFICATION", "GUARDIAN_CONSENT", "PHOTO_CONSENT"] }
  );
  assert.deepEqual(
    getAccountReadiness({ emailVerified: true, guardianRequired: false, guardianConfirmed: false, photoConsent: true }),
    { canCreate: true, missing: [] }
  );
});

test("emails shown to a guardian are masked", () => {
  assert.equal(maskEmail("predrag@gmail.com"), "p******@gmail.com");
  assert.equal(maskEmail("ab@x.rs"), "a***@x.rs");
});
