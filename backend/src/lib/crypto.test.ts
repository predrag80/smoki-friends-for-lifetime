import assert from "node:assert/strict";
import { test } from "node:test";

import { generateToken, hashPassword, hashToken, pkceChallenge, verifyPassword } from "./crypto.js";

test("password hash verifies the right password only", async () => {
  const stored = await hashPassword("smoki-lozinka");
  assert.ok(stored.startsWith("scrypt$"));
  assert.equal(await verifyPassword("smoki-lozinka", stored), true);
  assert.equal(await verifyPassword("pogresna", stored), false);
});

test("the same password produces different hashes (random salt)", async () => {
  assert.notEqual(await hashPassword("isto"), await hashPassword("isto"));
});

test("malformed stored hashes never verify", async () => {
  assert.equal(await verifyPassword("x", "plain-text"), false);
});

test("tokens are random and hashed deterministically", () => {
  const token = generateToken();
  assert.notEqual(token, generateToken());
  assert.equal(hashToken(token), hashToken(token));
  assert.equal(hashToken(token).length, 64);
});

test("PKCE challenge matches the RFC 7636 example", () => {
  assert.equal(
    pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
    "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
  );
});
