# Changelog

## v0.12.0 — Verified challenge leaderboard

- Added account-bound verified challenge run tickets with one-time submission and expiry.
- Added a server-side deterministic replay validator. Ranked runs use server-defined challenge seeds, fixed Front 1 rules, fixed loadout, fixed viewport, and fixed simulation timestep.
- Added an official Verified Challenge Leaderboard whose score, verification hash, and rank are calculated server-side. Client-provided score values are never trusted.
- Kept the existing Community Leaderboard explicitly unverified and separate from the official ranking.
- Added migration 3 for verified run tickets, challenge IDs, and one-time verified-run IDs.
- Account deletion anonymizes linked verified and community leaderboard history as `Deleted account` while deleting private sessions, cloud saves, identities, entitlements, and supporter links.
- Added replay determinism, ticket lifecycle, duplicate-submit, forged-result, and migration coverage.
- Release checks: `npm run check` (0 errors/warnings), `npm test` (51 files / 660 tests), production build, Playwright smoke, Docker build, fresh-DB migration, and in-container runtime smoke.

## v0.11.2 — Orbital Command tabs and service worker

- Fixed Orbital Command tab switching getting stuck.
- Hardened service-worker registration and update handling.

## v0.11.1 — Runtime, economy, and persistence fixes

- Fixed render, audio, routing, economy, UI persistence, and Command Orders issues.
- Corrected HP and regeneration scaling and closed the Command Orders exploit.

## v0.11.0 — Hub customization

- Added Hub customization surfaces and background themes.

## v0.10.5 — Audit hardening

- Hardened CSRF boundaries, terminology, autosave behavior, simulator alignment, and Hub keyboard navigation.

## v0.10.0–v0.10.4 — Performance and customization

- Added the initial tower-skin shop and mobile gesture/input improvements.
- Added balance, renderer, stat-panel, notification, and multiple hot-path performance fixes.

## v0.9.12–v0.9.19 — Combat feedback and runtime polish

- Added and refined the cosmetic killstreak presentation.
- Added ranged projectiles, 360° multishot, FPS reporting, render optimizations, lazy procedural audio, dynamic music, Quadtree targeting, and interactive SVG statistics.
- Hardened audio lifecycle handling and dynamic boss progression.

## v0.9.11 — Schematic documentation audit

- Audited the Schematic path reconstruction rollout and removed stale public documentation that still described a separate Blueprint discovery/RNG step.
- Updated Help, README, architecture notes, TODO status, and What's New copy to describe the current model: path requirement + enough Front Schematics = direct reconstruction.
- Clarified that boss Schematic rewards are chance-based and scale with boss wave, while first-time wave milestones remain guaranteed one-time rewards.

## v0.9.4 — Fix Play screen stuck on "Initializing Quantum Core"

- **Fixed the Play screen hanging forever on the loading overlay**, leaving the Deploy button unreachable. The "INITIALIZING QUANTUM CORE" overlay (added in 056d8a0) was given `z-index: 100`, an opaque background, and `pointer-events: all`, so it sat on top of the launch screen (`z-index: 10`). Because the Pixi renderer is only created on deploy, `pixiReady` stays `false` while the launch screen is up, so the overlay permanently covered and blocked the Deploy button — the run could never start. The loading overlay is now suppressed while the launch screen is visible, and defensively restored to `pointer-events: none` and a `z-index` below the launch screen.
- Verified locally against the production build: launch screen renders and is clickable, deploying starts a run (Pixi canvas mounts, no console errors), and all 618 unit tests pass.

## v0.8.1 - Pre-release audit hardening

- Fixed Enemy Mastery labels, Archives record names, Special Operations unlock/high-score display, and Front reward visibility.
- Hardened tutorial targeting, mobile breakpoints, localStorage handling, focus behavior, and Play save dialogs.
- Added global save failure/recovery visibility and client-error recovery messaging.
- Updated release documentation and save-export version metadata.

## v0.7.0 — Fix static-asset 404s on adapter-node 5.5.5

