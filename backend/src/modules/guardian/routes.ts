import { guardianConfirmRequestSchema, maskEmail, tokenRequestSchema } from "@sffl/shared";
import type { FastifyInstance } from "fastify";

import { hashToken } from "../../lib/crypto.js";
import { prisma } from "../../lib/prisma.js";
import { getRequestMeta } from "../auth/session.js";

const strictRateLimit = { rateLimit: { max: 10, timeWindow: "1 minute" } };

/** Public endpoints opened from the link in the guardian's email (token in body, never in the URL log). */
export async function guardianRoutes(app: FastifyInstance) {
  app.post("/guardian-consent/lookup", { config: strictRateLimit }, async (request, reply) => {
    const parsed = tokenRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_BODY", issues: parsed.error.issues });

    const consent = await prisma.guardianConsent.findUnique({
      where: { tokenHash: hashToken(parsed.data.token) },
      select: { confirmedAt: true, expiresAt: true, user: { select: { email: true, deletedAt: true } } }
    });
    if (!consent || consent.user.deletedAt) return reply.code(404).send({ error: "INVALID_TOKEN" });

    return reply.send({
      childEmail: maskEmail(consent.user.email),
      status: consent.confirmedAt ? "CONFIRMED" : "PENDING",
      expired: !consent.confirmedAt && consent.expiresAt.getTime() <= Date.now()
    });
  });

  app.post("/guardian-consent/confirm", { config: strictRateLimit }, async (request, reply) => {
    const parsed = guardianConfirmRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_BODY", issues: parsed.error.issues });

    const consent = await prisma.guardianConsent.findUnique({
      where: { tokenHash: hashToken(parsed.data.token) },
      select: { id: true, confirmedAt: true, expiresAt: true, user: { select: { deletedAt: true } } }
    });
    if (!consent || consent.user.deletedAt) return reply.code(404).send({ error: "INVALID_TOKEN" });
    if (consent.confirmedAt) return reply.send({ status: "CONFIRMED" });
    if (consent.expiresAt.getTime() <= Date.now()) return reply.code(410).send({ error: "TOKEN_EXPIRED" });

    const meta = getRequestMeta(request);
    await prisma.guardianConsent.update({
      where: { id: consent.id },
      data: { confirmedAt: new Date(), confirmedIp: meta.ipAddress, confirmedUserAgent: meta.userAgent }
    });
    return reply.send({ status: "CONFIRMED" });
  });
}
