import type { AppLocale } from "@sffl/shared";

import type { MailMessage } from "../../lib/mailer.js";

export type EmailCopy = {
  subject: string;
  heading: string;
  body: string;
  cta: string;
  footer: string;
};

export type LocalizedCopy = { [K in AppLocale]?: EmailCopy } & { sr: EmailCopy };

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

const parentLinkCopy: LocalizedCopy = {
  sr: {
    subject: "Potvrdite da ste roditelj",
    heading: "Zajedničke fotografije sa vašim detetom",
    body:
      "Korisnik {child} vas je u aplikaciji Smoki Friend for a Lifetime označio kao roditelja ili staratelja. " +
      "Kada to potvrdite, vi i vaše dete možete da budete zajedno na Smoki fotografijama, ako oboje imate nalog sa ovom email adresom. " +
      "Bez potvrde, maloletni korisnici mogu na zajedničke fotografije samo sa vršnjacima.",
    cta: "Pregledaj i potvrdi",
    footer: "Ako ne prepoznajete ovaj nalog, ignorišite poruku. Ništa se ne menja bez vaše potvrde."
  }
};

const passwordResetCopy: LocalizedCopy = {
  sr: {
    subject: "Nova lozinka",
    heading: "Postavi novu lozinku",
    body: "Neko je zatražio novu lozinku za tvoj nalog. Klikni na dugme da je postaviš. Link važi {minutes} minuta.",
    cta: "Postavi novu lozinku",
    footer: "Ako nisi ti tražio novu lozinku, ignoriši ovu poruku. Tvoja lozinka ostaje ista."
  }
};

const passwordChangedCopy: LocalizedCopy = {
  sr: {
    subject: "Lozinka je promenjena",
    heading: "Tvoja lozinka je promenjena",
    body: "Lozinka za tvoj nalog je upravo promenjena i odjavili smo te sa ostalih uređaja.",
    cta: "Prijavi se",
    footer: "Ako ovo nisi bio ti, odmah zatraži novu lozinku preko stranice za prijavu."
  }
};

