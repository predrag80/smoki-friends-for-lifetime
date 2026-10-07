import type { AppLocale } from "./locale";

/**
 * UI copy per locale. Final translations are client-provided; placeholders
 * are kept in Serbian until translations are delivered.
 */
const sr = {
  appName: "Smoki Friend for a Lifetime",
  tagline: "Isti ti. Različita životna doba. Smoki je uvek tu.",
  apiStatus: "Status API-ja",
  apiUnavailable: "API nije dostupan"
};

export type Messages = typeof sr;

const messagesByLocale: Record<AppLocale, Messages> = {
  sr,
  bs: { ...sr },
  hr: { ...sr },
  mk: { ...sr },
  de: { ...sr }
};

export function getMessages(locale: AppLocale): Messages {
  return messagesByLocale[locale];
}
