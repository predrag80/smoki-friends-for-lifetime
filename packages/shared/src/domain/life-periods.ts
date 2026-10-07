/**
 * Life periods (JUČE / DANAS / JEDNOG DANA) and the age ranges the slider offers.
 * Values agreed with the client on 2026-10-07; keep them here so frontend and backend match.
 */
export const lifePeriods = ["YESTERDAY", "TODAY", "SOMEDAY"] as const;
export type LifePeriod = (typeof lifePeriods)[number];

/** Youngest age the YESTERDAY slider can go back to. */
export const MIN_SCENE_AGE = 6;
/** Oldest age the SOMEDAY slider can go forward to. */
export const MAX_SCENE_AGE = 85;
/** YESTERDAY must be at least this many years younger than today, so the difference is visible. */
export const YESTERDAY_MIN_YEARS_BACK = 5;
/** SOMEDAY must be at least this many years older than today. */
export const SOMEDAY_MIN_YEARS_AHEAD = 10;

export type AgeRange = { min: number; max: number };

export function getCurrentAge(birthYear: number, now: Date = new Date()): number {
  return now.getUTCFullYear() - birthYear;
}

/**
 * Age range offered for a period, or null when the period is not possible for this user
 * (e.g. YESTERDAY for someone who is too young to look visibly younger).
 */
export function getPeriodAgeRange(period: LifePeriod, currentAge: number): AgeRange | null {
  switch (period) {
    case "YESTERDAY": {
      const max = currentAge - YESTERDAY_MIN_YEARS_BACK;
      return max >= MIN_SCENE_AGE ? { min: MIN_SCENE_AGE, max } : null;
    }
    case "TODAY":
      return { min: currentAge, max: currentAge };
    case "SOMEDAY": {
      const min = currentAge + SOMEDAY_MIN_YEARS_AHEAD;
      return min <= MAX_SCENE_AGE ? { min, max: MAX_SCENE_AGE } : null;
    }
  }
}

export function isAgeInPeriod(period: LifePeriod, currentAge: number, targetAge: number): boolean {
  const range = getPeriodAgeRange(period, currentAge);
  return range !== null && Number.isInteger(targetAge) && targetAge >= range.min && targetAge <= range.max;
}
