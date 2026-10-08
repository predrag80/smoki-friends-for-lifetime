# Deployment (Hetzner dev server)

Every push to `main` runs CI; when CI passes, `.github/workflows/deploy.yml` deploys to the server:

1. rsync the repository to `/opt/sffl/app` as user `deploy`
2. create `/opt/sffl/.env.production` on the first deploy (`deploy/hetzner/init-env.sh`, secrets generated on the server)
3. `docker compose build`, run migrations + seed (`migrate` service), restart the stack
4. check `GET /health` inside the backend container

## Stack (`deploy/docker-compose.prod.yml`)

| Service | Role |
|---|---|
| caddy | HTTPS (automatic certificates) and routing for the three domains |
| frontend | Next.js standalone server (3100) |
| backend | Fastify API (4100) |
| worker | background jobs |
| postgres, valkey | database and cache/locks (internal only) |
| storage | RustFS S3-compatible private bucket (internal only) |
| mailpit | dev inbox at `https://mail.<domain>` with basic auth |

Domains (defaults, override with repository variables `APP_DOMAIN`, `API_DOMAIN`, `MAIL_DOMAIN`):

- `smoki-dev.prowebsystems.rs` → app
- `api.smoki-dev.prowebsystems.rs` → API
- `mail.smoki-dev.prowebsystems.rs` → Mailpit

Each needs an A record pointing to the server's IPv4 address.

## One-time setup

1. Create a deploy key on your machine:
   `ssh-keygen -t ed25519 -C "github-actions-deploy@smoki-dev" -f ~/.ssh/sffl_deploy -N ""`
2. Create the server (Ubuntu 24.04) and paste `deploy/hetzner/cloud-init.yaml` as "Cloud config",
   with `__DEPLOY_PUBLIC_KEY__` replaced by `~/.ssh/sffl_deploy.pub`.
3. GitHub repository → Settings → Secrets and variables → Actions:
   - secret `HETZNER_SSH_KEY` = content of `~/.ssh/sffl_deploy` (private key)
   - variable `HETZNER_HOST` = server IPv4
4. Push to `main` or run the workflow manually (Actions → Deploy → Run workflow).

Until `HETZNER_HOST` and `HETZNER_SSH_KEY` exist, the deploy job is skipped.

## On the server

```sh
ssh -i ~/.ssh/sffl_deploy deploy@<server-ip>
cd /opt/sffl/app
docker compose -f deploy/docker-compose.prod.yml --env-file /opt/sffl/.env.production ps
docker compose -f deploy/docker-compose.prod.yml --env-file /opt/sffl/.env.production logs -f backend
grep MAILPIT_UI_AUTH /opt/sffl/.env.production   # Mailpit login (user:password)
```

To add SMTP, Google or Gemini keys, edit `/opt/sffl/.env.production` on the server and redeploy.
