import { maskEmail, type AppLocale, type AuthProvider, type MarketCode } from "@sffl/shared";
import { Prisma, type AuthToken, type AuthTokenPurpose } from "@prisma/client";

import { getEnv } from "../../config/env.js";
import { generateToken, hashToken } from "../../lib/crypto.js";
import { sendMail } from "../../lib/mailer.js";
import { prisma } from "../../lib/prisma.js";
import { guardianConsentMessage, passwordChangedMessage, passwordResetMessage, verifyEmailMessage } from "./emails.js";
import type { RequestMeta } from "./session.js";

type Logger = { info: (obj: object, msg?: string) => void; error: (obj: object, msg?: string) => void };

const DAY_MS = 24 * 60 * 60 * 1000;

export class EmailTakenError extends Error {
  constructor() {
    super("EMAIL_TAKEN");
  }
}

export type NewAccountInput = {
  email: string;
  passwordHash: string | null;
  emailVerified: boolean;
  birthMonth: number;
  birthYear: number;
  market: MarketCode;
  locale: AppLocale;
  marketing: boolean;
  guardianEmail: string | null;
  oauth?: { provider: AuthProvider; providerAccountId: string };
  meta: RequestMeta;
};

/** Creates the user with terms/privacy (and optional marketing) consents and a pending guardian consent. */
export async function createAccount(input: NewAccountInput): Promise<{ userId: string; guardianToken: string | null }> {
  const env = getEnv();
  const guardianToken = input.guardianEmail ? generateToken() : null;
  const consentMeta = { ipAddress: input.meta.ipAddress, userAgent: input.meta.userAgent };

  try {
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        emailVerifiedAt: input.emailVerified ? new Date() : null,
        birthMonth: input.birthMonth,
        birthYear: input.birthYear,
        market: input.market,
        locale: input.locale,
        consents: {
          create: [
            { type: "TERMS", version: env.LEGAL_TERMS_VERSION, ...consentMeta },
            { type: "PRIVACY", version: env.LEGAL_PRIVACY_VERSION, ...consentMeta },
            ...(input.marketing
              ? [{ type: "MARKETING" as const, version: env.LEGAL_MARKETING_VERSION, ...consentMeta }]
              : [])
          ]
        },
        oauthAccounts: input.oauth ? { create: input.oauth } : undefined,
        guardianConsent:
          input.guardianEmail && guardianToken
            ? {
                create: {
                  guardianEmail: input.guardianEmail,
                  tokenHash: hashToken(guardianToken),
                  expiresAt: new Date(Date.now() + env.GUARDIAN_CONSENT_TTL_DAYS * DAY_MS)
                }
              }
            : undefined
      },
      select: { id: true }
    });
    return { userId: user.id, guardianToken };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new EmailTakenError();
    }
    throw error;
  }
}

export async function issueAuthToken(
  purpose: AuthTokenPurpose,
  options: { userId?: string; payload?: Prisma.InputJsonValue; ttlMs: number }
): Promise<string> {
  const token = generateToken();
  await prisma.authToken.create({
    data: {
      purpose,
      tokenHash: hashToken(token),
      userId: options.userId,
      payload: options.payload,
      expiresAt: new Date(Date.now() + options.ttlMs)
    }
  });
  return token;
}

export type TokenLookup = { status: "valid"; token: AuthToken } | { status: "invalid" | "expired" | "used"; token?: AuthToken };

export async function findAuthToken(purpose: AuthTokenPurpose, rawToken: string): Promise<TokenLookup> {
  const token = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(rawToken) } });
  if (!token || token.purpose !== purpose) return { status: "invalid" };
  if (token.usedAt) return { status: "used", token };
  if (token.expiresAt.getTime() <= Date.now()) return { status: "expired", token };
  return { status: "valid", token };
}

/** Marks a token as used exactly once; returns false if another request used it first. */
export async function consumeAuthToken(tokenId: string): Promise<boolean> {
  const result = await prisma.authToken.updateMany({
    where: { id: tokenId, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() }
  });
  return result.count === 1;
}

export async function sendVerificationEmail(
  user: { id: string; email: string; locale: AppLocale },
  logger: Logger
): Promise<void> {
  const env = getEnv();
  await prisma.authToken.updateMany({
    where: { userId: user.id, purpose: "EMAIL_VERIFICATION", usedAt: null },
    data: { usedAt: new Date() }
  });
  const token = await issueAuthToken("EMAIL_VERIFICATION", {
    userId: user.id,
    ttlMs: env.EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000
  });
  const link = `${env.APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
  await sendMail(verifyEmailMessage(user.locale, user.email, link), logger);
}

/** Invalidates earlier reset links and emails a new one. */
export async function sendPasswordResetEmail(
  user: { id: string; email: string; locale: AppLocale },
  logger: Logger
): Promise<void> {
  const env = getEnv();
  await prisma.authToken.updateMany({
    where: { userId: user.id, purpose: "PASSWORD_RESET", usedAt: null },
    data: { usedAt: new Date() }
  });
  const token = await issueAuthToken("PASSWORD_RESET", {
    userId: user.id,
    ttlMs: env.PASSWORD_RESET_TTL_MINUTES * 60 * 1000
  });
  const link = `${env.APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
  await sendMail(passwordResetMessage(user.locale, user.email, link, env.PASSWORD_RESET_TTL_MINUTES), logger);
}

export async function sendPasswordChangedEmail(
  user: { email: string; locale: AppLocale },
  logger: Logger
): Promise<void> {
  await sendMail(passwordChangedMessage(user.locale, user.email, `${getEnv().APP_URL}/login`), logger);
}

export async function sendGuardianEmail(
  input: { guardianEmail: string; childEmail: string; locale: AppLocale; token: string },
  logger: Logger
): Promise<void> {
  const link = `${getEnv().APP_URL}/guardian-consent?token=${encodeURIComponent(input.token)}`;
  await sendMail(
    guardianConsentMessage(input.locale, input.guardianEmail, link, maskEmail(input.childEmail)),
    logger
  );
}

/** New link for the guardian (optionally to a corrected address); the old link stops working. */
export async function rotateGuardianToken(userId: string, guardianEmail?: string): Promise<{ token: string; guardianEmail: string }> {
  const token = generateToken();
  const updated = await prisma.guardianConsent.update({
    where: { userId },
    data: {
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + getEnv().GUARDIAN_CONSENT_TTL_DAYS * DAY_MS),
      sentAt: new Date(),
      ...(guardianEmail ? { guardianEmail } : {})
    },
    select: { guardianEmail: true }
  });
  return { token, guardianEmail: updated.guardianEmail };
}
