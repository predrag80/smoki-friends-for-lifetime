import assert from "node:assert/strict";
import { test } from "node:test";

import { escapeHtml, guardianConsentMessage, passwordResetMessage, verifyEmailMessage } from "./emails.js";

test("untranslated locales fall back to Serbian", () => {
  const message = verifyEmailMessage("de", "a@example.com", "http://app/verify?token=x");
  assert.equal(message.subject, "Potvrdi svoju email adresu");
  assert.ok(message.text.includes("http://app/verify?token=x"));
});

test("guardian email names the masked child account and escapes HTML", () => {
  const message = guardianConsentMessage("sr", "r@example.com", "http://app/g?token=1&x=2", "d***@example.com");
  assert.ok(message.text.includes("d***@example.com"));
  assert.ok(message.html.includes("token=1&amp;x=2"));
});

test("escapeHtml neutralises markup", () => {
  assert.equal(escapeHtml(`<a href="x">'&'</a>`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
});

test("password reset email states how long the link is valid", () => {
  const message = passwordResetMessage("sr", "a@example.com", "http://app/reset-password?token=x", 60);
  assert.ok(message.text.includes("60 minuta"));
  assert.ok(message.text.includes("http://app/reset-password?token=x"));
});
