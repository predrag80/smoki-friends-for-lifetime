import { retryDelayMs } from "@sffl/shared";

import { ProviderError } from "./providers/types.js";

/** Backoff for a failed attempt; quota errors wait at least as long as the provider asks, growing per attempt. */
export function nextRetryDelay(error: unknown, attempt: number): number {
  const base = retryDelayMs(attempt);
  const minimum = error instanceof ProviderError && error.retryAfterMs ? error.retryAfterMs * attempt : 0;
  return Math.max(base, minimum);
}
