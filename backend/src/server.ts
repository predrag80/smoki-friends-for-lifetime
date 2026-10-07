import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";

import { getEnv } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { closeRedisClient, getRedisClient } from "./lib/redis.js";
import { healthRoutes } from "./modules/health/routes.js";

function parseCorsOrigins(value?: string): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  );
}

export async function buildServer() {
  const env = getEnv();
  const app = Fastify({ logger: true, trustProxy: true });
  const allowedOrigins = parseCorsOrigins(env.CORS_ORIGINS);

  await app.register(cors, {
    credentials: true,
    origin: (origin, callback) => {
      // Same-origin and server-to-server requests have no Origin header.
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    }
  });

  const redis = getRedisClient();
  await app.register(rateLimit, {
    global: true,
    max: 200,
    timeWindow: 60 * 1000,
    redis: redis ?? undefined,
    skipOnError: Boolean(redis),
    nameSpace: "sffl-rate-limit-"
  });

  await app.register(healthRoutes);

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
    await closeRedisClient();
  });

  return app;
}

export async function startServer() {
  const env = getEnv();
  const app = await buildServer();

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, "Shutting down API");
    await app.close();
    process.exit(0);
  };
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));

  await app.listen({ host: env.HOST, port: env.PORT });
}
