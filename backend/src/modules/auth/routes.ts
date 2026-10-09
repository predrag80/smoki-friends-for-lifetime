import {
  checkPasswordStrength,
  completeOAuthSignupRequestSchema,
  forgotPasswordRequestSchema,
  loginRequestSchema,
  registerRequestSchema,
  resetPasswordRequestSchema,
  tokenRequestSchema
} from "@sffl/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

import { getEnv, getOAuthBaseUrl, isGoogleConfigured } from "../../config/env.js";
import { generateToken, hashPassword, pkceChallenge, verifyPassword } from "../../lib/crypto.js";
import { prisma } from "../../lib/prisma.js";
import {
  consumeAuthToken,
  createAccount,
  EmailTakenError,
  findAuthToken,
  issueAuthToken,
  sendGuardianEmail,
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
  sendVerificationEmail
} from "./accounts.js";
import { buildGoogleAuthUrl, exchangeGoogleCode } from "./google.js";
import { loadMe } from "./load-me.js";
import { evaluateRegistration } from "./registration.js";
import { getUserId, requireUser } from "./require-user.js";
import {
  clearSessionCookie,
  getRequestMeta,
  readSessionToken,
  revokeAllSessions,
  revokeSession,
  startSession
} from "./session.js";

/** Stricter limit for endpoints that could be used to guess passwords or spam emails. */
const strictRateLimit = { rateLimit: { max: 10, timeWindow: "1 minute" } };

const OAUTH_COOKIE = "sffl_oauth";
const OAUTH_COOKIE_PATH = "/auth/google";
const LOGIN_TICKET_TTL_MS = 60 * 1000;

const oauthSignupPayloadSchema = z.object({ provider: z.literal("GOOGLE"), providerAccountId: z.string(), email: z.string() });

function invalidBody(reply: FastifyReply, issues: unknown) {
  return reply.code(400).send({ error: "INVALID_BODY", issues });
}

function googleRedirectUri(): string {
  return `${getOAuthBaseUrl(getEnv())}/auth/google/callback`;
}

