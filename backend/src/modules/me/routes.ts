import {
  canOfferMarketing,
  consentUpdateRequestSchema,
  getAge,
  guardianResendRequestSchema,
  requiresGuardianConsent
} from "@sffl/shared";
import type { FastifyInstance } from "fastify";

import { getEnv } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { rotateGuardianToken, sendGuardianEmail } from "../auth/accounts.js";
import { loadMe } from "../auth/load-me.js";
import { getUserId, requireUser } from "../auth/require-user.js";
import { clearSessionCookie, getRequestMeta } from "../auth/session.js";

export async function meRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireUser);

  /** Grant or revoke photo-processing and marketing consent. */
  app.post("/me/consents", async (request, reply) => {
    const parsed = consentUpdateRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_BODY", issues: parsed.error.issues });

    const userId = getUserId(request);
    const { type, granted } = parsed.data;
    const env = getEnv();

    if (granted) {
      const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { birthMonth: true, birthYear: true } });
      if (type === "MARKETING" && !canOfferMarketing(getAge({ month: user.birthMonth, year: user.birthYear }))) {
        return reply.code(422).send({ error: "MARKETING_NOT_ALLOWED" });
      }

      const active = await prisma.consent.findFirst({ where: { userId, type, revokedAt: null }, select: { id: true } });
      if (!active) {
        const meta = getRequestMeta(request);
        await prisma.consent.create({
          data: {
            userId,
            type,
            version: type === "PHOTO_PROCESSING" ? env.LEGAL_PHOTO_PROCESSING_VERSION : env.LEGAL_MARKETING_VERSION,
            ipAddress: meta.ipAddress,
            userAgent: meta.userAgent
          }
        });
      }
    } else {
      await prisma.consent.updateMany({ where: { userId, type, revokedAt: null }, data: { revokedAt: new Date() } });
    }

    return reply.send(await loadMe(userId));
  });

  app.post(
    "/me/guardian-consent/resend",
    { config: { rateLimit: { max: 3, timeWindow: "10 minutes" } } },
    async (request, reply) => {
      const parsed = guardianResendRequestSchema.safeParse(request.body ?? {});
      if (!parsed.success) return reply.code(400).send({ error: "INVALID_BODY", issues: parsed.error.issues });

      const user = await prisma.user.findUniqueOrThrow({
        where: { id: getUserId(request) },
        select: { id: true, email: true, locale: true, birthMonth: true, birthYear: true, market: true, guardianConsent: true }
      });

      const age = getAge({ month: user.birthMonth, year: user.birthYear });
      if (!requiresGuardianConsent(age, user.market) || !user.guardianConsent) {
        return reply.code(409).send({ error: "GUARDIAN_NOT_REQUIRED" });
      }
      if (user.guardianConsent.confirmedAt) return reply.code(409).send({ error: "GUARDIAN_ALREADY_CONFIRMED" });
      if (parsed.data.guardianEmail === user.email) return reply.code(422).send({ error: "GUARDIAN_EMAIL_SAME_AS_USER" });

      const { token, guardianEmail } = await rotateGuardianToken(user.id, parsed.data.guardianEmail);
      await sendGuardianEmail({ guardianEmail, childEmail: user.email, locale: user.locale, token }, request.log);
      return reply.code(202).send(await loadMe(user.id));
    }
  );

  /**
   * Deletes the account: personal data is removed or anonymised immediately and all sessions end.
   * Stored photos and films are purged by the worker (generation phase) using deletedAt.
   */
  app.delete("/me", async (request, reply) => {
    const userId = getUserId(request);
    const now = new Date();

    await prisma.$transaction([
      prisma.session.deleteMany({ where: { userId } }),
      prisma.authToken.deleteMany({ where: { userId } }),
      prisma.oAuthAccount.deleteMany({ where: { userId } }),
      prisma.guardianConsent.deleteMany({ where: { userId } }),
      prisma.consent.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } }),
      prisma.user.update({
        where: { id: userId },
        data: {
          email: `deleted-${userId}@deleted.invalid`,
          passwordHash: null,
          emailVerifiedAt: null,
          deletedAt: now
        }
      })
    ]);

    clearSessionCookie(reply);
    return reply.code(204).send();
  });
}
