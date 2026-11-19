# syntax=docker/dockerfile:1

# ---- Build ----
FROM node:24-bookworm-slim AS build
WORKDIR /app

# better-sqlite3 (used by @nuxt/content at build time) compiles from source on Linux.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# Install dependencies first so they are cached between source changes.
# Install scripts run after the source is copied, because `nuxt prepare` needs it.
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm rebuild && npm run build

# ---- Runtime ----
# Only the self-contained Nitro output ships. The archive itself is never part of the image:
# it is bind-mounted from the host at /archive (see compose.yaml).
FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    NUXT_ARCHIVE_DIR=/archive
WORKDIR /app

COPY --from=build --chown=node:node /app/.output ./.output

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/status').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", ".output/server/index.mjs"]
