import "dotenv/config";

import { createServer } from "node:http";

import { getEnv } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { closeRedisClient, connectRedisClient } from "./lib/redis.js";
import { startGenerationWorker } from "./modules/generation/worker-loop.js";

const logger = {
  info: (payload: object, message?: string) => console.log(message ?? "", JSON.stringify(payload)),
  error: (payload: object, message?: string) => console.error(message ?? "", payload)
};

/** Background worker: AI photo jobs (video and final film come later) and account purging. */
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

  const stopGeneration = startGenerationWorker(logger);

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
    await stopGeneration();
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
