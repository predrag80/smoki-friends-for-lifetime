import assert from "node:assert/strict";
import { test } from "node:test";

import { displayName, fitsGroup, isOpenInvite, slotsLeft, toSharedMomentDto, type SharedRow } from "./service.js";

const now = new Date("2026-10-13T12:00:00Z");
const later = new Date("2026-10-14T12:00:00Z");
const earlier = new Date("2026-10-12T12:00:00Z");

const row: SharedRow = {
  id: "s1",
  ownerId: "u1",
  period: "TODAY",
  yearsOffset: 0,
  status: "PHOTO_READY",
  photoAssetId: "a1",
  scene: { id: "movie-night", territory: "RELAXING", translations: [{ locale: "sr", title: "Filmsko veče" }] },
  owner: { id: "u1", username: "marko", email: "marko@example.com" },
  participants: [{ user: { id: "u2", username: null, email: "ana@example.com" } }],
  invites: [
    { id: "i1", channel: "USERNAME", email: null, status: "PENDING", expiresAt: later, invitee: { username: "jovan" } },
    { id: "i2", channel: "EMAIL", email: "petar@example.com", status: "PENDING", expiresAt: earlier, invitee: null },
    { id: "i3", channel: "EMAIL", email: null, status: "ACCEPTED", expiresAt: later, invitee: null }
  ],
  latestJob: { status: "SUCCEEDED", errorCode: null },
  manualJobs: 1
};

test("display names use the username or a masked email", () => {
  assert.equal(displayName({ username: "marko", email: "marko@example.com" }), "@marko");
  assert.equal(displayName({ username: null, email: "ana@example.com" }), "a***@example.com");
});

test("slots count friends and open invites, never below zero", () => {
  assert.equal(slotsLeft(0, 0), 3);
  assert.equal(slotsLeft(1, 1), 1);
  assert.equal(slotsLeft(2, 2), 0);
  assert.equal(isOpenInvite({ status: "PENDING", expiresAt: later }, now), true);
  assert.equal(isOpenInvite({ status: "PENDING", expiresAt: earlier }, now), false);
  assert.equal(isOpenInvite({ status: "DECLINED", expiresAt: later }, now), false);
});

test("the owner sees invites, slots and generations left", () => {
  const dto = toSharedMomentDto(row, { viewerId: "u1", apiUrl: "http://api/", locale: "sr", now });
  assert.equal(dto.isOwner, true);
  assert.equal(dto.photoUrl, "http://api/media/a1");
  assert.deepEqual(
    dto.participants.map((p) => [p.name, p.role, p.isMe]),
    [
      ["@marko", "OWNER", true],
      ["a***@example.com", "FRIEND", false]
    ]
  );
  assert.deepEqual(
    dto.invites.map((invite) => [invite.label, invite.status]),
    [
      ["@jovan", "PENDING"],
      ["p****@example.com", "EXPIRED"]
    ]
  );
  assert.equal(dto.slotsLeft, 1);
  assert.equal(dto.generationsLeft, 2);
});

test("a friend sees the photo and people but no invites", () => {
  const dto = toSharedMomentDto(row, { viewerId: "u2", apiUrl: "http://api", locale: "sr", now });
  assert.equal(dto.isOwner, false);
  assert.equal(dto.participants[1]?.isMe, true);
  assert.deepEqual(dto.invites, []);
  assert.equal(dto.slotsLeft, 0);
});

test("a failed generation shows an error, a running one does not", () => {
  const failed = toSharedMomentDto(
    { ...row, latestJob: { status: "FAILED", errorCode: "BLOCKED" } },
    { viewerId: "u1", apiUrl: "http://api", locale: "sr", now }
  );
  assert.equal(failed.error, "GENERATION_BLOCKED");
  const running = toSharedMomentDto(
    { ...row, latestJob: { status: "IN_PROGRESS", errorCode: null } },
    { viewerId: "u1", apiUrl: "http://api", locale: "sr", now }
  );
  assert.equal(running.pending, true);
  assert.equal(running.error, null);
});

test("a new person must fit the age rule with everyone already in the photo", () => {
  const parent = { age: 42, email: "mama@example.com", confirmedGuardianEmail: null };
  const otherAdult = { age: 40, email: "tata@example.com", confirmedGuardianEmail: null };
  const child = { age: 13, email: "dete@example.com", confirmedGuardianEmail: "mama@example.com" };
  assert.equal(fitsGroup(child, [parent]), true);
  assert.equal(fitsGroup(child, [parent, otherAdult]), false);
  assert.equal(fitsGroup(otherAdult, [parent]), true);
});
