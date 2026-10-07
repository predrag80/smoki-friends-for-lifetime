# Smoki Friend for a Lifetime — Engineering Plan

**Next.js Initialization**: When starting work on the frontend, call the `init` tool from the
next-devtools-mcp server first so Next.js answers come from official documentation.

## Source Of Truth
- Product/UX proposal: "SMOKI / FRIEND FOR A LIFETIME — predlog digitalnog AI iskustva" (radna verzija 25.09.2026).
- This `AGENTS.md` is the active engineering source for implementation decisions.
- Legal texts (terms, privacy, consent) are client-owned.

## Product Summary
The user uploads one face photo, picks a life period (JUČE / DANAS / JEDNOG DANA), one of three
Smoki territories (Relaxing, Socializing, Sport Cheering) and a scene. The system generates a
personalized AI photo, then a short AI video from that photo. Completing all three periods unlocks
an automatically edited final "Friend for a Lifetime" film.

- Result order is fixed: photo → video → share. Photo and video are separate async jobs.
- Each single film is shareable immediately; sharing never waits for the final film.
- No points, leaderboards, daily missions or purchase requirements in the core flow.

## Stack (aligned with the Smoki project)
- Monorepo with npm workspaces: `frontend`, `backend`, `packages/shared`.
- Frontend: Next.js 16 (App Router) + React 19 + TanStack Query on `app.<domain>`.
- Backend: Fastify 5 + TypeScript (ESM) on `api.<domain>`.
- Database: PostgreSQL 16 via Prisma 6.
- Cache/locks/rate-limit: Valkey (Redis protocol, ioredis).
- Async jobs: dedicated worker process (`src/worker.ts`, `PROCESS_ROLE=api|worker|all`), DB-backed
  job table with statuses, retries and per-user limits (same pattern as Smoki avatar jobs).
- Storage: private S3-compatible bucket (RustFS locally). User photos and generated media are never public;
  access goes through short-lived signed URLs.
- AI: image generation via Gemini; video provider TBD (decision in generation phase).
- Final film montage: ffmpeg in the worker.

## Markets And Languages
- Markets: `SRB`, `BIH`, `HRV`, `MKD`, `AUT`. Same app everywhere; only language changes.
- Locales: `sr` (default), `bs`, `hr`, `mk`, `de`.
- Country is stored independently from UI language.

## Core Decisions
- Store all timestamps in UTC; display in the user's local timezone.
- Keep business logic in domain services, not route handlers.
- Scenes are data: 15 scenes for v1, each with territory and allowed life periods/age ranges.
  The UI only offers scenes valid for the selected age (e.g. "Ekipa ispred škole" not offered at 65).
- Generation limits (attempts per user/day, retries) are configuration, not code.
- Domain rules live in `packages/shared/src/domain` and are used by both frontend and backend:
  - Life period age ranges (agreed 2026-10-07): YESTERDAY 6..(current-5), TODAY = current,
    SOMEDAY (current+10)..85. A period is unavailable if its range would be empty.
  - Scene catalog v1 (15 scenes) with per-scene min/max age; the DB is seeded from it
    (`npm run db:seed -w @sffl/backend`).
- Only the birth year is stored (not full date of birth); current age is derived from it.
- Every stored file is a `MediaAsset` row pointing to a private storage key (source photo,
  generated photo, video, final film). One `Moment` per user per life period.
- `GenerationJob` is the queue table (status + runAfter + lock) and the source for limits/cost analytics.
- Scene copy: `SceneTranslation` per locale; missing locales fall back to Serbian.
- Users can delete their account and all photos/generated media.

## Local Development
- Domains: `app.smoki.local` (Next.js :3100) and `api.smoki.local` (Fastify :4100) through the local nginx
  (`dev/nginx/smoki.local.conf`); Caddy is an optional compose profile (`proxy`).
- Services: `npm run dev:services` (Postgres, Valkey, RustFS).
- Ports are project-specific so this app can run alongside Smoki (3000/4000/5432):
  frontend 3100, API 4100, worker health 4101, Postgres 5433, Valkey 6380, storage 9000/9001.
- Do not run `npm run build` while dev servers are running; use dev servers for iteration.
- Git commits carry no AI attribution lines.

## Workflow (project skills in `.claude/skills/`)
- `implement-feature`: plan first, get the user's approval, then implement, document, verify and commit.
- `add-api-endpoint`: Fastify module layout, zod validation, error codes, service tests.
- `db-change`: Prisma schema changes, migrations (run on the user's Mac), idempotent seed.
- `verify`: lint, typecheck, test and build before every commit.
- `commit`: conventional commits in English, no AI attribution, no secrets.

## Delivery Phases
1. Foundation setup — monorepo, skeletons, local environment, CI. (done)
2. Domain + data — Prisma models: User, Consent, MediaAsset, Scene, SceneTranslation, Moment,
   GenerationJob, FinalFilm, ShareLink; scene catalog seed with age rules; `GET /scenes`. (done)
3. Auth + consent — registration, session cookie, photo processing consent, age rules.
4. Photo pipeline — upload to private storage, AI photo job, status polling, regenerate with limits.
5. Video pipeline — video job from approved photo, queue/status, fallback on failure.
6. "Moja Smoki priča" — film strip with three periods, final montage job.
7. Sharing + return — export, share links/landing for friends, meaningful reminders.
8. Admin + analytics — success rate, limits, cost per generation, funnel.
9. Deployment — Dockerfiles, infrastructure, load test before 2027-01-01 launch.

## Open Decisions (from the proposal)
- Film length and format; final montage length.
- Generation limits per person/day and fallback rules.
- Minimum user age, consents, other people in frame, moderation, retention and deletion.
- Final translations, timezone for campaign start/end, server/storage capacity.
