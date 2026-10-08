import { z } from "zod";

import { readinessSteps } from "../domain/account.js";
import { appLocales, marketCodes } from "../domain/markets.js";
import { PASSWORD_MAX_LENGTH } from "../domain/password.js";

export const consentTypes = ["TERMS", "PRIVACY", "PHOTO_PROCESSING", "MARKETING"] as const;
export type ConsentType = (typeof consentTypes)[number];

/** Consents the user can change from their account (terms and privacy end with account deletion). */
export const userManagedConsentTypes = ["PHOTO_PROCESSING", "MARKETING"] as const;

export const authProviders = ["GOOGLE"] as const;
export type AuthProvider = (typeof authProviders)[number];

/** Trims and lowercases before validating, so " Ana@Mail.com " is accepted as "ana@mail.com". */
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));

export function isValidEmail(value: string): boolean {
  return emailSchema.safeParse(value).success;
}

/** Length bounds only; strength rules are checked with checkPasswordStrength (422 WEAK_PASSWORD). */
const passwordSchema = z.string().min(1).max(PASSWORD_MAX_LENGTH);

/** Profile data collected at registration, for both email/password and Google sign-up. */
export const profileFieldsSchema = z.object({
  birthMonth: z.number().int().min(1).max(12),
  birthYear: z.number().int().min(1900).max(2100),
  market: z.enum(marketCodes),
  locale: z.enum(appLocales),
  acceptTerms: z.literal(true),
  acceptPrivacy: z.literal(true),
  marketingOptIn: z.boolean().default(false),
  guardianEmail: emailSchema.optional()
});

export const registerRequestSchema = profileFieldsSchema.extend({
  email: emailSchema,
  password: passwordSchema
});
export type RegisterRequest = z.input<typeof registerRequestSchema>;

export const completeOAuthSignupRequestSchema = profileFieldsSchema.extend({
  token: z.string().min(20).max(200)
});
export type CompleteOAuthSignupRequest = z.input<typeof completeOAuthSignupRequestSchema>;

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200)
});
export type LoginRequest = z.input<typeof loginRequestSchema>;

export const tokenRequestSchema = z.object({ token: z.string().min(20).max(200) });

export const forgotPasswordRequestSchema = z.object({ email: emailSchema });
export type ForgotPasswordRequest = z.input<typeof forgotPasswordRequestSchema>;

export const resetPasswordRequestSchema = tokenRequestSchema.extend({ password: passwordSchema });
export type ResetPasswordRequest = z.input<typeof resetPasswordRequestSchema>;

export const guardianConfirmRequestSchema = tokenRequestSchema.extend({ accept: z.literal(true) });

export const guardianResendRequestSchema = z.object({ guardianEmail: emailSchema.optional() });

export const consentUpdateRequestSchema = z.object({
  type: z.enum(userManagedConsentTypes),
  granted: z.boolean()
});

export const guardianStatuses = ["NOT_REQUIRED", "PENDING", "CONFIRMED"] as const;
export type GuardianStatus = (typeof guardianStatuses)[number];

export const meResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    birthMonth: z.number(),
    birthYear: z.number(),
    age: z.number(),
    market: z.enum(marketCodes),
    locale: z.enum(appLocales),
    emailVerified: z.boolean(),
    hasPassword: z.boolean(),
    providers: z.array(z.enum(authProviders))
  }),
  consents: z.object({
    TERMS: z.boolean(),
    PRIVACY: z.boolean(),
    PHOTO_PROCESSING: z.boolean(),
    MARKETING: z.boolean()
  }),
  guardian: z.object({
    status: z.enum(guardianStatuses),
    /** Masked guardian email, e.g. "m*****@gmail.com". */
    email: z.string().nullable()
  }),
  readiness: z.object({
    canCreate: z.boolean(),
    missing: z.array(z.enum(readinessSteps))
  })
});
export type MeResponse = z.infer<typeof meResponseSchema>;

export const authConfigResponseSchema = z.object({
  google: z.object({ enabled: z.boolean(), startUrl: z.string().nullable() })
});
export type AuthConfigResponse = z.infer<typeof authConfigResponseSchema>;

export const oauthSignupInfoResponseSchema = z.object({ email: z.string(), provider: z.enum(authProviders) });
export type OAuthSignupInfoResponse = z.infer<typeof oauthSignupInfoResponseSchema>;

export const guardianLookupResponseSchema = z.object({
  childEmail: z.string(),
  status: z.enum(["PENDING", "CONFIRMED"]),
  expired: z.boolean()
});
export type GuardianLookupResponse = z.infer<typeof guardianLookupResponseSchema>;

/** Stable error codes returned as `{ error: <code> }` by auth endpoints. */
export const authErrorCodes = [
  "INVALID_BODY",
  "INVALID_BIRTH_DATE",
  "WEAK_PASSWORD",
  "UNDER_MIN_AGE",
  "GUARDIAN_EMAIL_REQUIRED",
  "GUARDIAN_EMAIL_SAME_AS_USER",
  "EMAIL_TAKEN",
  "INVALID_CREDENTIALS",
  "UNAUTHENTICATED",
  "INVALID_TOKEN",
  "TOKEN_EXPIRED",
  "ALREADY_VERIFIED",
  "GUARDIAN_NOT_REQUIRED",
  "GUARDIAN_ALREADY_CONFIRMED",
  "MARKETING_NOT_ALLOWED",
  "GOOGLE_NOT_CONFIGURED"
] as const;
export type AuthErrorCode = (typeof authErrorCodes)[number];
