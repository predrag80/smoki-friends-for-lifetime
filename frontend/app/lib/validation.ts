import { checkPasswordStrength, isValidEmail, type PasswordIssue } from "@sffl/shared";

/** Keys of messages.errors used for inline field errors. */
export type ErrorKey = string;

const passwordIssueKeys: Record<PasswordIssue, ErrorKey> = {
  TOO_SHORT: "passwordShort",
  TOO_LONG: "passwordTooLong",
  NEEDS_LETTER_AND_NUMBER: "passwordLetterNumber",
  SAME_AS_EMAIL: "passwordSameAsEmail"
};

export function validateEmailField(value: string): ErrorKey | undefined {
  if (!value.trim()) return "emailRequired";
  return isValidEmail(value) ? undefined : "invalidEmail";
}

/** Same rules as the API (shared checkPasswordStrength). */
export function validateNewPassword(password: string, email?: string): ErrorKey | undefined {
  if (!password) return "passwordRequired";
  const issue = checkPasswordStrength(password, email);
  return issue ? passwordIssueKeys[issue] : undefined;
}

export function validatePasswordConfirm(password: string, confirm: string): ErrorKey | undefined {
  return password === confirm ? undefined : "passwordMismatch";
}

export function hasErrors(errors: Record<string, ErrorKey | undefined>): boolean {
  return Object.values(errors).some(Boolean);
}
