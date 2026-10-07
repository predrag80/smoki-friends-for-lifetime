import { z } from "zod";

export * from "./domain/life-periods.js";
export * from "./domain/scenes.js";

/** Markets covered by the campaign. Country is stored independently of UI language. */
export const marketCodes = ["SRB", "BIH", "HRV", "MKD", "AUT"] as const;
export type MarketCode = (typeof marketCodes)[number];

/** UI languages. */
export const appLocales = ["sr", "bs", "hr", "mk", "de"] as const;
export type AppLocale = (typeof appLocales)[number];
export const defaultLocale: AppLocale = "sr";

export const healthResponseSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  service: z.string(),
  checks: z.object({
    database: z.enum(["ok", "error"]),
    redis: z.enum(["ok", "error", "disabled"])
  }),
  timestamp: z.string()
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
