export const readinessSteps = ["EMAIL_VERIFICATION", "GUARDIAN_CONSENT", "PHOTO_CONSENT"] as const;
export type ReadinessStep = (typeof readinessSteps)[number];

export type ReadinessInput = {
  emailVerified: boolean;
  guardianRequired: boolean;
  guardianConfirmed: boolean;
  photoConsent: boolean;
};

/** What the user still has to do before they can upload a photo and create moments. */
export function getAccountReadiness(input: ReadinessInput): {
  canCreate: boolean;
  missing: ReadinessStep[];
} {
  const missing: ReadinessStep[] = [];
  if (!input.emailVerified) missing.push("EMAIL_VERIFICATION");
  if (input.guardianRequired && !input.guardianConfirmed) missing.push("GUARDIAN_CONSENT");
  if (!input.photoConsent) missing.push("PHOTO_CONSENT");
  return { canCreate: missing.length === 0, missing };
}

/** "predrag@gmail.com" -> "p*****@gmail.com"; used when showing an email to someone else. */
export function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  if (!domain) return "***";
  const visible = local.slice(0, 1);
  return `${visible}${"*".repeat(Math.max(local.length - 1, 3))}@${domain}`;
}
