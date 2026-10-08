import { z } from "zod";

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
