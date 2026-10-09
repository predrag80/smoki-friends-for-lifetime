import { hostname } from "node:os";

import { getEnv } from "../../config/env.js";
import { acquireProviderSlot } from "../../lib/provider-gate.js";
import { claimNextJob, processPhotoJob, purgeDeletedAccounts, requeueStaleJobs } from "./jobs.js";
import { getAiProvider } from "./providers/index.js";

type Logger = { info: (obj: object, msg?: string) => void; error: (obj: object, msg?: string) => void };

/** Starts the job and housekeeping loops. Returns a function that stops them and waits for running jobs. */
export function startGenerationWorker(logger: Logger): () => Promise<void> {
  const env = getEnv();
  const workerId = `${hostname()}:${process.pid}`;
  const provider = getAiProvider();
  const running = new Set<Promise<void>>();
  let stopped = false;

  async function tick() {
    if (stopped) return;
    while (running.size < env.WORKER_CONCURRENCY) {
      if (!(await acquireProviderSlot())) break;
      const jobId = await claimNextJob(workerId);
      if (!jobId) break;
      const task = processPhotoJob(jobId, provider, logger)
        .catch((error: unknown) => logger.error({ err: error, jobId }, "Job crashed"))
        .finally(() => running.delete(task));
      running.add(task);
    }
  }

  const jobTimer = setInterval(() => {
    tick().catch((error: unknown) => logger.error({ err: error }, "Job polling failed"));
  }, env.JOB_POLL_INTERVAL_MS);

  const staleTimer = setInterval(() => {
    requeueStaleJobs()
      .then((count) => count && logger.info({ count }, "Requeued stale jobs"))
      .catch((error: unknown) => logger.error({ err: error }, "Stale job check failed"));
  }, 60 * 1000);

  const purge = () =>
    purgeDeletedAccounts(logger).catch((error: unknown) => logger.error({ err: error }, "Account purge failed"));
  void purge();
  const purgeTimer = setInterval(purge, env.ACCOUNT_PURGE_INTERVAL_MINUTES * 60 * 1000);

  logger.info({ workerId, provider: provider.name, concurrency: env.WORKER_CONCURRENCY }, "Generation worker started");

  return async () => {
    stopped = true;
    clearInterval(jobTimer);
    clearInterval(staleTimer);
    clearInterval(purgeTimer);
    await Promise.allSettled([...running]);
  };
}
