/**
 * Cost guards for real AI generation on shared servers:
 * - AI_ALLOWED_EMAILS: comma-separated list; when set, only these accounts may use AI.
 * - AI_DAILY_CAP: total photo generations per rolling 24 h for the whole server; 0 means no cap.
 */
export function parseAllowedEmails(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowed(email: string, allowed: readonly string[]): boolean {
  return allowed.length === 0 || allowed.includes(email.trim().toLowerCase());
}

export function isDailyCapReached(generatedInWindow: number, cap: number): boolean {
  return cap > 0 && generatedInWindow >= cap;
}
