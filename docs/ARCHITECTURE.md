# Flatland TD Architecture

## Overview

Flatland TD is a local-first SvelteKit application. Gameplay remains client-side and offline-capable, while an optional Node/SQLite backend provides auth, cloud-save, support, operations, account deletion, and leaderboard features. The layered architecture keeps game logic, rendering, UI, and online routes separate.

```
┌─────────────────────────────────────────┐
│  Svelte UI (Reactively rendered)        │
│  • Routes: /, /play, /hub, /help, ...  │
│  • Reads from GameSnapshot (throttled)  │
│  • Fires events: purchase, start, save │
├─────────────────────────────────────────┤
│  GameEngine (Pure TypeScript, 60 FPS)   │
│  • Owns all simulation state            │
│  • Calls systems each frame             │
│  • Emits snapshots for UI (~6-10/s)     │
│  • Speed multiplier (1×-5×) + pause     │
├─────────────────────────────────────────┤
│  Systems (Pure functions)               │
│  • WaveSystem: spawns enemies           │
│  • EnemySystem: moves, attacks          │
│  • TowerSystem: stats, damage           │
│  • ProjectileSystem: targeting, hits    │
│  • EconomySystem: energy, alloy         │
├─────────────────────────────────────────┤
│  PixiJS WebGL Renderer (PixiGameView)   │
│  • Tower, enemies, projectiles, effects │
│  • Particle + damage number layers      │
│  • Background grid + starfield          │
│  • Neon bloom post-processing           │
│  • Screen shake, muzzle flash           │
├─────────────────────────────────────────┤
│  Save System (IndexedDB via idb-keyval) │
│  • Schema-versioned with migrations     │
│  • Auto-save + manual export/import     │
│  • Encoded save containers + checksums  │
└─────────────────────────────────────────┘
```

## Key Design Decisions

- **No framework rendering in game loop**: PixiJS/WebGL owns rendering, not Svelte.
- **Snapshot-based UI**: Svelte receives throttled snapshots from the engine, not real-time state.
- **Pure systems**: All game logic functions are testable without PixiJS or Svelte.
- **Data-driven configs**: Enemies, upgrades, labs, tiers, Schematic-gated upgrade paths, and achievements are defined as data arrays.
- **Schema-versioned saves**: Save migration is handled separately from game logic.
- **CSS variable design system**: All typography, colors, spacing use CSS custom properties in `app.css` — no hardcoded values in components.

## Project Structure

```
koala-tower/
├── LICENSE
├── README.md
├── Dockerfile
├── examples/
│   ├── docker-compose.yml
│   └── Caddyfile
├── docs/
│   ├── TODO.md
│   └── ARCHITECTURE.md
├── .github/workflows/
│   └── docker-publish.yml
├── src/
│   ├── app.html              # HTML shell + global meta/OG tags
│   ├── app.css               # Design tokens + global styles
│   ├── lib/
│   │   ├── version.ts
│   │   ├── online/               # Browser clients for optional online APIs
│   │   ├── server/               # Auth, SQLite, migrations, online route helpers
│   │   ├── pwa/                  # Service-worker registration and update handling
│   │   ├── components/
│   │   │   ├── Tutorial.svelte       # Reusable step-by-step overlay
│   │   │   ├── BossHealthBar.svelte  # ARIA progressbar for boss waves
│   │   │   ├── TowerStatsPanel.svelte
│   │   │   ├── EnemyStatsPanel.svelte
│   │   │   ├── FlatlandNews.svelte   # Rotating humorous news
│   │   │   └── Icon.svelte           # SVG icon component
│   │   ├── content/
│   │   │   └── flatlandNews.ts       # 120 news items
│   │   ├── stores/
│   │   │   ├── gameStore.ts          # Engine reference
│   │   │   └── gameUiStore.ts        # Alloy, settings, save state
│   │   ├── utils/
│   │   │   └── viewportPlacement.ts  # Tooltip positioning math
│   │   └── game/
│   │       ├── engine/       # Core engine + types + config
│   │       ├── systems/      # Pure game logic
│   │       ├── balance/      # Data configs + formulas
│   │       ├── progression/  # Unlock requirements for Schematic path reconstruction
│   │       ├── render/       # PixiJS WebGL rendering (death FX, effects, damage states)
│   │       ├── audio/        # Procedural Web Audio
│   │       ├── save/         # IndexedDB persistence
│   │       └── __tests__/    # Vitest unit tests
│   ├── routes/
│   │   ├── admin/             # Read-only server-gated operations panel
│   │   ├── api/               # Auth, cloud-save, support, leaderboard, and health APIs
│   │   ├── +layout.svelte    # Global footer + lab polling + toasts
│   │   ├── +error.svelte     # Themed error page (404/500)
│   │   ├── +page.svelte      # Home / landing page
│   │   ├── play/             # Game screen (canvas + HUD + vignette + boss intro + killstreak)
│   │   ├── hub/              # Forge, Lab, Schematics, Fronts, Black Market, etc.
│   │   ├── help/             # FAQ + lore + replay tutorials
│   │   ├── privacy/          # Privacy policy
│   │   ├── imprint/          # Legal notice
│   │   └── sitemap.xml/      # Dynamic XML sitemap
├── static/
│   ├── robots.txt
│   ├── favicon.svg
│   ├── manifest.json
│   └── branding/             # Logo SVGs (small/medium/large)
└── build/                    # Static output (gitignored)
```

