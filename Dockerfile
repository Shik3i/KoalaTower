# ── Build stage ─────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS build

ARG VITE_APP_VERSION=DEV
ENV VITE_APP_VERSION=${VITE_APP_VERSION}

WORKDIR /app

# Dependencies layer (cached unless package.json changes)
COPY package.json package-lock.json ./
RUN npm ci

# Source layer
COPY . .
RUN npm run build

# ── Runtime stage ───────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV DATABASE_PATH=/data/flatland.db

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/build ./build

RUN mkdir -p /data

EXPOSE 8080

CMD ["node", "build"]
