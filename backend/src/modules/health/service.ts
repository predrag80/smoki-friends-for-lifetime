import type { HealthResponse } from "@sffl/shared";

export type HealthCheck = () => Promise<void>;

export type HealthDependencies = {
  service: string;
  checkDatabase: HealthCheck;
  checkRedis: HealthCheck | null;
  now?: () => Date;
};

async function runCheck(check: HealthCheck): Promise<"ok" | "error"> {
  try {
    await check();
    return "ok";
  } catch {
    return "error";
  }
}

export async function getHealth(deps: HealthDependencies): Promise<HealthResponse> {
  const [database, redis] = await Promise.all([
    runCheck(deps.checkDatabase),
    deps.checkRedis ? runCheck(deps.checkRedis) : Promise.resolve("disabled" as const)
  ]);

  return {
    status: database === "ok" && redis !== "error" ? "ok" : "degraded",
    service: deps.service,
    checks: { database, redis },
    timestamp: (deps.now?.() ?? new Date()).toISOString()
  };
}
