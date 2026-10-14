import assert from "node:assert/strict";
import { test } from "node:test";

import { inviteAcceptedMessage, sharedInviteMessage, sharedPhotoReadyMessage, sharedWhen } from "./emails.js";

test("the invite names the sender, the scene and how long the link is valid", () => {
  const message = sharedInviteMessage("sr", "friend@example.com", "http://app/invite?token=x", {
    from: "@marko",
    scene: "Filmsko veče",
    hours: 48,
    period: "TODAY",
    yearsOffset: 0
  });
  assert.equal(message.to, "friend@example.com");
  assert.equal(message.subject, "@marko te zove na zajedničku fotografiju");
  assert.ok(message.text.includes("„Filmsko veče”"));
  assert.ok(message.text.includes("48 sati"));
  assert.ok(message.text.includes("http://app/invite?token=x"));
});

test("names are escaped in the HTML part", () => {
  const message = inviteAcceptedMessage("sr", "owner@example.com", "http://app/story", "<b>x</b>");
  assert.ok(message.html.includes("&lt;b&gt;x&lt;/b&gt;"));
  assert.ok(!message.html.includes("<b>x</b>"));
});

test("photo ready falls back to Serbian", () => {
  const message = sharedPhotoReadyMessage("de", "a@example.com", "http://app/story", "Utakmica");
  assert.equal(message.subject, "Zajednička fotografija je gotova");
  assert.ok(message.text.includes("„Utakmica”"));
});

test("the invite says how far back or ahead the photo is", () => {
  assert.equal(sharedWhen("YESTERDAY", -20), ", kakvi ste bili pre 20 godina");
  assert.equal(sharedWhen("SOMEDAY", 15), ", kakvi ćete biti za 15 godina");
  assert.equal(sharedWhen("TODAY", 0), "");
});
