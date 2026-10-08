import assert from "node:assert/strict";
import { test } from "node:test";

import { buildMeResponse, type MeSource } from "./me.js";

const now = new Date("2026-10-08T10:00:00Z");

const minor: MeSource = {
  id: "u1",
  email: "dete@example.com",
  emailVerifiedAt: now,
  passwordHash: "scrypt$...",
  birthMonth: 1,
  birthYear: 2013,
  market: "SRB",
  locale: "sr",
  oauthAccounts: [],
  consents: [
    { type: "TERMS", revokedAt: null },
    { type: "PRIVACY", revokedAt: null },
    { type: "PHOTO_PROCESSING", revokedAt: now }
  ],
  guardianConsent: { guardianEmail: "roditelj@example.com", confirmedAt: null }
};

test("a minor waiting for a guardian cannot create yet", () => {
  const me = buildMeResponse(minor, now);
  assert.equal(me.user.age, 13);
  assert.deepEqual(me.guardian, { status: "PENDING", email: "r*******@example.com" });
  assert.equal(me.consents.PHOTO_PROCESSING, false, "revoked consent is not active");
  assert.deepEqual(me.readiness, { canCreate: false, missing: ["GUARDIAN_CONSENT", "PHOTO_CONSENT"] });
});

test("guardian consent stops being required once the user is old enough", () => {
  const me = buildMeResponse({ ...minor, birthYear: 2010 }, now);
  assert.deepEqual(me.guardian, { status: "NOT_REQUIRED", email: null });
});

test("a ready adult Google user", () => {
  const me = buildMeResponse(
    {
      ...minor,
      birthYear: 1990,
      passwordHash: null,
      oauthAccounts: [{ provider: "GOOGLE" }],
      consents: [...minor.consents, { type: "PHOTO_PROCESSING", revokedAt: null }],
      guardianConsent: null
    },
    now
  );
  assert.equal(me.user.hasPassword, false);
  assert.deepEqual(me.user.providers, ["GOOGLE"]);
  assert.deepEqual(me.readiness, { canCreate: true, missing: [] });
});
