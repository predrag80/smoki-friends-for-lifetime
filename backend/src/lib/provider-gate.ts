import { getEnv } from "../config/env.js";
import { connectRedisClient } from "./redis.js";

/**
 * Shared per-minute budget for AI provider calls across all API and worker processes.
 * Without Valkey (local runs) every call is allowed.
 */
export async function acquireProviderSlot(): Promise<boolean> {
  const redis = await connectRedisClient().catch(() => null);
  if (!redis) return true;

  const key = `sffl:ai-calls:${Math.floor(Date.now() / 60000)}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 70);
  if (count > getEnv().AI_REQUESTS_PER_MINUTE) {
    await redis.decr(key);
    return false;
  }
  return true;
}
