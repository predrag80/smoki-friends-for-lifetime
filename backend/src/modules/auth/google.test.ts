import assert from "node:assert/strict";
import { test } from "node:test";

import { buildGoogleAuthUrl, exchangeGoogleCode } from "./google.js";

test("auth URL uses the code flow with PKCE", () => {
  const url = new URL(
    buildGoogleAuthUrl({
      clientId: "client",
      redirectUri: "http://localhost:4100/auth/google/callback",
      state: "state-1",
      codeChallenge: "challenge"
    })
  );
  assert.equal(url.hostname, "accounts.google.com");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("state"), "state-1");
  assert.equal(url.searchParams.get("redirect_uri"), "http://localhost:4100/auth/google/callback");
});

test("code exchange returns a normalised profile", async () => {
  const calls: string[] = [];
  const fakeFetch = (async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    const body = url.includes("token")
      ? { access_token: "at" }
      : { sub: "123", email: "Predrag@Gmail.com", email_verified: true };
    return new Response(JSON.stringify(body), { status: 200 });
  }) as typeof fetch;

  const profile = await exchangeGoogleCode(
    { clientId: "c", clientSecret: "s", redirectUri: "r", code: "code", codeVerifier: "v" },
    fakeFetch
  );

  assert.deepEqual(profile, { sub: "123", email: "predrag@gmail.com", emailVerified: true });
  assert.equal(calls.length, 2);
});

test("a failed token exchange throws", async () => {
  const fakeFetch = (async () => new Response("{}", { status: 400 })) as typeof fetch;
  await assert.rejects(
    exchangeGoogleCode({ clientId: "c", clientSecret: "s", redirectUri: "r", code: "x", codeVerifier: "v" }, fakeFetch)
  );
});
