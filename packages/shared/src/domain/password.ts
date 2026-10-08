export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 200;

export type PasswordIssue = "TOO_SHORT" | "TOO_LONG" | "NEEDS_LETTER_AND_NUMBER" | "SAME_AS_EMAIL";

/**
 * Password rules for registration and reset: 8-200 characters, at least one letter and one digit,
 * and not the same as the email address. Returns the first problem, or null.
 */
export function checkPasswordStrength(password: string, email?: string): PasswordIssue | null {
  if (password.length < PASSWORD_MIN_LENGTH) return "TOO_SHORT";
  if (password.length > PASSWORD_MAX_LENGTH) return "TOO_LONG";
  if (!/\p{L}/u.test(password) || !/\p{N}/u.test(password)) return "NEEDS_LETTER_AND_NUMBER";
  if (email && password.trim().toLowerCase() === email.trim().toLowerCase()) return "SAME_AS_EMAIL";
  return null;
}
