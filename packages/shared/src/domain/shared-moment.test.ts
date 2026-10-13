import assert from "node:assert/strict";
import { test } from "node:test";

import { canShareMoment, checkUsername, isSharedMomentUnlocked, normalizeUsername } from "./shared-moment.js";

test("usernames are normalised and validated", () => {
  assert.equal(normalizeUsername("  @Marko.Petrovic "), "marko.petrovic");
  assert.equal(checkUsername("marko_88"), null);
  assert.equal(checkUsername("ab"), "TOO_SHORT");
  assert.equal(checkUsername("a".repeat(21)), "TOO_LONG");
  assert.equal(checkUsername("marko petrović"), "INVALID_CHARACTERS");
  assert.equal(checkUsername(".marko"), "INVALID_CHARACTERS");
  assert.equal(checkUsername("mar..ko"), "INVALID_CHARACTERS");
  assert.equal(checkUsername("Admin"), "RESERVED");
});

test("the shared moment unlocks with all three periods", () => {
  assert.equal(isSharedMomentUnlocked(2), false);
  assert.equal(isSharedMomentUnlocked(3), true);
});

const adult = { age: 40, email: "mama@example.com", confirmedGuardianEmail: null };
const otherAdult = { age: 25, email: "ana@example.com", confirmedGuardianEmail: null };
const child = { age: 13, email: "dete@example.com", confirmedGuardianEmail: "mama@example.com" };
const otherChild = { age: 16, email: "drug@example.com", confirmedGuardianEmail: null };

test("adults with adults and minors with minors may share", () => {
  assert.equal(canShareMoment(adult, otherAdult), true);
  assert.equal(canShareMoment(child, otherChild), true);
});

test("an adult and a minor only when the adult is the confirmed guardian", () => {
  assert.equal(canShareMoment(adult, child), true);
  assert.equal(canShareMoment(child, { ...adult, email: " Mama@Example.com " }), true);
  assert.equal(canShareMoment(otherAdult, child), false);
  assert.equal(canShareMoment(adult, otherChild), false);
});
