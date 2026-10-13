import {
  canShareMoment,
  defaultLocale,
  maskEmail,
  MAX_SHARED_FRIENDS,
  SHARED_GENERATIONS_PER_DAY,
  type AppLocale,
  type SharedMomentDto,
  type SharingPerson,
  type Territory
} from "@sffl/shared";

import { mediaUrl } from "../story/service.js";

type Person = { id: string; username: string | null; email: string };

export type SharedRow = {
  id: string;
  ownerId: string;
  status: SharedMomentDto["status"];
  photoAssetId: string | null;
  scene: { id: string; territory: Territory; translations: { locale: AppLocale; title: string }[] };
  owner: Person;
  participants: { user: Person }[];
  invites: {
    id: string;
    channel: "EMAIL" | "USERNAME";
    email: string | null;
    status: SharedMomentDto["invites"][number]["status"];
    expiresAt: Date;
    invitee: { username: string | null } | null;
  }[];
  latestJob: { status: string; errorCode: string | null } | null;
  /** Photos the owner asked for in the rolling 24 h window. */
  manualJobs: number;
};

/** Public name of a person: "@username", or a masked email for accounts without a username. */
export function displayName(person: { username: string | null; email: string }): string {
  return person.username ? `@${person.username}` : maskEmail(person.email);
}

export function sceneTitle(scene: SharedRow["scene"], locale: AppLocale): string {
  return (
    scene.translations.find((translation) => translation.locale === locale)?.title ??
    scene.translations.find((translation) => translation.locale === defaultLocale)?.title ??
    scene.id
  );
}

export function isOpenInvite(invite: { status: string; expiresAt: Date }, now: Date): boolean {
  return invite.status === "PENDING" && invite.expiresAt > now;
}

/** Free places for new invites: friends who joined and open invites both take a place. */
export function slotsLeft(friends: number, openInvites: number): number {
  return Math.max(0, MAX_SHARED_FRIENDS - friends - openInvites);
}

/** A person may join when the age rule holds against everyone already in the photo. */
export function fitsGroup(candidate: SharingPerson, members: readonly SharingPerson[]): boolean {
  return members.every((member) => canShareMoment(candidate, member));
}

function sharedError(row: SharedRow, pending: boolean): string | null {
  if (pending) return null;
  const failed = row.latestJob?.status === "FAILED" || row.status === "FAILED";
  if (!failed) return null;
  return row.latestJob?.errorCode === "BLOCKED" ? "GENERATION_BLOCKED" : "GENERATION_FAILED";
}

export function toSharedMomentDto(
  row: SharedRow,
  options: { viewerId: string; apiUrl: string; locale: AppLocale; now?: Date }
): SharedMomentDto {
  const now = options.now ?? new Date();
  const isOwner = row.ownerId === options.viewerId;
  const pending = row.latestJob?.status === "QUEUED" || row.latestJob?.status === "IN_PROGRESS";
  const open = row.invites.filter((invite) => isOpenInvite(invite, now));

  return {
    id: row.id,
    isOwner,
    owner: displayName(row.owner),
    scene: { id: row.scene.id, title: sceneTitle(row.scene, options.locale), territory: row.scene.territory },
    status: row.status,
    pending,
    photoUrl: row.photoAssetId ? mediaUrl(options.apiUrl, row.photoAssetId) : null,
    error: sharedError(row, pending),
    participants: [
      { name: displayName(row.owner), role: "OWNER" as const, isMe: isOwner },
      ...row.participants.map(({ user }) => ({
        name: displayName(user),
        role: "FRIEND" as const,
        isMe: user.id === options.viewerId
      }))
    ],
    invites: isOwner
      ? row.invites
          .filter((invite) => invite.status === "PENDING")
          .map((invite) => ({
            id: invite.id,
            label:
              invite.channel === "USERNAME" && invite.invitee?.username
                ? `@${invite.invitee.username}`
                : invite.email
                  ? maskEmail(invite.email)
                  : "—",
            status: invite.expiresAt > now ? ("PENDING" as const) : ("EXPIRED" as const),
            expiresAt: invite.expiresAt.toISOString()
          }))
      : [],
    slotsLeft: isOwner ? slotsLeft(row.participants.length, open.length) : 0,
    generationsLeft: isOwner ? Math.max(0, SHARED_GENERATIONS_PER_DAY - row.manualJobs) : 0
  };
}
