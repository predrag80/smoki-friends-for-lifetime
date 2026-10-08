import type { AppLocale } from "@sffl/shared";

import type { MailMessage } from "../../lib/mailer.js";

type EmailCopy = {
  subject: string;
  heading: string;
  body: string;
  cta: string;
  footer: string;
};

type LocalizedCopy = { [K in AppLocale]?: EmailCopy } & { sr: EmailCopy };

/** Serbian copy; other locales fall back to it until client translations arrive. */
const verifyEmailCopy: LocalizedCopy = {
  sr: {
    subject: "Potvrdi svoju email adresu",
    heading: "Još jedan korak do tvoje Smoki priče",
    body: "Klikni na dugme da potvrdiš email adresu. Link važi 48 sati.",
    cta: "Potvrdi email",
    footer: "Ako nisi pravio nalog, slobodno ignoriši ovu poruku."
  }
};

const guardianCopy: LocalizedCopy = {
  sr: {
    subject: "Potrebna je vaša saglasnost",
    heading: "Saglasnost roditelja ili staratelja",
    body:
      "Nalog {child} je napravljen u aplikaciji Smoki Friend for a Lifetime. " +
      "Korisnik je mlađi od uzrasta za koji zakon dozvoljava samostalnu saglasnost, " +
      "pa nam je potrebna saglasnost roditelja ili staratelja da bismo obrađivali njegove " +
      "podatke i fotografiju. Na stranici ispod možete da pročitate šta to znači i da date saglasnost.",
    cta: "Pregledaj i potvrdi",
    footer:
      "Ako ne prepoznajete ovaj nalog, ignorišite poruku. Bez vaše saglasnosti nalog ne može da postavlja fotografije."
  }
};

function pickCopy(copies: LocalizedCopy, locale: AppLocale): EmailCopy {
  return copies[locale] ?? copies.sr;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function render(copy: EmailCopy, link: string, body: string): Pick<MailMessage, "text" | "html"> {
  const text = `${copy.heading}\n\n${body}\n\n${copy.cta}: ${link}\n\n${copy.footer}`;
  const html = `<!doctype html>
<html><body style="margin:0;background:#d0232a;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fffaf3;border-radius:16px;padding:32px;">
        <tr><td style="font-size:14px;font-weight:bold;color:#d0232a;">Smoki Friend for a Lifetime</td></tr>
        <tr><td style="padding-top:16px;font-size:24px;font-weight:bold;color:#1a1a1a;">${escapeHtml(copy.heading)}</td></tr>
        <tr><td style="padding-top:12px;font-size:16px;line-height:1.5;color:#1a1a1a;">${escapeHtml(body)}</td></tr>
        <tr><td style="padding-top:24px;">
          <a href="${escapeHtml(link)}" style="display:inline-block;background:#ffd533;color:#7a1115;font-weight:bold;text-decoration:none;padding:14px 24px;border-radius:999px;">${escapeHtml(copy.cta)}</a>
        </td></tr>
        <tr><td style="padding-top:24px;font-size:13px;line-height:1.5;color:#6b4040;">${escapeHtml(copy.footer)}</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  return { text, html };
}

export function verifyEmailMessage(locale: AppLocale, to: string, link: string): MailMessage {
  const copy = pickCopy(verifyEmailCopy, locale);
  return { to, subject: copy.subject, ...render(copy, link, copy.body) };
}

export function guardianConsentMessage(
  locale: AppLocale,
  to: string,
  link: string,
  maskedChildEmail: string
): MailMessage {
  const copy = pickCopy(guardianCopy, locale);
  const body = copy.body.replace("{child}", maskedChildEmail);
  return { to, subject: copy.subject, ...render(copy, link, body) };
}