- **Fixed all client assets 404ing in the Docker deployment** — `@sveltejs/adapter-node` 5.5.5 emits the request handler into a shared chunk under `build/server/chunks/` (via its Rollup `chunkFileNames`). That chunk derives its base directory from `path.dirname(fileURLToPath(import.meta.url))`, which resolves to `build/server/chunks` instead of the build root. As a result `serve(path.join(dir, 'client'))` pointed at the non-existent `build/server/chunks/client`, `serve()` returned `undefined`, the static middleware was dropped from the Polka chain, and every `_app/immutable/*` asset plus `/service-worker.js` returned 404. The Dockerfile now rebases `dir` two levels up to the build root, which simultaneously corrects `serve(client)`, `serve(prerendered)`, and the `read()` `asset_dir`. The patch matches by code content (not the hashed chunk filename) and fails the build loudly if the adapter layout changes.
- Verified end-to-end: full CI (check + 576 tests + build) green, Docker image built and run, and a headless-Chromium pass over `/`, `/play/`, and `/help/` reported zero console errors and 31/31 immutable assets served `200`.

## v0.6.3 — Tower-like Spawn Rework

- **Tower-like Spawn Tick Pacing**: Replaced the direct enemy-count wave model with a spawn-tick based model. Spawns are evaluated every 1/8 second (0.125s) of simulation time over a fixed 30-second wave spawn window (240 ticks total).
- **Spawn Rate Curve**: The base spawn chance per tick is calculated using the formula `min(56, 14.9 * wave^0.23)` percent, peaking at a maximum chance of 56%.
- **Deterministic Even Distribution**: Scheduled wave spawns are distributed evenly across the simulation window, ensuring consistent and predictable wave composition.
- **Active Enemy Cap & Spawning Backlog**: Screen density is capped at 150 alive enemies on screen. Excess scheduled spawns are backlogged rather than deleted, and will automatically deploy as soon as active capacity frees up.
- **Boss Wave Flow**: Boss waves now feature normal enemy spawns spread throughout the 30-second window, with a Boss spawning at the end of the spawn window (tick 240).
- **Shorter Wave Transitions**: Cleaned up the wave pacing by reducing the inter-wave delay to 0.75 seconds and removing sub-wave pause delays.

## v0.6.2 — CI test-job Node fix

- Fixed the CI test job, which failed with "navigator is not defined" after the test job was pinned to Node 20: the renderer tests import pixi.js, which reads a global `navigator` at module load — a global that only exists on Node 21+. The test job now runs on Node 22; the build job stays on Node 20 to mirror the Docker runtime. First release tag built on fully green CI (the v0.6.1 image is functionally identical).

## v0.6.1 — Online hardening & native-runner Docker build

- **Fixed the stuck release build** — the multi-arch Docker build ran arm64 under QEMU emulation, where `npm ci` (now compiling the native `better-sqlite3` addon) plus the Vite prerender/`sharp` build effectively hung (v0.6.0 was cancelled at 15m). The release workflow now builds each architecture on its own native runner (amd64 on `ubuntu-latest`, arm64 on `ubuntu-24.04-arm`), pushes by digest, and merges them into one multi-arch manifest with a provenance attestation.
- **Rate-limited the unauthenticated write endpoints** — unverified leaderboard submissions and player-identity upserts now share the same per-IP limit as login/register, closing an unbounded-insert / disk-fill abuse vector.
- **Expired sessions are purged** on each new session so the `sessions` table cannot grow without bound.
- **Security headers** (`x-content-type-options`, `x-frame-options`, `referrer-policy`, `permissions-policy`) are now applied to every response.
- CI now tests and builds on Node 20 to match the Docker runtime.

## v0.6.0 — Optional Online Foundation

