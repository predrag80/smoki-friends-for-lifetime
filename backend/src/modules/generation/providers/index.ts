import { getEnv } from "../../../config/env.js";
import { createGeminiProvider } from "./gemini.js";
import { createMockProvider } from "./mock.js";
import type { AiProvider } from "./types.js";

let provider: AiProvider | null = null;

/** Provider chosen by AI_PROVIDER (mock by default; no external calls). */
export function getAiProvider(): AiProvider {
  if (provider) return provider;
  const env = getEnv();

  if (env.AI_PROVIDER === "gemini") {
    if (!env.GEMINI_USE_VERTEX && !env.GEMINI_API_KEY) {
      throw new Error("AI_PROVIDER=gemini needs GEMINI_API_KEY, or GEMINI_USE_VERTEX=true with Google Cloud credentials.");
    }
    provider = createGeminiProvider(env);
  } else {
    provider = createMockProvider({
      delayMs: env.MOCK_GENERATION_DELAY_MS,
      failureRate: env.MOCK_FAILURE_RATE,
      faceCheck: env.MOCK_FACE_CHECK
    });
  }
  return provider;
}

export { ProviderError, type AiProvider } from "./types.js";
