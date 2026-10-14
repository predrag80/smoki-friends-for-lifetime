import { appLocales, defaultLocale, getPeriodAgeRange, lifePeriods } from "@sffl/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { prisma } from "../../lib/prisma.js";
import { toSceneDtos } from "./service.js";

const scenesQuerySchema = z.object({
  period: z.enum(lifePeriods),
  /** Optional target age; without it, every scene that fits some age of the period is listed. */
  age: z.coerce.number().int().min(0).max(120).optional(),
  /** User's current age; used to validate that the target age fits the period. */
  currentAge: z.coerce.number().int().min(0).max(120),
  locale: z.enum(appLocales).default(defaultLocale)
});

export async function sceneRoutes(app: FastifyInstance) {
  /**
   * Scenes that make sense for the selected life period and age.
   * Example: GET /scenes?period=YESTERDAY&currentAge=36&locale=sr (or with &age=12 for one age)
   */
  app.get("/scenes", async (request, reply) => {
    const parsed = scenesQuerySchema.safeParse(request.query);

    if (!parsed.success) {
      return reply.code(400).send({ error: "INVALID_QUERY", issues: parsed.error.issues });
    }

    const { period, age, currentAge, locale } = parsed.data;
    const range = getPeriodAgeRange(period, currentAge);

    if (!range) {
      return reply.code(422).send({ error: "PERIOD_NOT_AVAILABLE", period, currentAge });
    }

    if (age !== undefined && (age < range.min || age > range.max)) {
      return reply.code(422).send({ error: "AGE_OUT_OF_PERIOD_RANGE", period, range });
    }

    // With an age: scenes for that age. Without: scenes whose age range overlaps the period (the app picks the age).
    const rows = await prisma.scene.findMany({
      where: {
        isActive: true,
        minAge: { lte: age ?? range.max },
        maxAge: { gte: age ?? range.min }
      },
      include: { translations: { where: { locale: { in: [locale, defaultLocale] } } } }
    });

    return reply.send({ period, age, range, scenes: toSceneDtos(rows, locale) });
  });
}
