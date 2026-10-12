import type { LifePeriod } from "@sffl/shared";

export type FaceCheckResult =
  | { ok: true }
  | { ok: false; reason: "NO_FACE" | "MULTIPLE_FACES" | "FACE_NOT_CLEAR" | "FACE_OBSTRUCTED" | "NOT_A_PHOTO" };

export type ImageInput = { data: Buffer; mimeType: string };

export type GeneratePhotoInput = {
  sourceImage: Buffer;
  sourceMimeType: string;
  prompt: string;
  /** More images of the same person (e.g. an aged portrait), sent right after the source photo. */
  personReferences?: ImageInput[];
  /** Optional packshot of the real Smoki package, sent after the person references. */
  productImage?: ImageInput;
  /** Image model override for this request (defaults to GEMINI_IMAGE_MODEL). */
  model?: string;
  /** Used by the mock provider to label its placeholder image. */
  label: { sceneTitle: string; targetAge: number; period: LifePeriod };
};

export type GeneratedImage = { image: Buffer; mimeType: string; costMicroUsd: number | null };

export interface AiProvider {
  readonly name: string;
  checkFace(image: Buffer, mimeType: string): Promise<FaceCheckResult>;
  generatePhoto(input: GeneratePhotoInput): Promise<GeneratedImage>;
  /** Short description of facial traits that stay recognisable at any age (no identification). */
  describeFace(image: Buffer, mimeType: string): Promise<string>;
  /** 1–10: how plausible it is that `generated` shows the person in `reference` at `targetAge`. */
  rateLikeness(input: { reference: ImageInput; generated: ImageInput; targetAge: number; currentAge: number }): Promise<number>;
}

/** Provider failure; `retryable` decides whether the job is retried. */
export class ProviderError extends Error {
  constructor(
    readonly code: string,
    readonly retryable: boolean,
    message?: string,
    /** Minimum wait before the next attempt (e.g. after a quota error). */
    readonly retryAfterMs?: number
  ) {
    super(message ?? code);
  }
}