export async function authRoutes(app: FastifyInstance) {
  app.get("/auth/config", async () => {
    const env = getEnv();
    const enabled = isGoogleConfigured(env);
    return { google: { enabled, startUrl: enabled ? `${getOAuthBaseUrl(env)}/auth/google/start` : null } };
  });

  // ---------------------------------------------------------------------------
  // Email + password
  // ---------------------------------------------------------------------------

  app.post("/auth/register", { config: strictRateLimit }, async (request, reply) => {
    const parsed = registerRequestSchema.safeParse(request.body);
    if (!parsed.success) return invalidBody(reply, parsed.error.issues);

    const body = parsed.data;
    if (checkPasswordStrength(body.password, body.email)) return reply.code(422).send({ error: "WEAK_PASSWORD" });

    const decision = evaluateRegistration(body);
    if (!decision.ok) return reply.code(422).send({ error: decision.error });

    const existing = await prisma.user.findUnique({ where: { email: body.email }, select: { id: true } });
    if (existing) return reply.code(409).send({ error: "EMAIL_TAKEN" });

    const meta = getRequestMeta(request);
    let account: Awaited<ReturnType<typeof createAccount>>;
    try {
      account = await createAccount({
        email: body.email,
        passwordHash: await hashPassword(body.password),
        emailVerified: false,
        birthMonth: body.birthMonth,
        birthYear: body.birthYear,
        market: body.market,
        locale: body.locale,
        marketing: decision.marketing,
        guardianEmail: decision.guardianEmail,
        meta
      });
    } catch (error) {
      if (error instanceof EmailTakenError) return reply.code(409).send({ error: "EMAIL_TAKEN" });
      throw error;
    }

    await sendVerificationEmail({ id: account.userId, email: body.email, locale: body.locale }, request.log);
    if (decision.guardianEmail && account.guardianToken) {
      await sendGuardianEmail(
        { guardianEmail: decision.guardianEmail, childEmail: body.email, locale: body.locale, token: account.guardianToken },
        request.log
      );
    }

    await startSession(reply, account.userId, meta);
    return reply.code(201).send(await loadMe(account.userId));
  });

  app.post("/auth/login", { config: strictRateLimit }, async (request, reply) => {
    const parsed = loginRequestSchema.safeParse(request.body);
    if (!parsed.success) return invalidBody(reply, parsed.error.issues);

    const user = await prisma.user.findFirst({
      where: { email: parsed.data.email, deletedAt: null },
      select: { id: true, passwordHash: true }
    });
    const valid = user?.passwordHash ? await verifyPassword(parsed.data.password, user.passwordHash) : false;

    if (!user || !valid) return reply.code(401).send({ error: "INVALID_CREDENTIALS" });

    await startSession(reply, user.id, getRequestMeta(request));
    return reply.send(await loadMe(user.id));
  });

  app.post("/auth/logout", async (request, reply) => {
    const token = readSessionToken(request);
    if (token) await revokeSession(token);
    clearSessionCookie(reply);
    return reply.code(204).send();
  });

  app.get("/auth/me", { preHandler: requireUser }, async (request) => loadMe(getUserId(request)));

  // ---------------------------------------------------------------------------
  // Password reset
  // ---------------------------------------------------------------------------

  /** Always answers 202 so the response never reveals whether an account exists. */
  app.post(
    "/auth/password/forgot",
    { config: { rateLimit: { max: 5, timeWindow: "10 minutes" } } },
    async (request, reply) => {
      const parsed = forgotPasswordRequestSchema.safeParse(request.body);
      if (!parsed.success) return invalidBody(reply, parsed.error.issues);

      const user = await prisma.user.findFirst({
        where: { email: parsed.data.email, deletedAt: null },
        select: { id: true, email: true, locale: true }
      });
      if (user) {
        // Not awaited, so the response time does not reveal whether the account exists.
        void sendPasswordResetEmail(user, request.log).catch((error: unknown) =>
          request.log.error({ err: error }, "Password reset email failed")
        );
      }

      return reply.code(202).send({ sent: true });
    }
  );

  app.post("/auth/password/reset", { config: strictRateLimit }, async (request, reply) => {
    const parsed = resetPasswordRequestSchema.safeParse(request.body);
    if (!parsed.success) return invalidBody(reply, parsed.error.issues);

    const lookup = await findAuthToken("PASSWORD_RESET", parsed.data.token);
    if (lookup.status === "expired") return reply.code(410).send({ error: "TOKEN_EXPIRED" });
    if (lookup.status !== "valid" || !lookup.token.userId) return reply.code(400).send({ error: "INVALID_TOKEN" });

    const user = await prisma.user.findFirst({
      where: { id: lookup.token.userId, deletedAt: null },
      select: { id: true, email: true, locale: true, emailVerifiedAt: true }
    });
    if (!user) return reply.code(400).send({ error: "INVALID_TOKEN" });
    if (checkPasswordStrength(parsed.data.password, user.email)) return reply.code(422).send({ error: "WEAK_PASSWORD" });
    if (!(await consumeAuthToken(lookup.token.id))) return reply.code(400).send({ error: "INVALID_TOKEN" });

    // The link proved access to the mailbox, so the address counts as verified.
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(parsed.data.password),
        ...(user.emailVerifiedAt ? {} : { emailVerifiedAt: new Date() })
      }
    });
    await revokeAllSessions(user.id);
    await sendPasswordChangedEmail(user, request.log);

    await startSession(reply, user.id, getRequestMeta(request));
    return reply.send(await loadMe(user.id));
  });

  // ---------------------------------------------------------------------------
  // Email verification
  // ---------------------------------------------------------------------------

  app.post("/auth/verify-email", { config: strictRateLimit }, async (request, reply) => {
    const parsed = tokenRequestSchema.safeParse(request.body);
    if (!parsed.success) return invalidBody(reply, parsed.error.issues);

    const lookup = await findAuthToken("EMAIL_VERIFICATION", parsed.data.token);

    if (lookup.status === "used" && lookup.token?.userId) {
      // Opening the same link twice is fine once the address is verified.
      const user = await prisma.user.findUnique({ where: { id: lookup.token.userId }, select: { emailVerifiedAt: true } });
      if (user?.emailVerifiedAt) return reply.send({ verified: true });
    }
    if (lookup.status === "expired") return reply.code(410).send({ error: "TOKEN_EXPIRED" });
    if (lookup.status !== "valid" || !lookup.token.userId) return reply.code(400).send({ error: "INVALID_TOKEN" });

    if (!(await consumeAuthToken(lookup.token.id))) return reply.code(400).send({ error: "INVALID_TOKEN" });
    await prisma.user.update({ where: { id: lookup.token.userId }, data: { emailVerifiedAt: new Date() } });
    return reply.send({ verified: true });
  });

  app.post(
    "/auth/verify-email/resend",
    { preHandler: requireUser, config: { rateLimit: { max: 3, timeWindow: "10 minutes" } } },
    async (request, reply) => {
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: getUserId(request) },
        select: { id: true, email: true, locale: true, emailVerifiedAt: true }
      });
      if (user.emailVerifiedAt) return reply.code(409).send({ error: "ALREADY_VERIFIED" });

      await sendVerificationEmail(user, request.log);
      return reply.code(202).send({ sent: true });
    }
  );

  // ---------------------------------------------------------------------------
  // Google sign-in
  // ---------------------------------------------------------------------------

  app.get("/auth/google/start", async (_request, reply) => {
    const env = getEnv();
    if (!isGoogleConfigured(env) || !env.GOOGLE_OAUTH_CLIENT_ID) {
      return reply.code(404).send({ error: "GOOGLE_NOT_CONFIGURED" });
    }

    const state = generateToken(16);
    const codeVerifier = generateToken(32);
    reply.setCookie(OAUTH_COOKIE, `${state}.${codeVerifier}`, {
      httpOnly: true,
      secure: env.SESSION_COOKIE_SECURE,
      sameSite: "lax",
      path: OAUTH_COOKIE_PATH,
      maxAge: 10 * 60
    });

    return reply.redirect(
      buildGoogleAuthUrl({
        clientId: env.GOOGLE_OAUTH_CLIENT_ID,
        redirectUri: googleRedirectUri(),
        state,
        codeChallenge: pkceChallenge(codeVerifier)
      })
    );
  });

  app.get("/auth/google/callback", async (request: FastifyRequest, reply) => {
    const env = getEnv();
    const failure = () => reply.redirect(`${env.APP_URL}/login?error=google`);
    const query = request.query as { code?: string; state?: string; error?: string };
    const [expectedState, codeVerifier] = (request.cookies[OAUTH_COOKIE] ?? "").split(".");
    reply.clearCookie(OAUTH_COOKIE, { path: OAUTH_COOKIE_PATH });

    if (
      query.error ||
      !query.code ||
      !query.state ||
      !expectedState ||
      !codeVerifier ||
      query.state !== expectedState ||
      !env.GOOGLE_OAUTH_CLIENT_ID ||
      !env.GOOGLE_OAUTH_CLIENT_SECRET
    ) {
      return failure();
    }

    let profile: Awaited<ReturnType<typeof exchangeGoogleCode>>;
    try {
      profile = await exchangeGoogleCode({
        clientId: env.GOOGLE_OAUTH_CLIENT_ID,
        clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
        redirectUri: googleRedirectUri(),
        code: query.code,
        codeVerifier
      });
    } catch (error) {
      request.log.warn({ err: error }, "Google sign-in failed");
      return failure();
    }

    if (!profile.emailVerified) return failure();

    const linked = await prisma.oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider: "GOOGLE", providerAccountId: profile.sub } },
      select: { user: { select: { id: true, deletedAt: true } } }
    });

    let userId = linked && !linked.user.deletedAt ? linked.user.id : null;

    if (!userId) {
      const byEmail = await prisma.user.findFirst({
        where: { email: profile.email, deletedAt: null },
        select: { id: true, emailVerifiedAt: true }
      });

      if (byEmail) {
        // Google has verified this address. If the existing account never verified it, someone else
        // may have registered it with a password, so that password is removed when linking.
        await prisma.$transaction([
          prisma.oAuthAccount.create({
            data: { userId: byEmail.id, provider: "GOOGLE", providerAccountId: profile.sub }
          }),
          prisma.user.update({
            where: { id: byEmail.id },
            data: byEmail.emailVerifiedAt ? {} : { emailVerifiedAt: new Date(), passwordHash: null }
          })
        ]);
        userId = byEmail.id;
      }
    }

    if (userId) {
      const ticket = await issueAuthToken("LOGIN_TICKET", { userId, ttlMs: LOGIN_TICKET_TTL_MS });
      return reply.redirect(`${env.API_URL}/auth/ticket?t=${encodeURIComponent(ticket)}`);
    }

    const signupToken = await issueAuthToken("OAUTH_SIGNUP", {
      payload: { provider: "GOOGLE", providerAccountId: profile.sub, email: profile.email },
      ttlMs: env.OAUTH_SIGNUP_TTL_MINUTES * 60 * 1000
    });
    return reply.redirect(`${env.APP_URL}/register/complete?t=${encodeURIComponent(signupToken)}`);
  });

  /** Turns a login ticket into a session cookie on the API domain, then returns to the app. */
  app.get("/auth/ticket", async (request, reply) => {
    const env = getEnv();
    const ticket = (request.query as { t?: string }).t ?? "";
    const lookup = await findAuthToken("LOGIN_TICKET", ticket);

    if (lookup.status !== "valid" || !lookup.token.userId || !(await consumeAuthToken(lookup.token.id))) {
      return reply.redirect(`${env.APP_URL}/login?error=google`);
    }

    await startSession(reply, lookup.token.userId, getRequestMeta(request));
    // The story page sends accounts that are not ready yet to /account.
    return reply.redirect(`${env.APP_URL}/story`);
  });

  app.post("/auth/google/signup-info", { config: strictRateLimit }, async (request, reply) => {
    const parsed = tokenRequestSchema.safeParse(request.body);
    if (!parsed.success) return invalidBody(reply, parsed.error.issues);

    const lookup = await findAuthToken("OAUTH_SIGNUP", parsed.data.token);
    if (lookup.status === "expired") return reply.code(410).send({ error: "TOKEN_EXPIRED" });
    if (lookup.status !== "valid") return reply.code(400).send({ error: "INVALID_TOKEN" });

    const payload = oauthSignupPayloadSchema.parse(lookup.token.payload);
    return reply.send({ email: payload.email, provider: payload.provider });
  });

  app.post("/auth/google/complete", { config: strictRateLimit }, async (request, reply) => {
    const parsed = completeOAuthSignupRequestSchema.safeParse(request.body);
    if (!parsed.success) return invalidBody(reply, parsed.error.issues);

    const body = parsed.data;
    const lookup = await findAuthToken("OAUTH_SIGNUP", body.token);
    if (lookup.status === "expired") return reply.code(410).send({ error: "TOKEN_EXPIRED" });
    if (lookup.status !== "valid") return reply.code(400).send({ error: "INVALID_TOKEN" });

    const payload = oauthSignupPayloadSchema.parse(lookup.token.payload);
    const decision = evaluateRegistration({ ...body, email: payload.email });
    if (!decision.ok) return reply.code(422).send({ error: decision.error });

    if (!(await consumeAuthToken(lookup.token.id))) return reply.code(400).send({ error: "INVALID_TOKEN" });

    const meta = getRequestMeta(request);
    let account: Awaited<ReturnType<typeof createAccount>>;
    try {
      account = await createAccount({
        email: payload.email,
        passwordHash: null,
        emailVerified: true,
        birthMonth: body.birthMonth,
        birthYear: body.birthYear,
        market: body.market,
        locale: body.locale,
        marketing: decision.marketing,
        guardianEmail: decision.guardianEmail,
        oauth: { provider: "GOOGLE", providerAccountId: payload.providerAccountId },
        meta
      });
    } catch (error) {
      if (error instanceof EmailTakenError) return reply.code(409).send({ error: "EMAIL_TAKEN" });
      throw error;
    }

    if (decision.guardianEmail && account.guardianToken) {
      await sendGuardianEmail(
        { guardianEmail: decision.guardianEmail, childEmail: payload.email, locale: body.locale, token: account.guardianToken },
        request.log
      );
    }

    await startSession(reply, account.userId, meta);
    return reply.code(201).send(await loadMe(account.userId));
  });
}
