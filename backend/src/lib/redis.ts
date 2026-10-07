import { Redis } from "ioredis";

import { getEnv } from "../config/env.js";

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  const { VALKEY_URL } = getEnv();

  if (!VALKEY_URL) {
    return null;
  }

  redisClient ??= new Redis(VALKEY_URL, {
    connectTimeout: 500,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true
  });

  return redisClient;
}

export async function connectRedisClient(): Promise<Redis | null> {
  const client = getRedisClient();

  if (client && client.status === "wait") {
    await client.connect();
  }

  return client;
}

export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit().catch(() => undefined);
    redisClient = null;
  }
}
