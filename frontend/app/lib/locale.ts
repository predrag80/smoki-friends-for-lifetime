import { appLocales, defaultLocale, type AppLocale } from "@sffl/shared";

export { appLocales, defaultLocale, type AppLocale };

export const LOCALE_COOKIE_NAME = "sffl_locale";

const htmlLangByLocale: Record<AppLocale, string> = {
  sr: "sr-Latn",
  bs: "bs",
  hr: "hr",
  mk: "mk",
  de: "de-AT"
};

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (appLocales as readonly string[]).includes(value);
}

export function resolveLocale(value: unknown): AppLocale {
  return isAppLocale(value) ? value : defaultLocale;
}

export function localeToHtmlLang(locale: AppLocale): string {
  return htmlLangByLocale[locale];
}
