import { z } from "zod";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export type GoogleAuthUrlInput = {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
};

export function buildGoogleAuthUrl(input: GoogleAuthUrlInput): string {
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", input.state);
  url.searchParams.set("code_challenge", input.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

const tokenResponseSchema = z.object({ access_token: z.string().min(1) });
const userInfoSchema = z.object({
  sub: z.string().min(1),
  email: z.string().min(3),
  email_verified: z.boolean().optional()
});

export type GoogleProfile = { sub: string; email: string; emailVerified: boolean };

export type GoogleCodeExchangeInput = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
  codeVerifier: string;
};

/** Exchanges the authorization code and reads the user's verified email from Google. */
export async function exchangeGoogleCode(
  input: GoogleCodeExchangeInput,
  fetchImpl: typeof fetch = fetch
): Promise<GoogleProfile> {
  const tokenResponse = await fetchImpl(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: input.code,
      client_id: input.clientId,
      client_secret: input.clientSecret,
      redirect_uri: input.redirectUri,
      code_verifier: input.codeVerifier
    })
  });

  if (!tokenResponse.ok) {
    throw new Error(`Google token exchange failed with status ${tokenResponse.status}`);
  }

  const { access_token: accessToken } = tokenResponseSchema.parse(await tokenResponse.json());
  const userInfoResponse = await fetchImpl(GOOGLE_USERINFO_URL, {
    headers: { authorization: `Bearer ${accessToken}` }
  });

  if (!userInfoResponse.ok) {
    throw new Error(`Google userinfo failed with status ${userInfoResponse.status}`);
  }

  const info = userInfoSchema.parse(await userInfoResponse.json());
  return { sub: info.sub, email: info.email.trim().toLowerCase(), emailVerified: info.email_verified === true };
}
