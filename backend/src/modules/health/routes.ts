import type { FastifyInstance } from "fastify";

import { prisma } from "../../lib/prisma.js";
import { getRedisClient } from "../../lib/redis.js";
import { getHealth } from "./service.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async (request, reply) => {
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
        : null,
      onCheckError: (check, error) => {
        request.log.warn({ check, err: error }, "Health check failed");
      }
    });

    return reply.code(health.status === "ok" ? 200 : 503).send(health);
  });
}
