import { checkUsername, isValidEmail, normalizeUsername, type InviteFriendRequest, type LifePeriod } from "@sffl/shared";

import { format, type Messages } from "./messages";

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

/** "pre 20 godina" / "danas" / "za 15 godina" for a shared moment. */
export function sharedWhen(messages: Messages, period: LifePeriod, yearsOffset: number): string {
  const sh = messages.shared;
  if (period === "YESTERDAY") return format(sh.whenPast, { years: -yearsOffset });
  if (period === "SOMEDAY") return format(sh.whenFuture, { years: yearsOffset });
  return sh.whenToday;
}
