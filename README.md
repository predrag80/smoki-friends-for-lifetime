# Smoki Friend for a Lifetime

A personalised AI experience: users see themselves at three stages of life with Smoki and receive
a photo, a short film and a final "Friend for a Lifetime" film. Engineering decisions are documented
in [AGENTS.md](AGENTS.md).

## Structure

```
frontend/         Next.js 16 application
backend/          Fastify API + worker
packages/shared/  shared domain rules, zod schemas and types
dev/              local services (docker compose)
```

## Prerequisites

- Node.js 22 (`nvm use`)
- OrbStack (Docker engine + `docker compose`)
- Free ports 1025, 3100, 4100, 4101, 5433, 6380, 8025, 9000 and 9001

## Local development

1. Dependencies and env files:

   ```sh
   npm install
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env.local
   ```

2. Services (Postgres, Valkey, RustFS storage, Mailpit):

   ```sh
   npm run dev:services
   ```

3. Database: migrations and scene seed:

   ```sh
   npm run prisma:migrate:dev -w @sffl/backend
   npm run db:seed -w @sffl/backend
   ```

4. Dev servers (frontend, API and worker together, in one terminal):

   ```sh
   npm run dev
   ```

   Individually: `npm run dev:frontend`, `npm run dev:backend`, `npm run dev:worker`.

| Service | Port |
|---|---|
| Frontend | 3100 |
| API | 4100 (health: `/health`) |
| Worker health | 4101 |
| Postgres | 5433 |
| Valkey | 6380 |
| Storage (RustFS) | 9000 (S3 API), 9001 (console) |
| Mailpit (local email) | 1025 (SMTP), 8025 (inbox) |

### Google sign-in (optional)

Create an OAuth client of type "Web application" in Google Cloud, add the redirect URI
`http://localhost:4100/auth/google/callback`, and set `GOOGLE_OAUTH_CLIENT_ID` and
`GOOGLE_OAUTH_CLIENT_SECRET` in `backend/.env`. Without them the Google button is hidden.

## Production mode locally

```sh
npm run build
npm start
```

## Checks

```sh
npm run lint
npm run typecheck
npm run test
npm run build
```

CI runs the same steps (`.github/workflows/ci.yml`).