export function pickCopy(copies: LocalizedCopy, locale: AppLocale): EmailCopy {
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

export type EmailBrand = {
  /** Link to the app (header logo and footer). */
  appUrl: string;
  /** Public URL of the official Smoki logo (PNG); without it the header shows the Smoki wordmark in text. */
  logoUrl?: string;
};

/** Read straight from process.env so emails can be rendered in tests without a full configuration. */
function defaultBrand(): EmailBrand {
  return {
    appUrl: (process.env.APP_URL ?? "http://app.smoki.local").replace(/\/$/, ""),
    logoUrl: process.env.EMAIL_LOGO_URL || undefined
  };
}

const CAMPAIGN = "Kampanja traje od 1. januara do 31. marta 2027.";
const AUTOMATIC = "Ovo je automatska poruka aplikacije Smoki Friend for a Lifetime. Ne odgovaraj na nju.";
const LINK_FALLBACK = "Ako dugme ne radi, kopiraj ovaj link u pregledač:";

/**
 * Branded layout shared by every email: Smoki logo (or wordmark) and the "Friend for a Lifetime" title on red,
 * the message on a light card, a button with a plain-link fallback, and a footer about the campaign.
 * Table layout and inline styles so it renders the same in Gmail, Outlook and phone mail apps.
 */
export function renderEmail(
  copy: EmailCopy,
  link: string,
  body: string,
  brand: EmailBrand = defaultBrand()
): Pick<MailMessage, "text" | "html"> {
  const text = [
    "SMOKI · Friend for a Lifetime",
    "",
    copy.heading,
    "",
    body,
    "",
    `${copy.cta}: ${link}`,
    "",
    copy.footer,
    "",
    "—",
    CAMPAIGN,
    AUTOMATIC,
    brand.appUrl
  ].join("\n");

  const logo = brand.logoUrl
    ? `<img src="${escapeHtml(brand.logoUrl)}" width="160" alt="Smoki" style="display:block;border:0;width:160px;max-width:160px;height:auto;margin:0 auto;">`
    : `<span style="font-family:'Arial Black',Arial,Helvetica,sans-serif;font-size:44px;line-height:1;font-weight:900;font-style:italic;letter-spacing:-1px;color:#ffffff;text-shadow:2px 2px 0 #7a1115;">Smoki</span>`;

  const html = `<!doctype html>
<html lang="sr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light only">
  <title>${escapeHtml(copy.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#d0232a;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#d0232a;">${escapeHtml(body)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#d0232a;">
    <tr><td align="center" style="padding:32px 16px 24px;">
      <a href="${escapeHtml(brand.appUrl)}" style="text-decoration:none;">${logo}</a>
      <div style="padding-top:10px;font-size:14px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;color:#ffd533;">Friend for a Lifetime</div>
    </td></tr>
    <tr><td align="center" style="padding:0 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fffaf3;border-radius:16px;">
        <tr><td style="height:8px;background:#ffd533;border-radius:16px 16px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:28px 32px 0;font-size:24px;line-height:1.25;font-weight:bold;color:#1a1a1a;">${escapeHtml(copy.heading)}</td></tr>
        <tr><td style="padding:12px 32px 0;font-size:16px;line-height:1.55;color:#1a1a1a;">${escapeHtml(body)}</td></tr>
        <tr><td style="padding:24px 32px 0;">
          <a href="${escapeHtml(link)}" style="display:inline-block;background:#ffd533;color:#7a1115;font-size:16px;font-weight:bold;text-decoration:none;padding:14px 28px;border-radius:999px;">${escapeHtml(copy.cta)}</a>
        </td></tr>
        <tr><td style="padding:16px 32px 0;font-size:12px;line-height:1.5;color:#6b4040;">
          ${escapeHtml(LINK_FALLBACK)}<br>
          <a href="${escapeHtml(link)}" style="color:#7a1115;word-break:break-all;">${escapeHtml(link)}</a>
        </td></tr>
        <tr><td style="padding:20px 32px 28px;font-size:13px;line-height:1.5;color:#6b4040;border-top:0;">${escapeHtml(copy.footer)}</td></tr>
      </table>
    </td></tr>
    <tr><td align="center" style="padding:24px 16px 32px;font-size:12px;line-height:1.6;color:#ffe9e9;">
      <strong style="color:#ffffff;">Smoki · Friend for a Lifetime</strong><br>
      ${escapeHtml(CAMPAIGN)}<br>
      ${escapeHtml(AUTOMATIC)}<br>
      <a href="${escapeHtml(brand.appUrl)}" style="color:#ffd533;">${escapeHtml(brand.appUrl.replace(/^https?:\/\//, ""))}</a>
    </td></tr>
  </table>
</body>
</html>`;
  return { text, html };
}

export function verifyEmailMessage(locale: AppLocale, to: string, link: string): MailMessage {
  const copy = pickCopy(verifyEmailCopy, locale);
  return { to, subject: copy.subject, ...renderEmail(copy, link, copy.body) };
}

export function guardianConsentMessage(
  locale: AppLocale,
  to: string,
  link: string,
  maskedChildEmail: string
): MailMessage {
  const copy = pickCopy(guardianCopy, locale);
  const body = copy.body.replace("{child}", maskedChildEmail);
  return { to, subject: copy.subject, ...renderEmail(copy, link, body) };
}

export function parentLinkMessage(locale: AppLocale, to: string, link: string, child: string): MailMessage {
  const copy = pickCopy(parentLinkCopy, locale);
  return { to, subject: copy.subject, ...renderEmail(copy, link, copy.body.replace("{child}", child)) };
}

export function passwordResetMessage(locale: AppLocale, to: string, link: string, minutes: number): MailMessage {
  const copy = pickCopy(passwordResetCopy, locale);
  return { to, subject: copy.subject, ...renderEmail(copy, link, copy.body.replace("{minutes}", String(minutes))) };
}

export function passwordChangedMessage(locale: AppLocale, to: string, loginLink: string): MailMessage {
  const copy = pickCopy(passwordChangedCopy, locale);
  return { to, subject: copy.subject, ...renderEmail(copy, loginLink, copy.body) };
}
