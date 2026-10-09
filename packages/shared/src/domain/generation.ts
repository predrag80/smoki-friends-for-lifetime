/** Defaults for photo generation; the backend can override them with environment variables. */
export const DEFAULT_GENERATIONS_PER_PERIOD_PER_DAY = 3;
export const GENERATION_WINDOW_MS = 24 * 60 * 60 * 1000;

/** How many more generations a moment may start in the rolling 24-hour window. */
export function generationsLeft(usedInWindow: number, limit = DEFAULT_GENERATIONS_PER_PERIOD_PER_DAY): number {
  return Math.max(0, limit - usedInWindow);
}

/** Exponential retry delay: 5s, 10s, 20s, ... capped at 5 minutes. */
export function retryDelayMs(attempt: number, baseMs = 5000): number {
  return Math.min(baseMs * 2 ** Math.max(0, attempt - 1), 5 * 60 * 1000);
}
