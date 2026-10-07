import type { FastifyInstance } from "fastify";

import { prisma } from "../../lib/prisma.js";
import { getRedisClient } from "../../lib/redis.js";
import { getHealth } from "./service.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async (_request, reply) => {
    const redis = getRedisClient();
    const health = await getHealth({
      service: "api",
      checkDatabase: async () => {
        await prisma.$queryRaw`SELECT 1`;
      },
      checkRedis: redis
        ? async () => {
            if (redis.status === "wait") await redis.connect();
            await redis.ping();
          }
        : null
    });

    return reply.code(health.status === "ok" ? 200 : 503).send(health);
  });
}
