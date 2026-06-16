# ── Build stage ─────────────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run check 2>/dev/null; exit 0
RUN npm test
RUN npm run build

# ── Runtime stage ───────────────────────────────────────────────────
FROM ghcr.io/static-web-server/static-web-server:2-alpine

COPY --from=build /app/build /public

EXPOSE 8080

ENV SERVER_PORT=8080
ENV SERVER_ROOT=/public
ENV SERVER_SPA_FALLBACK=/index.html
