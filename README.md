# Smoki Friend for a Lifetime

Personalizovano AI iskustvo: korisnik vidi sebe u tri životna doba uz Smoki i dobija fotografiju,
kratak film i finalni "Friend for a Lifetime" film. Inženjerske odluke su u [AGENTS.md](AGENTS.md).

## Struktura

```
frontend/         Next.js 16 aplikacija
backend/          Fastify API + worker
packages/shared/  zajednička domenska pravila, zod šeme i tipovi
dev/              lokalni servisi (docker compose)
```

## Preduslovi

- Node.js 22 (`nvm use`)
- OrbStack (Docker engine + `docker compose`)
- Slobodni portovi 3100, 4100, 4101, 5433, 6380, 9000 i 9001

## Lokalno pokretanje

1. Zavisnosti i env fajlovi:

   ```sh
   npm install
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env.local
   ```

2. Servisi (Postgres, Valkey, RustFS storage):

   ```sh
   npm run dev:services
   ```

3. Baza: migracije i seed scena:

   ```sh
   npm run prisma:migrate:dev -w @sffl/backend
   npm run db:seed -w @sffl/backend
   ```

4. Dev serveri (frontend, API i worker zajedno, u jednom terminalu):

   ```sh
   npm run dev
   ```

   Pojedinačno: `npm run dev:frontend`, `npm run dev:backend`, `npm run dev:worker`.

| Servis | Port |
|---|---|
| Frontend | 3100 |
| API | 4100 (health: `/health`) |
| Worker health | 4101 |
| Postgres | 5433 |
| Valkey | 6380 |
| Storage (RustFS) | 9000 (S3 API), 9001 (konzola) |

## Produkcioni režim lokalno

```sh
npm run build
npm start
```

## Provere

```sh
npm run lint
npm run typecheck
npm run test
npm run build
```

Isti koraci se izvršavaju u CI-ju (`.github/workflows/ci.yml`).
