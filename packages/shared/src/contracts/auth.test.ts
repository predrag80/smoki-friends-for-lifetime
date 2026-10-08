import assert from "node:assert/strict";
import { test } from "node:test";

import { checkPasswordStrength } from "../domain/password.js";
import { isValidEmail, registerRequestSchema, resetPasswordRequestSchema } from "./auth.js";

const validRegistration = {
  email: "  Ana@Example.COM ",
  password: "smoki2027",
  birthMonth: 5,
  birthYear: 1990,
  market: "SRB",
  locale: "sr",
  acceptTerms: true,
  acceptPrivacy: true
};

test("registration normalises the email and defaults marketing to false", () => {
  const parsed = registerRequestSchema.parse(validRegistration);
  assert.equal(parsed.email, "ana@example.com");
  assert.equal(parsed.marketingOptIn, false);
});

test("registration requires accepted terms and privacy", () => {
  assert.equal(registerRequestSchema.safeParse({ ...validRegistration, acceptTerms: false }).success, false);
  assert.equal(registerRequestSchema.safeParse({ ...validRegistration, acceptPrivacy: undefined }).success, false);
});

test("registration rejects malformed fields", () => {
  for (const patch of [
    { email: "not-an-email" },
    { birthMonth: 13 },
    { birthYear: 1800 },
    { market: "USA" },
    { locale: "en" },
    { guardianEmail: "x" },
    { password: "" }
  ]) {
    assert.equal(registerRequestSchema.safeParse({ ...validRegistration, ...patch }).success, false, JSON.stringify(patch));
  }
});

test("email check used by the forms", () => {
  assert.equal(isValidEmail("ana@example.com"), true);
  assert.equal(isValidEmail("ana@"), false);
  assert.equal(isValidEmail("ana example.com"), false);
});

test("password strength rules", () => {
  assert.equal(checkPasswordStrength("kratko1"), "TOO_SHORT");
  assert.equal(checkPasswordStrength("samoslova"), "NEEDS_LETTER_AND_NUMBER");
  assert.equal(checkPasswordStrength("12345678"), "NEEDS_LETTER_AND_NUMBER");
  assert.equal(checkPasswordStrength("ana1@example.com", "Ana1@example.com"), "SAME_AS_EMAIL");
  assert.equal(checkPasswordStrength("x".repeat(201) + "1"), "TOO_LONG");
  assert.equal(checkPasswordStrength("čokolada7"), null, "non-ASCII letters count as letters");
});

test("reset request needs a token and a password", () => {
  assert.equal(resetPasswordRequestSchema.safeParse({ token: "t".repeat(43), password: "smoki2027" }).success, true);
  assert.equal(resetPasswordRequestSchema.safeParse({ token: "short", password: "smoki2027" }).success, false);
});
