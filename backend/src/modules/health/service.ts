import type { HealthResponse } from "@sffl/shared";

export type HealthCheck = () => Promise<void>;

export type HealthDependencies = {
  service: string;
  checkDatabase: HealthCheck;
  checkRedis: HealthCheck | null;
  now?: () => Date;
  onCheckError?: (check: "database" | "redis", error: unknown) => void;
};

async function runCheck(
  name: "database" | "redis",
  check: HealthCheck,
  onError?: HealthDependencies["onCheckError"]
): Promise<"ok" | "error"> {
  try {
    await check();
    return "ok";
  } catch (error) {
    onError?.(name, error);
    return "error";
  }
}

export async function getHealth(deps: HealthDependencies): Promise<HealthResponse> {
  const [database, redis] = await Promise.all([
    runCheck("database", deps.checkDatabase, deps.onCheckError),
    deps.checkRedis ? runCheck("redis", deps.checkRedis, deps.onCheckError) : Promise.resolve("disabled" as const)
  ]);

  return {
    status: database === "ok" && redis !== "error" ? "ok" : "degraded",
    service: deps.service,
    checks: { database, redis },
    timestamp: (deps.now?.() ?? new Date()).toISOString()
  };
}
