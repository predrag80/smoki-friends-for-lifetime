import { z } from "zod";

const emptyAsUndefined = (value: unknown) =>
  value === "" || value === null ? undefined : value;

const optionalString = z.preprocess(emptyAsUndefined, z.string().min(1).optional());

const booleanFromEnv = (defaultValue: boolean) =>
  z.preprocess((value) => {
    const normalized = emptyAsUndefined(value);
    if (normalized === undefined) return defaultValue;
    if (typeof normalized === "string") return normalized.trim().toLowerCase() === "true";
    return normalized;
  }, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PROCESS_ROLE: z.enum(["api", "worker", "all"]).default("api"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(4100),
  WORKER_HEALTH_PORT: z.coerce.number().int().positive().default(4101),

  APP_URL: z.string().url().default("http://app.smoki.local"),
  API_URL: z.string().url().default("http://api.smoki.local"),
  CORS_ORIGINS: optionalString,

  DATABASE_URL: z.string().min(1),
  VALKEY_URL: optionalString,

  SESSION_COOKIE_NAME: z.string().default("sffl_session"),
  SESSION_COOKIE_DOMAIN: optionalString,
  SESSION_COOKIE_SECURE: booleanFromEnv(false),
  SESSION_COOKIE_SAME_SITE: z.enum(["Lax", "Strict", "None"]).default("Lax"),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(7),

  STORAGE_ENDPOINT: optionalString,
  STORAGE_REGION: z.string().default("us-east-1"),
  STORAGE_BUCKET: optionalString,
  STORAGE_ACCESS_KEY_ID: optionalString,
  STORAGE_SECRET_ACCESS_KEY: optionalString,
  STORAGE_FORCE_PATH_STYLE: booleanFromEnv(false),

  GEMINI_API_KEY: optionalString
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }

  if (result.data.NODE_ENV === "production" && !result.data.CORS_ORIGINS) {
    throw new Error("CORS_ORIGINS must be set in production.");
  }

  return result.data;
}

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  cachedEnv ??= parseEnv(process.env);
  return cachedEnv;
}
