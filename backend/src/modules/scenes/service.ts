import { defaultLocale, type AppLocale, type Territory } from "@sffl/shared";

export type SceneTranslationRow = {
  locale: AppLocale;
  title: string;
  description: string;
};

export type SceneRow = {
  id: string;
  territory: Territory;
  sortOrder: number;
  minAge: number;
  maxAge: number;
  translations: SceneTranslationRow[];
};

export type SceneDto = {
  id: string;
  territory: Territory;
  title: string;
  description: string;
};

/** Picks the requested locale, falling back to the default (Serbian) copy. */
export function pickTranslation(
  translations: SceneTranslationRow[],
  locale: AppLocale
): SceneTranslationRow | undefined {
  return (
    translations.find((translation) => translation.locale === locale) ??
    translations.find((translation) => translation.locale === defaultLocale)
  );
}

const territoryOrder: Record<Territory, number> = {
  RELAXING: 0,
  SOCIALIZING: 1,
  SPORT_CHEERING: 2
};

export function toSceneDtos(rows: SceneRow[], locale: AppLocale): SceneDto[] {
  return [...rows]
    .sort(
      (a, b) =>
        territoryOrder[a.territory] - territoryOrder[b.territory] || a.sortOrder - b.sortOrder
    )
    .flatMap((row) => {
      const translation = pickTranslation(row.translations, locale);
      return translation
        ? [{ id: row.id, territory: row.territory, title: translation.title, description: translation.description }]
        : [];
    });
}
