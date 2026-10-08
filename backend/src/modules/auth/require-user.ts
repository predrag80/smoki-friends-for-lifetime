import type { FastifyReply, FastifyRequest } from "fastify";

import { clearSessionCookie, getSessionUserId, readSessionToken } from "./session.js";

declare module "fastify" {
  interface FastifyRequest {
    /** Set by the requireUser preHandler. */
    userId: string | null;
  }
}

/** preHandler for routes that need a signed-in user. */
export async function requireUser(request: FastifyRequest, reply: FastifyReply) {
  const token = readSessionToken(request);
  const userId = token ? await getSessionUserId(token) : null;

  if (!userId) {
    if (token) clearSessionCookie(reply);
    return reply.code(401).send({ error: "UNAUTHENTICATED" });
  }

  request.userId = userId;
}

export function getUserId(request: FastifyRequest): string {
  if (!request.userId) {
    throw new Error("requireUser preHandler is missing on this route");
  }
  return request.userId;
}