## Currency System

| Currency       | Icon     | Type       | Earned by          | Spent on                                              |
|----------------|----------|------------|--------------------|-------------------------------------------------------|
| Energy         | ⚡       | Temporary  | Destroying shapes  | Field upgrades / overclocks (per deployment)          |
| Alloy          | 🔩       | Permanent  | Destroying shapes  | Forge upgrades + Research Deck                        |
| Schematics     | §        | Per-Front  | Boss drops + milestones | Upgrade-path reconstruction (per-Front)          |
| Strange Matter | ◈        | Permanent  | Local Black Market | QoL unlocks, weekly shipments, daily pickup           |

## Progression Systems

### Forge (Workshop)
14 permanent tower upgrades bought with Alloy. Pre-installed before every deployment. Max levels range from 19–6000.

### Research Deck (Lab)
5 time-based orbital research projects. Run in real time (offline too). Multiplicative bonuses stack with Forge. Browser notifications for completion.

### Schematics
Per-Front design fragments. Bosses have a wave-scaled chance to drop repeatable Schematics (about 28% at Wave 10, reaching 100% at Wave 1000), first-time wave milestones grant larger guaranteed one-time drops, and the Schematics tab reconstructs compatible upgrade paths from them. Internal Blueprint IDs remain as legacy compatibility names; there is no separate "find the blueprint first" state.

### Fronts (internal TierId compatibility)
16 Fronts across 4 bands (Perimeter → Redline → Blacksite → Anomaly) with escalating difficulty and Schematics rewards. Fronts unlock sequentially from the previous Front; transitions into Redline, Blacksite, and Anomaly use higher milestone gates.

### Achievements
39 achievements across 7 categories (deployments, best wave, shapes destroyed, bosses defeated, field upgrades, alloy earned, killstreak). Each awards Alloy.

### Black Market
Hidden local-first Strange Matter system. Supports weekly shipments, daily pickup, optional support copy, contraband quality-of-life unlocks (auto-deployment, speed unlocks, schematic converter), and a discovery storyboard. No backend, payment, or online check is required for rewards.

### Command Orders
Weekly official Alloy assignments issued by Orbital Command. Up to 25 orders per local week with 5 visible at a time on a board that refreshes every 4 hours. Every 5 completed orders unlocks a Command Gift Box. Rewards are Alloy only — no Strange Matter, no premium currency. No streaks or login punishment.

### Optional Online Foundation
Optional online features run in the same SvelteKit Node server that serves the frontend. SQLite lives at `DATABASE_PATH` (default: `/data/flatland.db`) and is initialized by source-controlled migrations. Normal gameplay remains local-first: no login, backend, or network access is required after the app is loaded/cached. The service worker bypasses `/api/`, and frontend helpers (`src/lib/online/*`) treat any API failure/timeout as offline state and never block gameplay.

