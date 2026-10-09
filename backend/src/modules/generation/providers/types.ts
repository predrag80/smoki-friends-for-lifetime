import type { LifePeriod } from "@sffl/shared";

export type FaceCheckResult =
  | { ok: true }
  | { ok: false; reason: "NO_FACE" | "MULTIPLE_FACES" | "FACE_NOT_CLEAR" | "FACE_OBSTRUCTED" | "NOT_A_PHOTO" };

export type GeneratePhotoInput = {
  sourceImage: Buffer;
  sourceMimeType: string;
  prompt: string;
  /** Optional packshot of the real Smoki package, sent as a second reference image. */
  productImage?: { data: Buffer; mimeType: string };
  /** Used by the mock provider to label its placeholder image. */
  label: { sceneTitle: string; targetAge: number; period: LifePeriod };
};

export type GeneratedImage = { image: Buffer; mimeType: string; costMicroUsd: number | null };

export interface AiProvider {
  readonly name: string;
  checkFace(image: Buffer, mimeType: string): Promise<FaceCheckResult>;
  generatePhoto(input: GeneratePhotoInput): Promise<GeneratedImage>;
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
