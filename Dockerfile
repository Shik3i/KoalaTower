# ── Build stage ─────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS build

ARG VITE_APP_VERSION=DEV
ENV VITE_APP_VERSION=${VITE_APP_VERSION}

WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends python3 make g++ \
	&& rm -rf /var/lib/apt/lists/*

# Dependencies layer (cached unless package.json changes)
COPY package.json package-lock.json ./
RUN npm ci

# Source layer
COPY . .
RUN npm run build
# Workaround for @sveltejs/adapter-node 5.5.5: the sirv-based
# serve_prerendered() middleware deadlocks on Node 20+ streaming.
# Remove it from the middleware chain so requests fall through to SSR
# where hooks.server.ts serves prerendered files via readFileSync.
RUN for f in build/server/chunks/CEnv*.js; do \
      if grep -q 'serve_prerendered()' "$f"; then \
        sed -i 's/ serve_prerendered(), ss/, ss/' "$f"; \
        echo "patched $f"; \
        break; \
      fi; \
    done
RUN npm prune --omit=dev && npm cache clean --force

# ── Runtime stage ───────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV DATABASE_PATH=/data/flatland.db

COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 8080

CMD ["node", "build"]
