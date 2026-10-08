import assert from "node:assert/strict";
import { test } from "node:test";

import { deriveProfile, emptyProfile, validateProfile, type ProfileState } from "./profile";

const now = new Date("2026-10-08T10:00:00Z");
const adult: ProfileState = { ...emptyProfile, birthMonth: "5", birthYear: "1990", market: "SRB", acceptTerms: true, acceptPrivacy: true };

test("an empty profile reports every missing field", () => {
  assert.deepEqual(validateProfile(emptyProfile, deriveProfile(emptyProfile, now)), {
    birth: "birthRequired",
    market: "marketRequired",
    accept: "acceptRequired"
  });
});

test("a complete adult profile has no errors", () => {
  assert.deepEqual(validateProfile(adult, deriveProfile(adult, now)), {});
});

test("users younger than 12 are stopped on the birth field", () => {
  const child = { ...adult, birthMonth: "10", birthYear: "2014" };
  assert.equal(validateProfile(child, deriveProfile(child, now)).birth, "UNDER_MIN_AGE");
});

test("a minor needs a valid guardian email that differs from their own", () => {
  const minor = { ...adult, birthMonth: "1", birthYear: "2013" };
  assert.equal(validateProfile(minor, deriveProfile(minor, now)).guardianEmail, "GUARDIAN_EMAIL_REQUIRED");

  const invalid = { ...minor, guardianEmail: "roditelj@" };
  assert.equal(validateProfile(invalid, deriveProfile(invalid, now)).guardianEmail, "guardianEmailInvalid");

  const same = { ...minor, guardianEmail: "Dete@Example.com" };
  assert.equal(
    validateProfile(same, deriveProfile(same, now), "dete@example.com").guardianEmail,
    "GUARDIAN_EMAIL_SAME_AS_USER"
  );
});

test("marketing is only offered to adults", () => {
  assert.equal(deriveProfile(adult, now).marketingAllowed, true);
  assert.equal(deriveProfile({ ...adult, birthYear: "2010" }, now).marketingAllowed, false);
});
