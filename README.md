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
- OrbStack (Docker engine + `docker compose`)
- Lokalni nginx na portu 80 (Homebrew) i slobodni portovi 5432, 6379, 9000 i 9001

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

3. Lokalni nginx za domene (jednom). Homebrew nginx već drži port 80, pa on rutira domene:

   ```sh
   cp dev/nginx/smoki.local.conf "$(brew --prefix)/etc/nginx/servers/"
   sudo nginx -t && sudo nginx -s reload
   ```

   Bez lokalnog nginx-a koristi Caddy: `docker compose -f dev/docker-compose.dev.yml --profile proxy up -d`.

4. Servisi (Postgres, Valkey, RustFS storage):

   ```sh
   npm run dev:services
   ```

5. Prisma klijent:

   ```sh
   npm run prisma:generate -w @sffl/backend
   ```

6. Dev serveri (frontend, API i worker zajedno, u jednom terminalu):

   ```sh
   npm run dev
   ```

   Pojedinačno: `npm run dev:frontend`, `npm run dev:backend`, `npm run dev:worker`.

Aplikacija: http://app.smoki.local · API health: http://api.smoki.local/health ·
Storage konzola (RustFS): http://localhost:9001 (SFFLDEVACCESSKEY / sffl-dev-secret-key)

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
