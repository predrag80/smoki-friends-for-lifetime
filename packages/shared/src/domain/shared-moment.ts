import { ADULT_AGE } from "./age.js";
import { getSceneAgeRange, lifePeriods, MAX_SCENE_AGE, MIN_SCENE_AGE, pickRandomAge, type LifePeriod } from "./life-periods.js";

/** "Zajednički trenutak": one shared photo per user with up to three invited friends. */
export const MAX_SHARED_FRIENDS = 3;
export const DEFAULT_INVITE_TTL_HOURS = 48;
export const INVITES_PER_DAY = 10;
/** Manual regenerations of the shared photo per rolling 24 h (acceptances regenerate automatically). */
export const SHARED_GENERATIONS_PER_DAY = 3;

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$/;
const RESERVED_USERNAMES = new Set([
  "admin", "administrator", "root", "system", "support", "help", "smoki", "stark", "moderator", "official", "api", "app",
  "null", "undefined", "me", "you", "info", "kontakt", "contact"
]);

export type UsernameIssue = "TOO_SHORT" | "TOO_LONG" | "INVALID_CHARACTERS" | "RESERVED";

/** Usernames are stored lowercase without a leading "@". */
export function normalizeUsername(value: string): string {
  return value.trim().replace(/^@+/, "").toLowerCase();
}

/** Letters a–z, digits, dot and underscore; must start and end with a letter or digit; no "..". */
export function checkUsername(value: string): UsernameIssue | null {
  const username = normalizeUsername(value);
  if (username.length < USERNAME_MIN_LENGTH) return "TOO_SHORT";
  if (username.length > USERNAME_MAX_LENGTH) return "TOO_LONG";
  if (!USERNAME_PATTERN.test(username) || /[._]{2}/.test(username)) return "INVALID_CHARACTERS";
  if (RESERVED_USERNAMES.has(username)) return "RESERVED";
  return null;
}

/** The shared moment unlocks once every life period has a photo. */
export function isSharedMomentUnlocked(periodsWithPhoto: number): boolean {
  return periodsWithPhoto >= lifePeriods.length;
}

export type SharingPerson = {
  age: number;
  email: string;
  /** Guardian email confirmed for this person's account (minors only), lowercase. */
  confirmedGuardianEmail: string | null;
};

/**
 * Adults with adults and minors with minors may share a photo. An adult and a minor only when the adult is the
 * minor's confirmed parent or guardian (same email as the guardian who confirmed the minor's account).
 */
export function canShareMoment(a: SharingPerson, b: SharingPerson): boolean {
  const aAdult = a.age >= ADULT_AGE;
  const bAdult = b.age >= ADULT_AGE;
  if (aAdult === bAdult) return true;
  const adult = aAdult ? a : b;
  const minor = aAdult ? b : a;
  return minor.confirmedGuardianEmail !== null && minor.confirmedGuardianEmail === adult.email.trim().toLowerCase();
}

type SceneAges = { minAge: number; maxAge: number };

/**
 * Years everyone in a shared photo is moved by: 0 for TODAY; for YESTERDAY and SOMEDAY a random age of the owner
 * inside the period and scene, so everyone appears as they were (or will be) in the same calendar year.
 * Null when the scene does not fit the owner in this period.
 */
export function chooseSharedYearsOffset(
  period: LifePeriod,
  ownerAge: number,
  scene: SceneAges,
  random: () => number = Math.random
): number | null {
  const range = getSceneAgeRange(period, ownerAge, scene);
  if (!range) return null;
  return period === "TODAY" ? 0 : pickRandomAge(range, random) - ownerAge;
}

/** Age a person has on the shared photo. */
export function sharedTargetAge(currentAge: number, yearsOffset: number): number {
  return currentAge + yearsOffset;
}

/** A person fits the shared photo when their age on it is possible at all and allowed by the scene. */
export function fitsSharedPhotoAge(currentAge: number, yearsOffset: number, scene: SceneAges): boolean {
  const age = sharedTargetAge(currentAge, yearsOffset);
  return age >= MIN_SCENE_AGE && age <= MAX_SCENE_AGE && age >= scene.minAge && age <= scene.maxAge;
}
