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
RUN npm ci

# Source layer
COPY . .
RUN npm run build

# ── Workaround for @sveltejs/adapter-node 5.5.5 ──────────────────────
#
# The adapter compiles a serve_prerendered() middleware (sirv-based)
# that streams prerendered HTML via createReadStream + pipe.  On
# Node 20+ on some hosts this stream pipeline deadlocks — the read
# stream never emits data, so the response hangs forever.
#
# We remove serve_prerendered() from the Polka middleware chain so
# requests fall through to the SSR handler, where hooks.server.ts
# serves prerendered files via readFileSync (see src/hooks.server.ts).
#
# The sed target pattern must match EXACTLY for this build to pass.
# If the pattern silently fails to match (adapter-node output changed),
# the grep after sed will catch it and fail the build.
#
# Reported as "serve_prerendered() streaming deadlock".
# When upgrading @sveltejs/adapter-node, re-evaluate.
# ──────────────────────────────────────────────────────────────────────
RUN grep -rl 'serve_prerendered()' build/server/chunks/CEnv*.js | while read f; do \
	sed -i 's/ serve_prerendered(), ss/, ss/' "$f"; \
	echo "patched $f"; \
done
# Fail the build if serve_prerendered() is still present (sed missed).
RUN if grep -q 'serve_prerendered(), ss' build/server/chunks/CEnv*.js 2>/dev/null; then \
	echo "ERROR: serve_prerendered() workaround failed — pattern changed?" >&2; \
	grep -o '.serve_prerendered.......' build/server/chunks/CEnv*.js >&2; \
	exit 1; \
fi

# ── Fix for @sveltejs/adapter-node 5.5.5 static-asset 404 ────────────
#
# The adapter's Rollup config emits the handler logic (serve(), the read()
# asset_dir, etc.) into a SHARED chunk under build/server/chunks/ (see
# `chunkFileNames: 'server/chunks/[name]-[hash].js'` in the adapter). The
# chunk computes its base dir from its own location:
#
#   const dir = path.dirname(fileURLToPath(import.meta.url));
#
# which resolves to /app/build/server/chunks — NOT the build root. So
# serve(path.join(dir,'client')) points at /app/build/server/chunks/client,
# which does not exist; serve() returns undefined and is filtered out of the
# Polka chain, and every _app/immutable/* asset + /service-worker.js 404s.
# The same wrong `dir` also breaks the read() asset_dir.
#
# Fix: rebase `dir` two levels up to the build root (/app/build). One edit
# corrects serve(client), serve(prerendered) and asset_dir together. The
# patch is matched by content (not the hashed filename) and guarded so the
# build fails loudly if adapter-node's layout ever changes.
# ──────────────────────────────────────────────────────────────────────
RUN found=0; \
	for f in build/server/chunks/*.js; do \
		if grep -q 'const dir = path.dirname(fileURLToPath(import.meta.url));' "$f"; then \
			sed -i "s#const dir = path.dirname(fileURLToPath(import.meta.url));#const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');#" "$f"; \
			echo "patched dir resolution in $f"; found=1; \
		fi; \
	done; \
	if [ "$found" -eq 0 ]; then \
		echo "ERROR: adapter-node dir-resolution pattern not found — layout changed?" >&2; \
		exit 1; \
	fi

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