Implemented online features:
- **Auth** — optional username/password accounts (`/api/auth/register|login|logout|me`). `httpOnly` session cookies; no password or token in `localStorage`. Local play keeps working logged-out or offline.
- **Cloud save** — manual backup/sync for logged-in users (`/api/cloud-save`). GET returns `{ exists, metadata, saveJson? }` (full save only with `?includeSave=1`). Upload and restore are explicit user actions; cloud never auto-overwrites local data, and on login only metadata is fetched. Restore re-encodes the payload through the standard migration/import pipeline so a newer-schema cloud save is refused, not crashed.
- **Community Alloy Boost** — a global Ko-fi-funded Alloy multiplier (`/api/community-buff`). `+1%` Alloy per €1 for 7 days, capped at +100% server-side; the client clamps `0..100`. It applies to all players and boosts Alloy income only (never Energy/Strange Matter/Schematics). If the API/DB is down, the GET returns a neutral `0%` and the client hides the widget.
- **Support code** — a `FLTD-…` code derived from the local identity (or the account, when logged in), shown in Systems for future Ko-fi attribution only. Mirrors `src/lib/server/supportCode.ts` so codes match.
- **Ko-fi webhook** (`/api/kofi/webhook`) — accepts the Ko-fi `data=<json>` form payload (and raw JSON), verifies the payload's `verification_token` against `KOFI_WEBHOOK_SECRET`, redacts the token before storing, is idempotent on `message_id`, and only verified EUR events create a community buff. In production a missing `KOFI_WEBHOOK_SECRET` disables the endpoint entirely (no event, no buff).
- **Admin / operations panel** (`/admin`) — a read-only ops panel gated server-side by the server-only `ADMIN_USERNAMES` list (comma-separated, case-insensitive; no `PUBLIC_` equivalent). Guarded in `src/routes/admin/+layout.server.ts` and again in each `+page.server.ts` via `requireAdmin` (`src/lib/server/admin.ts`); non-admins get a `404`. Shows overview cards plus Users/Ko-fi/Community-buff/Error-log tables, never exposing hashes, peppers, tokens, cookies, or full cloud-save JSON. v1 has no mutating actions.
- **Error log** — unexpected server errors are persisted (truncated, secret-free) into `app_error_logs` via `handleError` in `src/hooks.server.ts` + `src/lib/server/errorLog.ts`, retained to the latest 1000 rows. No Docker logs/socket or shell execution involved.
- **Community leaderboard** — `/api/leaderboard/unverified` stores explicitly unverified client-submitted standard-run data for a fun ranking only.
- **Verified challenge leaderboard** — `/api/leaderboard/verified/start` issues an account-bound one-time ticket; `/api/leaderboard/verified` replays the fixed server ruleset and writes only server-calculated results. The official board is separate from the community board.
- **Account deletion** — `/api/auth/account` deletes private account data and anonymizes linked leaderboard rows as `Deleted account`; verified tickets are account-cascaded and cannot be submitted after deletion.
- Challenge rules, seed, viewport, and fixed timestep are versioned in `src/lib/game/balance/verifiedChallenges.ts` and hashed before a ranked result is stored.

**Known technical debt:**
- **`serve_prerendered()` workaround:** `@sveltejs/adapter-node` 5.5.5 sirv-based streaming deadlocks on Node 20+ on some hosts. `scripts/patch-adapter-node.mjs`, invoked by `npm run build`, removes the middleware from the Polka chain, rebases the adapter's asset directory, and lets `src/hooks.server.ts` serve prerendered files via `readFileSync`. When adapter-node is upgraded, re-evaluate the patch and hook.
- **CSRF boundary for Ko-fi:** `svelte.config.js` uses `trustedOrigins: ['*']` because Ko-fi sends an external `application/x-www-form-urlencoded` webhook without a browser `Origin`. State-changing JSON routes remain protected at the application layer: `readJsonObject` (`src/lib/server/api.ts`) rejects requests without `Content-Type: application/json`, which a cross-site page cannot set without a CORS preflight the server never approves. Keep this boundary narrow: any future form-based mutation needs its own verification and rate limit.
- **Cloud restore reload:** Cloud save restore currently calls `location.reload()` after import. A proper state-reinitialization (without a full page reload) would be preferable.
- **Node 22:** The Dockerfile locks to Node 20 LTS until the streaming deadlock is confirmed fixed on Node 22+.

