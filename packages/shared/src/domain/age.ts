import type { MarketCode } from "./markets.js";

/** Youngest user allowed to register (agreed with the client on 2026-10-08). */
export const MIN_USER_AGE = 12;
/** Age from which marketing consent may be offered. */
export const ADULT_AGE = 18;

/**
 * Age below which a parent or guardian must approve the processing of the user's data.
 * TEMPORARY placeholder values (2026-10-08) — must be confirmed by the client's legal team
 * for every market before launch.
 */
export const digitalConsentAgeByMarket: Record<MarketCode, number> = {
  SRB: 15,
  BIH: 16,
  HRV: 16,
  MKD: 14,
  AUT: 14
};

/** Only month and year of birth are stored (data minimisation). Month is 1-12. */
export type BirthMonthYear = { month: number; year: number };

/**
 * Age in full years. The day of birth is unknown, so during the birth month we assume
 * the birthday has not happened yet. This is the conservative choice for every age gate.
 */
export function getAge(birth: BirthMonthYear, now: Date = new Date()): number {
  const years = now.getUTCFullYear() - birth.year;
  const currentMonth = now.getUTCMonth() + 1;
  return currentMonth > birth.month ? years : years - 1;
}

export function isValidBirth(birth: BirthMonthYear, now: Date = new Date()): boolean {
  const { month, year } = birth;
  if (!Number.isInteger(month) || !Number.isInteger(year) || month < 1 || month > 12) {
    return false;
  }
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  const inFuture = year > currentYear || (year === currentYear && month > currentMonth);
  return !inFuture && currentYear - year <= 120;
}

export function requiresGuardianConsent(age: number, market: MarketCode): boolean {
  return age < digitalConsentAgeByMarket[market];
}

export function canOfferMarketing(age: number): boolean {
  return age >= ADULT_AGE;
}
