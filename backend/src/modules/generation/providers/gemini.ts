import { GoogleGenAI, Type } from "@google/genai";

import type { Env } from "../../../config/env.js";
import { ProviderError, type AiProvider, type FaceCheckResult } from "./types.js";

const FACE_CHECK_PROMPT =
  "You check a selfie that will be used to generate realistic portraits of the same person. " +
  "Count human faces. Decide whether the main face is sharp, well lit and looking roughly towards the camera, " +
  "and whether it is covered (sunglasses, mask, hand, heavy filter). Decide whether this is a real photograph " +
  "(not a drawing, screenshot of text or meme). Do not identify the person.";

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

export function interpretFaceCheck(answer: FaceCheckAnswer): FaceCheckResult {
  if (!answer.isPhoto) return { ok: false, reason: "NOT_A_PHOTO" };
  if (answer.faceCount === 0) return { ok: false, reason: "NO_FACE" };
  if (answer.faceCount > 1) return { ok: false, reason: "MULTIPLE_FACES" };
  if (answer.obstructed) return { ok: false, reason: "FACE_OBSTRUCTED" };
  if (!answer.clear) return { ok: false, reason: "FACE_NOT_CLEAR" };
  return { ok: true };
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
      const response = await withTimeout(
        ai.models.generateContent({
          model: env.GEMINI_CHECK_MODEL,
          contents: [{ inlineData: { mimeType, data: image.toString("base64") } }, { text: FACE_CHECK_PROMPT }],
          config: { responseMimeType: "application/json", responseSchema: faceCheckSchema, temperature: 0 }
        }),
        30000
      );
      try {
        return interpretFaceCheck(JSON.parse(response.text ?? "{}") as FaceCheckAnswer);
      } catch {
        throw new ProviderError("FACE_CHECK_INVALID_RESPONSE", true);
      }
    },

    async generatePhoto(input) {
      const response = await withTimeout(
        ai.models.generateContent({
          model: env.GEMINI_IMAGE_MODEL,
          contents: [
            { inlineData: { mimeType: input.sourceMimeType, data: input.sourceImage.toString("base64") } },
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

      throw new ProviderError("NO_IMAGE", true, "The model returned no image");
    }
  };
}
