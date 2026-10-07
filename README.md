# Smoki Friend for a Lifetime

Personalizovano AI iskustvo: korisnik vidi sebe u tri životna doba uz Smoki i dobija fotografiju,
kratak film i finalni "Friend for a Lifetime" film. Inženjerske odluke su u [AGENTS.md](AGENTS.md).

## Struktura

```
frontend/         Next.js 16 aplikacija (app.smoki.local)
backend/          Fastify API + worker (api.smoki.local)
packages/shared/  zajedničke zod šeme i tipovi
dev/              lokalni servisi (docker compose) i Caddy konfiguracija
```

## Preduslovi

- Node.js 22 (`nvm use`)
- Docker engine: Colima (`colima start`) ili OrbStack, uz `docker compose` plugin
- Slobodni portovi 80, 5432, 6379, 9000 i 9001. Ako DDEV zauzima port 80, pokreni `ddev poweroff`.

## Lokalno pokretanje

1. Lokalni domeni (jednom). Na macOS-u je to fajl `/etc/hosts` (link na `/private/etc/hosts`):

   ```sh
   echo "127.0.0.1 app.smoki.local api.smoki.local" | sudo tee -a /etc/hosts
   ```

   Ili ručno: `sudo nano /etc/hosts`, dodaj liniju, sačuvaj (Ctrl+O, Enter, Ctrl+X).

2. Zavisnosti i env fajlovi:

   ```sh
   npm install
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env.local
   ```

3. Servisi (Postgres, Valkey, MinIO, Caddy):

   ```sh
   npm run dev:services
   ```

4. Prisma klijent:

   ```sh
   npm run prisma:generate -w @sffl/backend
   ```

5. Dev serveri (frontend, API i worker zajedno, u jednom terminalu):

   ```sh
   npm run dev
   ```

   Pojedinačno: `npm run dev:frontend`, `npm run dev:backend`, `npm run dev:worker`.

Aplikacija: http://app.smoki.local · API health: http://api.smoki.local/health ·
MinIO konzola: http://localhost:9001 (sffl / sffl-secret)

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
