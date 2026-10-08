/** Only same-site paths are allowed as a post-login destination. */
export function safeRedirect(value: string | undefined | null, fallback = "/account"): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}
