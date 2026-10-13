import { checkUsername, isValidEmail, normalizeUsername, type InviteFriendRequest } from "@sffl/shared";

/** "marko@gmail.com" is an email; "marko" or "@marko" is a username. Null when it is neither. */
export function parseInviteTarget(value: string): InviteFriendRequest | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.slice(1).includes("@")) return isValidEmail(trimmed) ? { email: trimmed.toLowerCase() } : null;
  const username = normalizeUsername(trimmed);
  return checkUsername(username) ? null : { username };
}

/** Short local date and time, e.g. "15. 10. u 14:30". */
export function formatShortDateTime(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getDate()}. ${date.getMonth() + 1}. u ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