Intentionally out of scope / not implemented: the full damage-type/resistance combat pipeline and UI, guilds, payment/shop UI, personal paid power, supporter badge/skin entitlement UI, OAuth, email/password reset, and automatic cloud-save overwrite. Current resistance values for Fronts 9–16 are placeholder scaffolding only. Ko-fi support never grants personal power.

## Deployment

### One container, one process
The `Dockerfile` produces a single Node image that serves both the frontend (prerendered HTML + client assets) and all `/api/*` routes. No Nginx, no second container, no separate API tier.

```
Browser → Reverse Proxy (Caddy/Traefik/Nginx) → Node :8080
                                                  ├─ /            (prerendered HTML)
                                                  ├─ /play/       (prerendered HTML)
                                                  ├─ /_app/*      (client JS/CSS/assets)
                                                  └─ /api/*       (Node handlers → SQLite)
```

### SQLite
Server-side data (accounts, sessions, cloud saves, Ko-fi events, community buff events, community leaderboard rows, verified challenge tickets/runs, and error logs) lives in SQLite at `DATABASE_PATH` (default `/data/flatland.db`). Migrations run automatically on first access and record versions in `schema_migrations`. WAL mode is enabled when the filesystem supports it. Back up the `.db`, `.db-wal`, and `.db-shm` files together.

### Environment variables
Required in production: `SESSION_SECRET` and `AUTH_PASSWORD_PEPPER`; `KOFI_WEBHOOK_SECRET` is required for an active Ko-fi webhook. `DATABASE_PATH` is optional and defaults to `/data/flatland.db`. See `README.md` and `.env.example` for the full list. No `PUBLIC_` prefix for secrets — all secret env vars are server-only.

### Docker Compose
`docker-compose.example.yml` provides a production-ready Caddy reverse-proxy setup with persistent volume, optional read-only root filesystem, security hardening, and a healthcheck.

### Ko-fi webhook
Paste `https://<your-domain>/api/kofi/webhook` into Ko-fi. Ko-fi sends `application/x-www-form-urlencoded` with a `data=<json>` field. The server verifies the `verification_token` from the payload against `KOFI_WEBHOOK_SECRET`. Only verified EUR payments create community buffs.

## Render Feedback Systems

- **Death proxies**: Render-only corpses (capped at 60, 200ms lifetime) that scale-out + spin + fade — never enter combat state
- **Cosmetic killstreak**: Escalating chain counter near tower (cyan → yellow → pink), resets on tower damage or a new run, survives wave lulls, grants no resources
- **Enemy damage states**: Fracture lines + tint shift at ≤50% / ≤25% HP (no per-enemy HP bars)
- **Low-HP vignette**: Red radial CSS overlay that pulses <30% tower HP, stronger <15%
- **Boss intro flash**: One-shot centered overlay on boss-wave start (~850ms)
- **Floating text variety**: 8 distinct kind styles (damage/crit/energy/alloy/strange/schematic/chain/error)
- **Number count-up**: Svelte action with cubic ease-out on currency/wave pills

## Wave Scaling

- Waves increase enemy HP, damage, speed, armor, and reward using piecewise power interpolation.
- Armor reduces incoming damage (caps at 70%).
- Boss waves every 10 waves — boss appears at the end of a normal spawn schedule.
- Early waves (1–10) use a gentler scaling curve for onboarding.
- Supports 10,000+ waves with deterministic stat anchors.
- **Shiny enemies**: Rare elite variants with higher HP and double rewards, highlighted by a pulsing gold glow.

## UI/UX Features

- **Two tutorials**: Deployment page + Orbital Command hub, both replayable via Help page
- **Bulk upgrade**: Shift+Click (×5), Ctrl+Click (Max), toggle buttons [×1 ×5 ×10 ×50 Max]
- **Mobile speed control**: Single large button expands to speed menu
- **Touch targets**: ≥44px minimum for all interactive elements
- **Safe area**: iOS home indicator padding
- **Lab notifications**: Global toasts + optional browser notifications
- **Loading state**: Instant page render; action buttons disabled with spinner until IndexedDB ready
- **Global footer**: Consistent navigation across all pages
