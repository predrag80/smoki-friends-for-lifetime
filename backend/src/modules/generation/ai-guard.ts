import { GENERATION_WINDOW_MS } from "@sffl/shared";

import { getEnv } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { isDailyCapReached, isEmailAllowed, parseAllowedEmails } from "./guard.js";

export type AiGuardFailure = { status: 403 | 429; code: "AI_NOT_ALLOWED" | "AI_DAILY_CAP_REACHED" };

/** Allow-list and server-wide daily cap for real AI generation (see AI_ALLOWED_EMAILS / AI_DAILY_CAP). */
export async function aiGuard(userId: string, options: { checkCap: boolean }): Promise<AiGuardFailure | null> {
  const env = getEnv();
  const allowed = parseAllowedEmails(env.AI_ALLOWED_EMAILS);
  if (allowed.length > 0) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user || !isEmailAllowed(user.email, allowed)) return { status: 403, code: "AI_NOT_ALLOWED" };
  }
  if (options.checkCap && env.AI_DAILY_CAP > 0) {
    const generated = await prisma.generationJob.count({
      where: {
        type: { in: ["PHOTO", "SHARED_PHOTO"] },
        createdAt: { gt: new Date(Date.now() - GENERATION_WINDOW_MS) }
      }
    });
    if (isDailyCapReached(generated, env.AI_DAILY_CAP)) return { status: 429, code: "AI_DAILY_CAP_REACHED" };
  }
  return null;
}
