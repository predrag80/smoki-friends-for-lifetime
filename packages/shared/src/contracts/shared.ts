import { z } from "zod";

import { normalizeUsername, USERNAME_MAX_LENGTH } from "../domain/shared-moment.js";
import { territories } from "../domain/scenes.js";
import { emailSchema } from "./auth.js";

/** Trimmed, lowercased, without "@"; rules are checked with checkUsername (422 USERNAME_INVALID). */
export const usernameSchema = z.string().max(USERNAME_MAX_LENGTH + 5).transform(normalizeUsername);

export const usernameUpdateRequestSchema = z.object({ username: usernameSchema });
export type UsernameUpdateRequest = z.input<typeof usernameUpdateRequestSchema>;

export const createSharedMomentRequestSchema = z.object({ sceneId: z.string().min(1).max(64) });
export type CreateSharedMomentRequest = z.infer<typeof createSharedMomentRequestSchema>;

/** Invite by email or by username (exactly one). */
export const inviteFriendRequestSchema = z.union([
  z.object({ email: emailSchema }).strict(),
  z.object({ username: usernameSchema }).strict()
]);
export type InviteFriendRequest = z.input<typeof inviteFriendRequestSchema>;

export const sharedMomentStatuses = ["WAITING", "PHOTO_PENDING", "PHOTO_READY", "FAILED"] as const;
export const inviteStatuses = ["PENDING", "ACCEPTED", "DECLINED", "CANCELED", "EXPIRED"] as const;
export type InviteStatus = (typeof inviteStatuses)[number];

export const sharedErrorCodes = [
  "USERNAME_INVALID",
  "USERNAME_TAKEN",
  "USERNAME_REQUIRED",
  "SHARED_LOCKED",
  "SHARED_EXISTS",
  "SHARED_NOT_FOUND",
  "SHARED_NEEDS_FRIEND",
  "FRIEND_LIMIT_REACHED",
  "INVITE_LIMIT_REACHED",
  "INVITE_SELF",
  "ALREADY_INVITED",
  "ALREADY_PARTICIPANT",
  "USER_NOT_FOUND",
  "INVITE_NOT_FOUND",
  "INVITE_EXPIRED",
  "INVITE_CLOSED",
  "INVITE_AGE_RULE",
  "INVITE_NEEDS_PHOTO",
  "INVITE_NEEDS_READY"
] as const;
export type SharedErrorCode = (typeof sharedErrorCodes)[number];

const sceneSchema = z.object({ id: z.string(), title: z.string(), territory: z.enum(territories) });

export const sharedParticipantSchema = z.object({
  /** Username, or null for accounts that have not chosen one. */
  name: z.string().nullable(),
  role: z.enum(["OWNER", "FRIEND"]),
  isMe: z.boolean()
});

export const sharedInviteSchema = z.object({
  id: z.string(),
  /** "@username" or a masked email such as "m*****@gmail.com". */
  label: z.string(),
  status: z.enum(inviteStatuses),
  expiresAt: z.string()
});

export const sharedMomentDtoSchema = z.object({
  id: z.string(),
  isOwner: z.boolean(),
  owner: z.string().nullable(),
  scene: sceneSchema,
  status: z.enum(sharedMomentStatuses),
  pending: z.boolean(),
  photoUrl: z.string().nullable(),
  error: z.string().nullable(),
  participants: z.array(sharedParticipantSchema),
  /** Only for the owner. */
  invites: z.array(sharedInviteSchema),
  slotsLeft: z.number(),
  generationsLeft: z.number()
});
export type SharedMomentDto = z.infer<typeof sharedMomentDtoSchema>;

export const incomingInviteSchema = z.object({
  id: z.string(),
  from: z.string(),
  sceneTitle: z.string(),
  expiresAt: z.string()
});
export type IncomingInvite = z.infer<typeof incomingInviteSchema>;

export const sharedSectionSchema = z.object({
  unlocked: z.boolean(),
  username: z.string().nullable(),
  mine: sharedMomentDtoSchema.nullable(),
  joined: z.array(sharedMomentDtoSchema),
  incoming: z.array(incomingInviteSchema)
});
export type SharedSection = z.infer<typeof sharedSectionSchema>;

/** Public preview of an invite link (no sign-in needed). */
export const invitePreviewSchema = z.object({
  from: z.string(),
  sceneTitle: z.string(),
  status: z.enum(inviteStatuses),
  expiresAt: z.string()
});
export type InvitePreview = z.infer<typeof invitePreviewSchema>;
