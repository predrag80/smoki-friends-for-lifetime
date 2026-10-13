import type { AppLocale } from "@sffl/shared";

import type { MailMessage } from "../../lib/mailer.js";
import { pickCopy, renderEmail, type LocalizedCopy } from "../auth/emails.js";

/** Serbian copy; other locales fall back to it until client translations arrive. */
const inviteCopy: LocalizedCopy = {
  sr: {
    subject: "{from} te zove na zajedničku fotografiju",
    heading: "Poziv na Zajednički trenutak",
    body:
      "{from} pravi zajedničku Smoki fotografiju u sceni „{scene}” i želi da budeš na njoj. " +
      "Kad prihvatiš poziv, tvoja profilna fotografija se koristi da te AI smesti na tu sliku. Link važi {hours} sati.",
    cta: "Pogledaj poziv",
    footer: "Ako ne poznaješ pošiljaoca, slobodno ignoriši ovu poruku. Bez tvog prihvatanja nećeš biti na fotografiji."
  }
};

const acceptedCopy: LocalizedCopy = {
  sr: {
    subject: "{friend} je prihvatio tvoj poziv",
    heading: "Prijatelj je u igri",
    body: "{friend} je prihvatio poziv za tvoj Zajednički trenutak. Pravimo novu fotografiju sa svima koji su prihvatili poziv.",
    cta: "Otvori moju priču",
    footer: "Javićemo ti kad fotografija bude gotova."
  }
};

const photoReadyCopy: LocalizedCopy = {
  sr: {
    subject: "Zajednička fotografija je gotova",
    heading: "Vaš Zajednički trenutak je spreman",
    body: "Fotografija „{scene}” sa prijateljima je gotova. Pogledaj je u svojoj Smoki priči.",
    cta: "Pogledaj fotografiju",
    footer: "Fotografiju vide samo osobe koje su na njoj."
  }
};

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

export function sharedInviteMessage(
  locale: AppLocale,
  to: string,
  link: string,
  values: { from: string; scene: string; hours: number }
): MailMessage {
  const copy = pickCopy(inviteCopy, locale);
  const strings = { from: values.from, scene: values.scene, hours: String(values.hours) };
  return { to, subject: fill(copy.subject, strings), ...renderEmail(copy, link, fill(copy.body, strings)) };
}

export function inviteAcceptedMessage(locale: AppLocale, to: string, link: string, friend: string): MailMessage {
  const copy = pickCopy(acceptedCopy, locale);
  return { to, subject: fill(copy.subject, { friend }), ...renderEmail(copy, link, fill(copy.body, { friend })) };
}

export function sharedPhotoReadyMessage(locale: AppLocale, to: string, link: string, scene: string): MailMessage {
  const copy = pickCopy(photoReadyCopy, locale);
  return { to, subject: copy.subject, ...renderEmail(copy, link, fill(copy.body, { scene })) };
}
