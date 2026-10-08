import {
  getAccountReadiness,
  getAge,
  maskEmail,
  requiresGuardianConsent,
  type AppLocale,
  type AuthProvider,
  type ConsentType,
  type MarketCode,
  type MeResponse
} from "@sffl/shared";

export type MeSource = {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
  passwordHash: string | null;
  birthMonth: number;
  birthYear: number;
  market: MarketCode;
  locale: AppLocale;
  oauthAccounts: { provider: AuthProvider }[];
  consents: { type: ConsentType; revokedAt: Date | null }[];
  guardianConsent: { guardianEmail: string; confirmedAt: Date | null } | null;
};

export function buildMeResponse(user: MeSource, now: Date = new Date()): MeResponse {
  const age = getAge({ month: user.birthMonth, year: user.birthYear }, now);
  const guardianRequired = requiresGuardianConsent(age, user.market);
  const guardianConfirmed = Boolean(user.guardianConsent?.confirmedAt);
  const active = new Set(user.consents.filter((consent) => !consent.revokedAt).map((consent) => consent.type));
  const emailVerified = Boolean(user.emailVerifiedAt);

  return {
    user: {
      id: user.id,
      email: user.email,
      birthMonth: user.birthMonth,
      birthYear: user.birthYear,
      age,
      market: user.market,
      locale: user.locale,
      emailVerified,
      hasPassword: Boolean(user.passwordHash),
      providers: [...new Set(user.oauthAccounts.map((account) => account.provider))]
    },
    consents: {
      TERMS: active.has("TERMS"),
      PRIVACY: active.has("PRIVACY"),
      PHOTO_PROCESSING: active.has("PHOTO_PROCESSING"),
      MARKETING: active.has("MARKETING")
    },
    guardian: {
      status: guardianRequired ? (guardianConfirmed ? "CONFIRMED" : "PENDING") : "NOT_REQUIRED",
      email: guardianRequired && user.guardianConsent ? maskEmail(user.guardianConsent.guardianEmail) : null
    },
    readiness: getAccountReadiness({
      emailVerified,
      guardianRequired,
      guardianConfirmed,
      photoConsent: active.has("PHOTO_PROCESSING")
    })
  };
}
