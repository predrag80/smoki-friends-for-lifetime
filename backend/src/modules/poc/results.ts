import type { LifePeriod, Territory } from "@sffl/shared";

export type PocAttempt = {
  id: string;
  period: LifePeriod;
  targetAge: number;
  sceneId: string;
  sceneTitle: string;
  territory: Territory;
  status: "ok" | "blocked" | "error";
  code?: string;
  detail?: string;
  ms: number;
  attempts: number;
  imageFile?: string;
  videoFile?: string;
  prompt: string;
};

export type PocPerson = {
  name: string;
  currentAge: number;
  sourceFile?: string;
  faceCheck: "ok" | string;
  attempts: PocAttempt[];
};

export type PocRun = {
  runId: string;
  provider: string;
  imageModel: string;
  location: string;
  /** File name of the Smoki packshot sent as a reference, if any. */
  productReference?: string;
  startedAt: string;
  finishedAt?: string;
  people: PocPerson[];
};

export type PeriodStats = {
  period: LifePeriod;
  total: number;
  ok: number;
  blocked: number;
  errors: number;
  successRate: number;
  avgSeconds: number | null;
  p95Seconds: number | null;
};

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

export function periodStats(run: PocRun): PeriodStats[] {
  const periods: LifePeriod[] = ["YESTERDAY", "TODAY", "SOMEDAY"];
  const all = run.people.flatMap((person) => person.attempts);
  return periods.map((period) => {
    const items = all.filter((item) => item.period === period);
    const okTimes = items
      .filter((item) => item.status === "ok")
      .map((item) => item.ms / 1000)
      .sort((a, b) => a - b);
    const ok = okTimes.length;
    return {
      period,
      total: items.length,
      ok,
      blocked: items.filter((item) => item.status === "blocked").length,
      errors: items.filter((item) => item.status === "error").length,
      successRate: items.length ? ok / items.length : 0,
      avgSeconds: ok ? okTimes.reduce((sum, value) => sum + value, 0) / ok : null,
      p95Seconds: percentile(okTimes, 95)
    };
  });
}

/** How often each refusal/error code occurred, most frequent first. */
export function failureReasons(run: PocRun): Array<{ reason: string; count: number }> {
  const counts = new Map<string, number>();
  for (const item of run.people.flatMap((person) => person.attempts)) {
    if (item.status === "ok") continue;
    const reason = [item.code, item.detail].filter(Boolean).join(": ") || "UNKNOWN";
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  return [...counts.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
}
