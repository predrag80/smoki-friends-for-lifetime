import type { FastifyReply, FastifyRequest } from "fastify";

import { getEnv } from "../../config/env.js";
import { generateToken, hashToken } from "../../lib/crypto.js";
import { prisma } from "../../lib/prisma.js";

const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export type RequestMeta = { ipAddress?: string; userAgent?: string };

export function getRequestMeta(request: FastifyRequest): RequestMeta {
  const userAgent = request.headers["user-agent"];
  return { ipAddress: request.ip, userAgent: userAgent ? userAgent.slice(0, 500) : undefined };
}

export async function createSession(userId: string, meta: RequestMeta) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + getEnv().SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt, ipAddress: meta.ipAddress, userAgent: meta.userAgent }
  });
  return { token, expiresAt };
}

/** Returns the user id for a valid, unexpired session of an active account. */
export async function getSessionUserId(token: string): Promise<string | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      revokedAt: true,
      lastSeenAt: true,
      user: { select: { deletedAt: true } }
    }
  });

  const now = Date.now();
  if (!session || session.revokedAt || session.expiresAt.getTime() <= now || session.user.deletedAt) {
    return null;
  }

  if (now - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    void prisma.session
      .update({ where: { id: session.id }, data: { lastSeenAt: new Date(now) } })
      .catch(() => undefined);
  }

  return session.userId;
}

export async function revokeSession(token: string): Promise<void> {
  await prisma.session.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() }
  });
}

/** Ends every session of a user, e.g. after a password change. */
export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
}

function cookieOptions() {
  const env = getEnv();
  return {
    httpOnly: true,
    secure: env.SESSION_COOKIE_SECURE,
    sameSite: env.SESSION_COOKIE_SAME_SITE.toLowerCase() as "lax" | "strict" | "none",
    domain: env.SESSION_COOKIE_DOMAIN,
    path: "/"
  };
}

export function readSessionToken(request: FastifyRequest): string | undefined {
  return request.cookies[getEnv().SESSION_COOKIE_NAME];
}

export function setSessionCookie(reply: FastifyReply, token: string, expiresAt: Date): void {
  reply.setCookie(getEnv().SESSION_COOKIE_NAME, token, { ...cookieOptions(), expires: expiresAt });
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(getEnv().SESSION_COOKIE_NAME, cookieOptions());
}

export async function startSession(reply: FastifyReply, userId: string, meta: RequestMeta): Promise<void> {
  const { token, expiresAt } = await createSession(userId, meta);
  setSessionCookie(reply, token, expiresAt);
}
