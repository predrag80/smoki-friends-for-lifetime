import type { MeResponse } from "@sffl/shared";
import type { Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma.js";
import { buildMeResponse } from "./me.js";

const meInclude = {
  oauthAccounts: { select: { provider: true } },
  consents: { select: { type: true, revokedAt: true } },
  guardianConsent: { select: { guardianEmail: true, confirmedAt: true } }
} satisfies Prisma.UserInclude;

export async function loadMe(userId: string): Promise<MeResponse> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: meInclude });
  return buildMeResponse(user);
}
