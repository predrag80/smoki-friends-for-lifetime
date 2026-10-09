import { ApiError, GoogleGenAI, Type } from "@google/genai";

import type { Env } from "../../../config/env.js";
import { ProviderError, type AiProvider, type FaceCheckResult } from "./types.js";

const FACE_CHECK_PROMPT =
  "You check a photo that will be used to generate realistic portraits of the same person. Be lenient: reject only clear problems. " +
  "faceCount: number of clearly visible faces in the foreground; ignore small, distant or blurred faces in the background, posters and screens. " +
  "clear: false only if the main face is so blurred, dark, tiny or turned away that its features cannot be recognised; ordinary selfies, " +
  "phone photos and imperfect light are clear. " +
  "obstructed: true only if sunglasses, a mask, a hand or an object hides the eyes or most of the face; ordinary glasses, beards, hats and hair are fine. " +
  "isPhoto: false only for drawings, cartoons, screenshots of text or heavily stylised images; photos with mild filters are photos. " +
  "Do not identify the person.";

const faceCheckSchema = {
  type: Type.OBJECT,
  properties: {
    isPhoto: { type: Type.BOOLEAN },
    faceCount: { type: Type.INTEGER },
    clear: { type: Type.BOOLEAN },
    obstructed: { type: Type.BOOLEAN }
  },
  required: ["isPhoto", "faceCount", "clear", "obstructed"]
};

type FaceCheckAnswer = { isPhoto: boolean; faceCount: number; clear: boolean; obstructed: boolean };

/** Parses the model's JSON answer; an empty or incomplete answer means the model declined to look at the photo. */
export function parseFaceCheckAnswer(text: string | undefined): FaceCheckAnswer {
  if (!text?.trim()) throw new ProviderError("FACE_CHECK_REFUSED", false, "Empty face check answer");
  let answer: Partial<FaceCheckAnswer>;
  try {
    answer = JSON.parse(text) as Partial<FaceCheckAnswer>;
  } catch {
    throw new ProviderError("FACE_CHECK_INVALID_RESPONSE", true);
  }
  if (
    typeof answer.isPhoto !== "boolean" ||
    typeof answer.faceCount !== "number" ||
    typeof answer.clear !== "boolean" ||
    typeof answer.obstructed !== "boolean"
  ) {
    throw new ProviderError("FACE_CHECK_INVALID_RESPONSE", true);
  }
  return answer as FaceCheckAnswer;
}

export function interpretFaceCheck(answer: FaceCheckAnswer): FaceCheckResult {
  if (!answer.isPhoto) return { ok: false, reason: "NOT_A_PHOTO" };
  if (answer.faceCount === 0) return { ok: false, reason: "NO_FACE" };
  if (answer.faceCount > 1) return { ok: false, reason: "MULTIPLE_FACES" };
  if (answer.obstructed) return { ok: false, reason: "FACE_OBSTRUCTED" };
  if (!answer.clear) return { ok: false, reason: "FACE_NOT_CLEAR" };
  return { ok: true };
}

const SAFETY_FINISH_REASONS = ["SAFETY", "PROHIBITED", "BLOCKLIST", "SPII", "RECITATION"];

/** Finish reasons such as IMAGE_SAFETY or PROHIBITED_CONTENT mean the provider refused the request. */
export function isSafetyStop(finishReason: string): boolean {
  return SAFETY_FINISH_REASONS.some((marker) => finishReason.includes(marker));
}

const RATE_LIMIT_WAIT_MS = 30_000;

/** Maps an HTTP status from the Gemini/Vertex API to our retry policy. */
export function classifyApiStatus(status: number): { code: string; retryable: boolean; retryAfterMs?: number } {
  if (status === 429) return { code: "RATE_LIMITED", retryable: true, retryAfterMs: RATE_LIMIT_WAIT_MS };
  if (status >= 500) return { code: "PROVIDER_UNAVAILABLE", retryable: true };
  if (status === 408) return { code: "TIMEOUT", retryable: true };
  return { code: "PROVIDER_REJECTED", retryable: false };
}

function toProviderError(error: unknown): unknown {
  if (error instanceof ApiError) {
    const { code, retryable, retryAfterMs } = classifyApiStatus(error.status);
    return new ProviderError(code, retryable, error.message.slice(0, 500), retryAfterMs);
  }
  return error;
}

async function call<T>(promise: Promise<T>, ms: number): Promise<T> {
  try {
    return await withTimeout(promise, ms);
  } catch (error) {
    throw toProviderError(error);
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new ProviderError("TIMEOUT", true)), ms))
  ]);
}

/**
 * Gemini through the Gemini API (API key) or Vertex AI (GEMINI_USE_VERTEX=true, Google Cloud credentials).
 * Images are sent inline; nothing is uploaded to the provider's file storage.
 */
export function createGeminiProvider(env: Env): AiProvider {
  const ai = env.GEMINI_USE_VERTEX
    ? new GoogleGenAI({ vertexai: true, project: env.GOOGLE_CLOUD_PROJECT, location: env.GOOGLE_CLOUD_LOCATION })
    : new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

  return {
    name: env.GEMINI_USE_VERTEX ? "vertex" : "gemini",

    async checkFace(image, mimeType) {
      const response = await call(
        ai.models.generateContent({
          model: env.GEMINI_CHECK_MODEL,
          contents: [{ inlineData: { mimeType, data: image.toString("base64") } }, { text: FACE_CHECK_PROMPT }],
          config: { responseMimeType: "application/json", responseSchema: faceCheckSchema, temperature: 0 }
        }),
        30000
      );
      if (response.promptFeedback?.blockReason) {
        throw new ProviderError("FACE_CHECK_REFUSED", false, String(response.promptFeedback.blockReason));
      }
      const finishReason = response.candidates?.[0]?.finishReason;
      if (finishReason && isSafetyStop(String(finishReason))) {
        throw new ProviderError("FACE_CHECK_REFUSED", false, String(finishReason));
      }
      return interpretFaceCheck(parseFaceCheckAnswer(response.text));
    },

    async generatePhoto(input) {
      const response = await call(
        ai.models.generateContent({
          model: env.GEMINI_IMAGE_MODEL,
          contents: [
            { inlineData: { mimeType: input.sourceMimeType, data: input.sourceImage.toString("base64") } },
            ...(input.productImage
              ? [{ inlineData: { mimeType: input.productImage.mimeType, data: input.productImage.data.toString("base64") } }]
              : []),
            { text: input.prompt }
          ],
          config: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: env.GEMINI_IMAGE_ASPECT_RATIO } }
        }),
        env.GENERATION_TIMEOUT_MS
      );

      if (response.promptFeedback?.blockReason) {
        throw new ProviderError("BLOCKED", false, String(response.promptFeedback.blockReason));
      }

      for (const candidate of response.candidates ?? []) {
        for (const part of candidate.content?.parts ?? []) {
          if (part.inlineData?.data) {
            return {
              image: Buffer.from(part.inlineData.data, "base64"),
              mimeType: part.inlineData.mimeType ?? "image/png",
              costMicroUsd: null
            };
          }
        }
      }

      // No image: a safety stop is final, anything else (empty answer, truncated output) is worth a retry.
      const finishReason = response.candidates?.[0]?.finishReason;
      if (finishReason && isSafetyStop(String(finishReason))) {
        throw new ProviderError("BLOCKED", false, String(finishReason));
      }
      throw new ProviderError("NO_IMAGE", true, finishReason ? String(finishReason) : "The model returned no image");
    }
  };
}
