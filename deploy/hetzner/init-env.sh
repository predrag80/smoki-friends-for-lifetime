#!/usr/bin/env bash
# Creates /opt/sffl/.env.production once, with secrets generated on the server itself.
# Usage (on the server): APP_DOMAIN=... API_DOMAIN=... MAIL_DOMAIN=... bash init-env.sh
set -euo pipefail

ENV_FILE="${ENV_FILE:-/opt/sffl/.env.production}"

if [ -f "$ENV_FILE" ]; then
  echo "$ENV_FILE already exists; leaving it unchanged."
  exit 0
fi

: "${APP_DOMAIN:?APP_DOMAIN is required}"
: "${API_DOMAIN:?API_DOMAIN is required}"
: "${MAIL_DOMAIN:?MAIL_DOMAIN is required}"

umask 077
cat > "$ENV_FILE" <<ENV
# Generated $(date -u +%Y-%m-%dT%H:%M:%SZ). Edit by hand for SMTP, Google or Gemini keys.
APP_DOMAIN=${APP_DOMAIN}
API_DOMAIN=${API_DOMAIN}
MAIL_DOMAIN=${MAIL_DOMAIN}

POSTGRES_DB=sffl
POSTGRES_USER=sffl
POSTGRES_PASSWORD=$(openssl rand -hex 24)

STORAGE_ACCESS_KEY=SFFL$(openssl rand -hex 8 | tr '[:lower:]' '[:upper:]')
STORAGE_SECRET_KEY=$(openssl rand -hex 24)

MAILPIT_UI_AUTH=admin:$(openssl rand -hex 12)
MAIL_FROM="Smoki Friend for a Lifetime <no-reply@${APP_DOMAIN}>"

# Optional
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GEMINI_API_KEY=
ENV

echo "Created $ENV_FILE"
