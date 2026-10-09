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

## Real AI generation (Vertex AI)

AI generation uses the mock provider unless `AI_PROVIDER=gemini` is set. On the server Vertex AI is
reached with a service account:

1. Google Cloud console → IAM & Admin → Service Accounts → create `sffl-dev-server` with the single role
   **Vertex AI User** → Keys → Add key → JSON.
2. Copy the key to the server and delete the downloaded copy:
   ```sh
   scp ~/Downloads/<key>.json deploy@<server>:/opt/sffl/secrets/gcp-vertex.json
   ssh deploy@<server> 'chmod 700 /opt/sffl/secrets && chmod 600 /opt/sffl/secrets/gcp-vertex.json'
   rm ~/Downloads/<key>.json
   ```
3. Add to `/opt/sffl/.env.production`:
   ```
   AI_PROVIDER=gemini
   GEMINI_USE_VERTEX=true
   GOOGLE_CLOUD_PROJECT=<project id>
   GOOGLE_CLOUD_LOCATION=global
   GEMINI_IMAGE_MODEL=gemini-nano-banana-2.1
   GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/sffl/gcp-vertex.json
   AI_ALLOWED_EMAILS=<comma-separated test accounts>
   AI_DAILY_CAP=100
   ```
`/opt/sffl/secrets` is mounted read-only at `/run/secrets/sffl` in the backend, worker and migrate
containers. The backend refuses to start when the key file or project is missing. `AI_ALLOWED_EMAILS`
limits AI to test accounts (the dev server is public and Google sign-in verifies email instantly);
`AI_DAILY_CAP` caps photo generations per 24 h for the whole server. Rotate the key by creating a new
one, replacing the file, redeploying and deleting the old key in the console.

## One-time setup

1. Create a deploy key on your machine:
   `ssh-keygen -t ed25519 -C "github-actions-deploy@smoki-dev" -f ~/.ssh/sffl_deploy -N ""`
2. Create the server (Ubuntu) with `~/.ssh/sffl_deploy.pub` as its SSH key, then either
   - paste `deploy/hetzner/cloud-init.yaml` as "Cloud config" (with `__DEPLOY_PUBLIC_KEY__` replaced), or
   - after creation run
     `ssh root@<server-ip> "DEPLOY_PUBLIC_KEY='$(cat ~/.ssh/sffl_deploy.pub)' bash -s" < deploy/hetzner/bootstrap.sh`.

   Current dev server: CPX22, Falkenstein, `138.201.152.23`.
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
