import "dotenv/config";

import { createServer } from "node:http";

import { getEnv } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { closeRedisClient, connectRedisClient } from "./lib/redis.js";

/**
 * Background worker for long-running jobs (AI photo, AI video, final film montage).
 * Job processors are registered in the generation phase; for now the worker only
 * verifies its dependencies and exposes a health endpoint.
 */
async function start() {
  const env = getEnv();

  if (env.PROCESS_ROLE === "api") {
    throw new Error("Worker entrypoint cannot run with PROCESS_ROLE=api.");
  }

  await prisma.$connect();
  const redis = await connectRedisClient();

  if (env.NODE_ENV === "production" && !redis) {
    throw new Error("VALKEY_URL must be set for production workers.");
  }

  await redis?.ping();

  const healthServer = createServer((request, response) => {
    if (request.url === "/health") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ status: "ok", service: "worker" }));
      return;
    }
    response.writeHead(404).end();
  });

  healthServer.listen(env.WORKER_HEALTH_PORT, () => {
    console.log(`Worker running, health on :${env.WORKER_HEALTH_PORT}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`Worker shutting down (${signal})`);
    healthServer.close();
    await prisma.$disconnect();
    await closeRedisClient();
    process.exit(0);
  };
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

start().catch((error) => {
  console.error("Worker failed to start", error);
  process.exit(1);
});
