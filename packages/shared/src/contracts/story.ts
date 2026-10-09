import { z } from "zod";

import { lifePeriods } from "../domain/life-periods.js";
import { territories } from "../domain/scenes.js";

/** Reasons a photo can be rejected (technical check or AI face check). */
export const photoRejectionCodes = [
  "PHOTO_MISSING",
  "PHOTO_TOO_LARGE",
  "PHOTO_UNSUPPORTED_FORMAT",
  "PHOTO_TOO_SMALL",
  "PHOTO_UNREADABLE",
  "NO_FACE",
  "MULTIPLE_FACES",
  "FACE_NOT_CLEAR",
  "FACE_OBSTRUCTED",
  "NOT_A_PHOTO"
] as const;
export type PhotoRejectionCode = (typeof photoRejectionCodes)[number];

export const storyErrorCodes = [
  ...photoRejectionCodes,
  "NOT_READY",
  "NO_SOURCE_PHOTO",
  "SCENE_NOT_AVAILABLE",
  "AGE_OUT_OF_PERIOD_RANGE",
  "PERIOD_NOT_AVAILABLE",
  "MOMENT_EXISTS",
  "GENERATION_IN_PROGRESS",
  "DAILY_LIMIT_REACHED",
  "FACE_CHECK_UNAVAILABLE",
  "AI_NOT_ALLOWED",
  "AI_DAILY_CAP_REACHED"
] as const;
export type StoryErrorCode = (typeof storyErrorCodes)[number];

export const momentStatuses = ["PHOTO_PENDING", "PHOTO_READY", "VIDEO_PENDING", "VIDEO_READY", "FAILED"] as const;

export const createMomentRequestSchema = z.object({
  period: z.enum(lifePeriods),
  targetAge: z.number().int().min(0).max(120),
  sceneId: z.string().min(1).max(64)
});
export type CreateMomentRequest = z.infer<typeof createMomentRequestSchema>;

export const regenerateMomentRequestSchema = z.object({
  targetAge: z.number().int().min(0).max(120).optional(),
  sceneId: z.string().min(1).max(64).optional()
});
export type RegenerateMomentRequest = z.infer<typeof regenerateMomentRequestSchema>;

export const momentDtoSchema = z.object({
  id: z.string(),
  period: z.enum(lifePeriods),
  targetAge: z.number(),
  scene: z.object({ id: z.string(), title: z.string(), territory: z.enum(territories) }),
  status: z.enum(momentStatuses),
  /** True while a photo job is queued or running. */
  pending: z.boolean(),
  photoUrl: z.string().nullable(),
  /** Error code of the last failed job, if the moment has no photo yet. */
  error: z.string().nullable(),
  generationsLeft: z.number(),
  createdAt: z.string()
});
export type MomentDto = z.infer<typeof momentDtoSchema>;

export const storyResponseSchema = z.object({
  canCreate: z.boolean(),
  currentAge: z.number(),
  sourcePhoto: z.object({ id: z.string(), url: z.string() }).nullable(),
  moments: z.array(momentDtoSchema),
  limits: z.object({ generationsPerPeriodPerDay: z.number() })
});
export type StoryResponse = z.infer<typeof storyResponseSchema>;

export const photoUploadResponseSchema = z.object({ id: z.string(), url: z.string() });
export type PhotoUploadResponse = z.infer<typeof photoUploadResponseSchema>;
