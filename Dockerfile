# ── Build stage ─────────────────────────────────────────────────────
# Node 20 LTS is used because the sirv-based static-file middleware in
# @sveltejs/adapter-node 5.5.5 deadlocks on Node 22+ on some hosts when
# streaming prerendered HTML.  Node 20 is the most recent LTS that works
# reliably here.  When adapter-node is updated, try Node 22 again.
FROM node:20-bookworm-slim AS build

ARG VITE_APP_VERSION=DEV
ENV VITE_APP_VERSION=${VITE_APP_VERSION}

WORKDIR /app

# native addon build-time deps (better-sqlite3)
RUN apt-get update \
	&& apt-get install -y --no-install-recommends python3 make g++ \
	&& rm -rf /var/lib/apt/lists/*

# Dependencies layer (cached unless package.json changes)
COPY package.json package-lock.json ./
# Sync package.json version to the tag/release so the image always
# reports the correct version even when the source file was stale.
RUN sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"${VITE_APP_VERSION#v}\"/" package.json
RUN npm ci

# Source layer
COPY . .
RUN npm run build

# `npm run build` applies the guarded adapter-node runtime patch in
# scripts/patch-adapter-node.mjs. Keeping that patch in the build script means
# local production smoke tests, CI E2E, and this image use the same artifact.

RUN npm prune --omit=dev && npm cache clean --force

# ── Runtime stage ───────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runtime

WORKDIR /app

# Required env vars (set persisted values here; secrets come from runtime)
#   SESSION_SECRET          — long random string for session-token hashing
#   AUTH_PASSWORD_PEPPER    — long random string for password hashing
#   KOFI_WEBHOOK_SECRET     — must match Ko-fi verification_token; missing
#                             in production disables the webhook entirely
ENV NODE_ENV=production
ENV PORT=8080
ENV DATABASE_PATH=/data/flatland.db

COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

# Persistent SQLite volume — mount at runtime, e.g. -v flatland-data:/data
RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 8080

CMD ["node", "build"]
