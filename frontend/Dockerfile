# Next.js standalone image (build context: repository root).
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --ignore-scripts

COPY packages/shared packages/shared
COPY frontend frontend

# NEXT_PUBLIC_* values are inlined at build time.
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build -w @sffl/shared && npm run build -w @sffl/frontend

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3100 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/frontend/.next/standalone ./
COPY --from=build --chown=node:node /app/frontend/.next/static ./frontend/.next/static
COPY --from=build --chown=node:node /app/frontend/public ./frontend/public
USER node
EXPOSE 3100
CMD ["node", "frontend/server.js"]
