import assert from "node:assert/strict";
import { test } from "node:test";

import {
  escapeHtml,
  guardianConsentMessage,
  parentLinkMessage,
  passwordResetMessage,
  renderEmail,
  verifyEmailMessage
} from "./emails.js";

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

test("every email carries the Smoki brand, the title and a plain-link fallback", () => {
  const message = verifyEmailMessage("sr", "a@example.com", "http://app/verify?token=x");
  assert.ok(message.html.includes(">Smoki</span>"));
  assert.ok(message.html.includes("Friend for a Lifetime"));
  assert.ok(message.html.includes("Ako dugme ne radi"));
  assert.ok(message.html.includes('lang="sr"'));
  assert.ok(message.text.includes("31. marta 2027"));
});

test("the official logo is used when configured", () => {
  const { html } = renderEmail(
    { subject: "s", heading: "h", body: "b", cta: "c", footer: "f" },
    "http://app/x",
    "b",
    { appUrl: "https://app.example", logoUrl: "https://app.example/email/smoki-logo.png" }
  );
  assert.ok(html.includes('<img src="https://app.example/email/smoki-logo.png"'));
  assert.ok(!html.includes(">Smoki</span>"));
});

test("the parent link email names the teenager", () => {
  const message = parentLinkMessage("sr", "mama@example.com", "http://app/guardian-consent?token=1", "@mladi");
  assert.equal(message.subject, "Potvrdite da ste roditelj");
  assert.ok(message.text.includes("Korisnik @mladi vas je"));
});
