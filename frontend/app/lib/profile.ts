import {
  canOfferMarketing,
  digitalConsentAgeByMarket,
  getAge,
  isValidBirth,
  isValidEmail,
  MIN_USER_AGE,
  requiresGuardianConsent,
  type AppLocale,
  type MarketCode
} from "@sffl/shared";

/** Registration profile state and validation, shared by the email and Google sign-up forms. */

export type ProfileState = {
  birthMonth: string;
  birthYear: string;
  market: MarketCode | "";
  guardianEmail: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  marketingOptIn: boolean;
};

export const emptyProfile: ProfileState = {
  birthMonth: "",
  birthYear: "",
  market: "",
  guardianEmail: "",
  acceptTerms: false,
  acceptPrivacy: false,
  marketingOptIn: false
};

export type DerivedProfile = {
  age: number | null;
  underAge: boolean;
  guardianRequired: boolean;
  consentAge: number | null;
  marketingAllowed: boolean;
};

/** Same rules as the backend (shared package), so the form reacts while the user types. */
export function deriveProfile(state: ProfileState, now: Date = new Date()): DerivedProfile {
  const birth = { month: Number(state.birthMonth), year: Number(state.birthYear) };
  const age = state.birthMonth && state.birthYear && isValidBirth(birth, now) ? getAge(birth, now) : null;
  const market = state.market || null;

  return {
    age,
    underAge: age !== null && age < MIN_USER_AGE,
    guardianRequired: age !== null && market !== null && age >= MIN_USER_AGE && requiresGuardianConsent(age, market),
    consentAge: market ? digitalConsentAgeByMarket[market] : null,
    marketingAllowed: age !== null && canOfferMarketing(age)
  };
}

/** Inline errors per field; values are keys of messages.errors. */
export type ProfileErrors = Partial<Record<"birth" | "market" | "guardianEmail" | "accept", string>>;

/** Mirrors the API checks (zod contract + evaluateRegistration) so most errors never reach the server. */
export function validateProfile(state: ProfileState, derived: DerivedProfile, userEmail?: string): ProfileErrors {
  const errors: ProfileErrors = {};

  if (!state.birthMonth || !state.birthYear) errors.birth = "birthRequired";
  else if (derived.age === null) errors.birth = "INVALID_BIRTH_DATE";
  else if (derived.underAge) errors.birth = "UNDER_MIN_AGE";

  if (!state.market) errors.market = "marketRequired";

  if (derived.guardianRequired) {
    const guardianEmail = state.guardianEmail.trim().toLowerCase();
    if (!guardianEmail) errors.guardianEmail = "GUARDIAN_EMAIL_REQUIRED";
    else if (!isValidEmail(guardianEmail)) errors.guardianEmail = "guardianEmailInvalid";
    else if (userEmail && guardianEmail === userEmail.trim().toLowerCase()) {
      errors.guardianEmail = "GUARDIAN_EMAIL_SAME_AS_USER";
    }
  }

  if (!state.acceptTerms || !state.acceptPrivacy) errors.accept = "acceptRequired";

  return errors;
}

/** Server error codes that belong to a profile field. */
export const profileFieldByServerError: Record<string, keyof ProfileErrors> = {
  INVALID_BIRTH_DATE: "birth",
  UNDER_MIN_AGE: "birth",
  GUARDIAN_EMAIL_REQUIRED: "guardianEmail",
  GUARDIAN_EMAIL_SAME_AS_USER: "guardianEmail"
};

export function toProfilePayload(state: ProfileState, derived: DerivedProfile, locale: AppLocale) {
  return {
    birthMonth: Number(state.birthMonth),
    birthYear: Number(state.birthYear),
    market: state.market as MarketCode,
    locale,
    acceptTerms: true as const,
    acceptPrivacy: true as const,
    marketingOptIn: derived.marketingAllowed && state.marketingOptIn,
    guardianEmail: derived.guardianRequired ? state.guardianEmail.trim() : undefined
  };
}
