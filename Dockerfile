# ── Build stage ─────────────────────────────────────────────────────
FROM node:22-alpine AS build

ARG VITE_APP_VERSION=DEV
ENV VITE_APP_VERSION=${VITE_APP_VERSION}

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run check
RUN npm test
RUN npm run build

# ── Runtime stage ───────────────────────────────────────────────────
FROM ghcr.io/static-web-server/static-web-server:2-alpine

COPY --from=build /app/build /public

EXPOSE 8080

ENV SERVER_PORT=8080
ENV SERVER_ROOT=/public
ENV SERVER_SPA_FALLBACK=/index.html
