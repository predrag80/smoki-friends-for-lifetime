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

  // Email (Mailpit locally: SMTP_HOST=localhost, SMTP_PORT=1025)
  SMTP_HOST: optionalString,
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: booleanFromEnv(false),
  SMTP_USER: optionalString,
  SMTP_PASS: optionalString,
  MAIL_FROM: z.string().default("Smoki Friend for a Lifetime <no-reply@smoki.local>"),

  // Token lifetimes
  EMAIL_VERIFICATION_TTL_HOURS: z.coerce.number().int().positive().default(48),
  GUARDIAN_CONSENT_TTL_DAYS: z.coerce.number().int().positive().default(14),
  OAUTH_SIGNUP_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(60),

  // Google sign-in. Google only accepts http redirect URIs on localhost, so locally the OAuth
  // endpoints are reached through http://localhost:4100 while the session cookie is set on API_URL.
  GOOGLE_OAUTH_CLIENT_ID: optionalString,
  GOOGLE_OAUTH_CLIENT_SECRET: optionalString,
  OAUTH_PUBLIC_BASE_URL: optionalString,

  // Versions of the client-owned legal texts the user accepts
  LEGAL_TERMS_VERSION: z.string().default("draft-2026-10"),
  LEGAL_PRIVACY_VERSION: z.string().default("draft-2026-10"),
  LEGAL_PHOTO_PROCESSING_VERSION: z.string().default("draft-2026-10"),
  LEGAL_MARKETING_VERSION: z.string().default("draft-2026-10"),

  // Photos and AI generation
  PHOTO_MAX_BYTES: z.coerce.number().int().positive().default(10 * 1024 * 1024),
  PHOTO_MIN_DIMENSION: z.coerce.number().int().positive().default(512),
  GENERATIONS_PER_PERIOD_PER_DAY: z.coerce.number().int().positive().default(3),
  GENERATION_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),
  GENERATION_TIMEOUT_MS: z.coerce.number().int().positive().default(120000),
  AI_REQUESTS_PER_MINUTE: z.coerce.number().int().positive().default(30),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(2),
  JOB_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(2000),
  JOB_STALE_MINUTES: z.coerce.number().int().positive().default(15),
  ACCOUNT_PURGE_INTERVAL_MINUTES: z.coerce.number().int().positive().default(10),

  /** mock: no API calls, placeholder images; gemini: Gemini API or Vertex AI (GEMINI_USE_VERTEX). */
  AI_PROVIDER: z.enum(["mock", "gemini"]).default("mock"),
  MOCK_GENERATION_DELAY_MS: z.coerce.number().int().min(0).default(4000),
  MOCK_FAILURE_RATE: z.coerce.number().min(0).max(1).default(0),
  MOCK_FACE_CHECK: z.enum(["pass", "reject"]).default("pass"),

  GEMINI_API_KEY: optionalString,
  GEMINI_USE_VERTEX: booleanFromEnv(false),
  GOOGLE_CLOUD_PROJECT: optionalString,
  GOOGLE_CLOUD_LOCATION: z.string().default("europe-west1"),
  GEMINI_IMAGE_MODEL: z.string().default("gemini-3.1-flash-image"),
  GEMINI_CHECK_MODEL: z.string().default("gemini-2.5-flash"),
  GEMINI_IMAGE_ASPECT_RATIO: z.string().default("3:4"),
  /** Optional packshot of the real Smoki package; sent to the image model as a second reference. */
  PRODUCT_REFERENCE_IMAGE: z.string().optional()
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

/** Public base URL of the OAuth endpoints (start + callback). */
export function getOAuthBaseUrl(env: Env): string {
  return (env.OAUTH_PUBLIC_BASE_URL ?? env.API_URL).replace(/\/$/, "");
}

export function isGoogleConfigured(env: Env): boolean {
  return Boolean(env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET);
}

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  cachedEnv ??= parseEnv(process.env);
  return cachedEnv;
}