- **One-container Docker deployment** — Node 20 + adapter-node serves frontend, client assets, and all /api/\* routes from a single process. SQLite persists in a \`/data\` volume. No Postgres, Redis, or second container.
- **Optional accounts** — username/password auth with bcrypt-hashed passwords, httpOnly session cookies, and in-memory rate limiting. Login is never required for normal play.
- **Local anonymous identity** — every player gets a stable local-player-id and display name before registering. Syncs to the server for attribution only.
- **Manual cloud saves** — logged-in users can upload and restore cloud backups from the Systems tab. Cloud saves never auto-overwrite local data; restore runs through the standard migration/import pipeline so newer-schema saves are refused safely.
- **Ko-fi webhook** — accepts Ko-fi's \`data=<json>\` form payload, verifies the \`verification_token\` against \`KOFI_WEBHOOK_SECRET\`, redacts the token before storage, and is idempotent on \`message_id\`.
- **Community Alloy Boost** — verified EUR Ko-fi payments create a global buff: \`+1%\` Alloy per €1 for 7 days, capped at \`+100%\`. Applies to all players, boosts Alloy income only (never Energy/Strange Matter/Schematics), and is hidden when offline or 0%.
- **Support code UI** — each player has a \`FLTD-…\` code for future Ko-fi attribution. Account-linked when logged in.
- **Account and cloud save UI** — Systems tab now includes login/register forms, account status, cloud save metadata comparison, upload/restore with confirmations, and a support code with copy button.
- **Local-first guarantee intact** — no login required, local save remains primary, API/DB failures are treated as offline state, service worker bypasses /api/, and normal gameplay is never blocked.
- Fixed a bug where the second deployment would softlock because \`onGameOver\` was never re-wired on a reused engine.
- Deployment docs, Docker Compose example, .env.example, ARCHITECTURE.md, and a 19-step Docker runtime smoke script.
- Known technical debt: CSRF deprecation, adapter-node prerender workaround, cloud restore reload.

Out of scope / future work: leaderboard UI, verified challenges, guilds, challenge runs, supporter entitlement UI, payment/shop, OAuth.

## v0.5.7

- Renamed the legacy `dailyTasks` save field to `commandOrders` with a safe v16→v17 migration. Existing saves with the old field are preserved.
- Fixed Command Orders board-refresh behavior: started orders with partial progress remain visible until claimed. Board refresh now only fills empty slots — it never removes progress or completed-but-unclaimed orders.
- Added a **Completed Orders** section: orders that are complete but not yet claimed move to a collapsible "Completed" panel with individual claim buttons.
- Added **Claim All**: claims every completed-but-unclaimed order at once, respecting the weekly max of 25 and correctly unlocking gift milestones across thresholds.
- Weekly Command Favor now increments on **claim** (not on completion), avoiding confusion with unclaimed completed orders.
- Clarified the order board: active orders show "Available" for untouched orders and "In progress" for started ones. Completed orders show "Complete — awaiting acknowledgement."
- Removed all remaining `dailyTasks` references from runtime code while preserving legacy save migration compatibility.
- Added Reddit link (r/FlatlandTD) to the global footer.
- Bumped mobile touch targets: settings, SFX, music, drawer toggles, Black Market signal, and Notification Center bell are now ≥44px.
- Added **Best Chain** display to the Game Over panel (cosmetic only, no rewards).
- Added Space-key input guard: pause no longer triggers while typing in inputs or contenteditable elements.

## v0.5.5

- Corrected the Forge/Field upgrade model: the Forge now sets the permanent **starting level** of each Field Upgrade on a single shared curve. A Forge level equals that many in-deployment Field levels — same value, and the next in-run purchase (and its cost) continues from the Forge level. Research multiplies on top. Economy Forge upgrades (Alloy/Energy bonus, Starting Energy) remain permanent-only. (Save migration v15 resets legacy combat Forge levels to 0; economy upgrades are preserved.)
- Reworked the Black Market daily Strange Matter into a once-per-local-day **Daily Pickup** (+1 Strange Matter, no deployment required). The Weekly Shipment is unchanged (+3 on its own cooldown). Removed the "complete a deployment first" requirement.
- Added **Command Orders**: official weekly assignments rewarding Alloy, separate from the Black Market. Up to 25 per local week, 5 visible at a time, with a Command Gift Box every 5 completed (5/10/15/20/25). Deterministic per local week with a 4-hour board refresh cooldown, progression-gated, no streaks and no punishment for missing days. (Save migration v16.)
- Field Upgrade panel highlights the cheapest affordable upgrade in the current category as the suggested next buy.
- Updated the Help page to explain the Forge/Field relationship, the Black Market daily pickup, and Command Orders.

## v0.5.0 - Alpha Release Candidate

- Hardened save migration/import repair for corrupted numeric fields, legacy JSON imports, and final migrated-save validation.
- Unified optional Support URL behavior so footer and Black Market use the same configured source and never gate rewards.
- Suppressed What's New for true first-run players while preserving returning-player release notes.
- Polished the play and Orbital Command tutorials with lighter spotlighting, shorter first-run copy, and reduced-motion handling.
- Clarified the launch and run-complete flow so new players understand Front 1, temporary Energy, permanent Alloy, and Orbital upgrades.
- Improved Import Save and Reset Save dialog keyboard/accessibility behavior.
- Reduced floating combat text clutter: resource gains no longer show `+`, damage no longer shows `-`, and damage/resources use distinct compact styles.
- Updated README/release notes to reflect 16 Fronts, Schematics, Strange Matter, local-first/offline play, and current alpha limitations without implying a real-money shop or backend systems.
