# ── Build stage ─────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS build

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
RUN npm prune --omit=dev && npm cache clean --force

# ── Runtime stage ───────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime

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
