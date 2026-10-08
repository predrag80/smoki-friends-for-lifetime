import {
  canOfferMarketing,
  getAge,
  isValidBirth,
  MIN_USER_AGE,
  requiresGuardianConsent,
  type MarketCode
} from "@sffl/shared";

export type RegistrationInput = {
  email: string;
  birthMonth: number;
  birthYear: number;
  market: MarketCode;
  marketingOptIn: boolean;
  guardianEmail?: string | undefined;
};

export type RegistrationError =
  | "INVALID_BIRTH_DATE"
  | "UNDER_MIN_AGE"
  | "GUARDIAN_EMAIL_REQUIRED"
  | "GUARDIAN_EMAIL_SAME_AS_USER";

export type RegistrationDecision =
  | { ok: true; age: number; guardianEmail: string | null; marketing: boolean }
  | { ok: false; error: RegistrationError };

/** Age gate, guardian requirement and marketing eligibility for a new account. */
export function evaluateRegistration(input: RegistrationInput, now: Date = new Date()): RegistrationDecision {
  const birth = { month: input.birthMonth, year: input.birthYear };

  if (!isValidBirth(birth, now)) {
    return { ok: false, error: "INVALID_BIRTH_DATE" };
  }

  const age = getAge(birth, now);

  if (age < MIN_USER_AGE) {
    return { ok: false, error: "UNDER_MIN_AGE" };
  }

  const guardianRequired = requiresGuardianConsent(age, input.market);

  if (guardianRequired && !input.guardianEmail) {
    return { ok: false, error: "GUARDIAN_EMAIL_REQUIRED" };
  }

  if (guardianRequired && input.guardianEmail === input.email) {
    return { ok: false, error: "GUARDIAN_EMAIL_SAME_AS_USER" };
  }

  return {
    ok: true,
    age,
    guardianEmail: guardianRequired ? (input.guardianEmail ?? null) : null,
    marketing: canOfferMarketing(age) && input.marketingOptIn
  };
}
