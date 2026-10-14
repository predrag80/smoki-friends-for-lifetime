/**
 * Life periods (JUČE / DANAS / JEDNOG DANA) and the age ranges the slider offers.
 * Values agreed with the client on 2026-10-07; keep them here so frontend and backend match.
 */
export const lifePeriods = ["YESTERDAY", "TODAY", "SOMEDAY"] as const;
export type LifePeriod = (typeof lifePeriods)[number];

/** Youngest age a YESTERDAY moment can show. */
export const MIN_SCENE_AGE = 6;
/** Oldest age a YESTERDAY moment can show (childhood, school and student years). */
export const YESTERDAY_MAX_AGE = 23;
/** Oldest age a SOMEDAY moment can show. */
export const MAX_SCENE_AGE = 85;
/** YESTERDAY must be at least this many years younger than today, so the difference is visible. */
export const YESTERDAY_MIN_YEARS_BACK = 5;
/** SOMEDAY is between these many years older than today. */
export const SOMEDAY_MIN_YEARS_AHEAD = 10;
export const SOMEDAY_MAX_YEARS_AHEAD = 30;

export type AgeRange = { min: number; max: number };

/**
 * Ages a period can show for this user (the app picks one at random; agreed 2026-10-14), or null when the period
 * is not possible (e.g. YESTERDAY for someone who is too young to look visibly younger).
 */
export function getPeriodAgeRange(period: LifePeriod, currentAge: number): AgeRange | null {
  switch (period) {
    case "YESTERDAY": {
      const max = Math.min(YESTERDAY_MAX_AGE, currentAge - YESTERDAY_MIN_YEARS_BACK);
      return max >= MIN_SCENE_AGE ? { min: MIN_SCENE_AGE, max } : null;
    }
    case "TODAY":
      return { min: currentAge, max: currentAge };
    case "SOMEDAY": {
      const min = currentAge + SOMEDAY_MIN_YEARS_AHEAD;
      return min <= MAX_SCENE_AGE ? { min, max: Math.min(MAX_SCENE_AGE, currentAge + SOMEDAY_MAX_YEARS_AHEAD) } : null;
    }
  }
}

/** Ages that fit both the period and the scene, or null when the scene cannot be used for this period. */
export function getSceneAgeRange(
  period: LifePeriod,
  currentAge: number,
  scene: { minAge: number; maxAge: number }
): AgeRange | null {
  const range = getPeriodAgeRange(period, currentAge);
  if (!range) return null;
  const min = Math.max(range.min, scene.minAge);
  const max = Math.min(range.max, scene.maxAge);
  return min <= max ? { min, max } : null;
}

/** Random whole age in the range (inclusive). `random` returns a number in [0, 1). */
export function pickRandomAge(range: AgeRange, random: () => number = Math.random): number {
  return range.min + Math.floor(random() * (range.max - range.min + 1));
}

export function isAgeInPeriod(period: LifePeriod, currentAge: number, targetAge: number): boolean {
  const range = getPeriodAgeRange(period, currentAge);
  return range !== null && Number.isInteger(targetAge) && targetAge >= range.min && targetAge <= range.max;
}
