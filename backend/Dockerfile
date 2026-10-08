# Backend image for the API and the worker (build context: repository root).
FROM node:22-alpine
RUN apk add --no-cache openssl
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
# Workspace postinstall needs the sources, so scripts run explicitly below.
RUN npm ci --ignore-scripts

COPY packages/shared packages/shared
COPY backend backend
RUN npm run build -w @sffl/shared \
  && npx --workspace @sffl/backend prisma generate \
  && npm run build -w @sffl/backend

ENV NODE_ENV=production
WORKDIR /app/backend
EXPOSE 4100
CMD ["node", "dist/index.js"]
