import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";

import { getEnv } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { closeRedisClient, getRedisClient } from "./lib/redis.js";
import { authRoutes } from "./modules/auth/routes.js";
import { guardianRoutes } from "./modules/guardian/routes.js";
import { healthRoutes } from "./modules/health/routes.js";
import { meRoutes } from "./modules/me/routes.js";
import { sceneRoutes } from "./modules/scenes/routes.js";
import { storyRoutes } from "./modules/story/routes.js";

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
  const app = Fastify({
    trustProxy: true,
    logger: {
      serializers: {
        // Query strings can contain one-time tokens; never write them to logs.
        req: (request) => ({
          method: request.method,
          url: request.url.split("?")[0],
          host: request.host,
          remoteAddress: request.ip
        })
      }
    }
  });
  app.decorateRequest("userId", null);
  const allowedOrigins = parseCorsOrigins(env.CORS_ORIGINS);

  await app.register(cookie);
  await app.register(multipart, { limits: { fileSize: env.PHOTO_MAX_BYTES, files: 1, fields: 5 } });

  await app.register(cors, {
    credentials: true,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
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
  await app.register(sceneRoutes);
  await app.register(authRoutes);
  await app.register(guardianRoutes);
  await app.register(meRoutes);
  await app.register(storyRoutes);

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
