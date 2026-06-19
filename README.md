# 🛰️ Flatland TD (FLTD)

**Open Source Neon Cyber Idle Tower Defense**

> *"Deploy towers. Question nothing. Refine Alloy."*

A beautiful, fully playable idle tower defense game built with **Svelte 5 + TypeScript + PixiJS v8 (WebGL)**. Flatland TD is local-first: normal play works without login, analytics, payment checks, or backend availability after the app is loaded/cached. Optional online features can be enabled by the same Node server that serves the app.

**▶ [Play now at tower.koalastuff.net](https://tower.koalastuff.net)**

[![MIT License](https://img.shields.io/badge/license-MIT-cyan.svg)](LICENSE)
[![Svelte 5](https://img.shields.io/badge/svelte-5-ff3e00.svg)](https://svelte.dev)
[![PixiJS v8](https://img.shields.io/badge/pixijs-v8-e72264.svg)](https://pixijs.com)

---

## 🎮 Gameplay

Flatland is at war with **hostile geometric shapes**. Deploy towers from orbit, harvest Energy from destroyed enemies to overclock your tower mid-battle, and refine Alloy for permanent upgrades. When the tower falls — deploy a new one. Research endures.

- 🏗️ **13 Forge upgrades** — permanent pre-installed improvements (Damage, Fire Rate, Range, HP, Crit, Lifesteal, Thorns...)
- 🔬 **5 Research Deck projects** — real-time orbital research with offline progress
- ⚡ **14 Field upgrades** — temporary overclocks per deployment (Offense, Defense, Utility)
- 🌍 **16 Fronts (4 bands × 4 Fronts)** — escalating difficulty with better Alloy rewards and per-Front Schematics
- 📑 **Schematics** — per-Front currency dropped by bosses, used to reconstruct upgrade paths
- 🛰️ **Command Orders** — weekly official Alloy assignments with gift box milestones and board refresh cooldowns
- 🏆 **42 Achievements** — deploy towers, destroy shapes, earn Alloy rewards
- 👾 **5 Enemy types** — Normal ■, Fast ◆, Tank ⬡, Ranged ▶, Boss ⬠ — each visually distinct
- ⚡ **3 Special Operations** — challenge modes with modified rules
- 💥 **Cosmetic killstreak chain** — visual-only feedback for clean waves (no economy tie-in)
- 🩸 **Damage-state readability** — enemies show cracks + tint as HP drops (no per-enemy HP bars)

### Controls

| Key | Action |
|-----|--------|
| `Space` | Pause / Resume |
| `1` `2` `3` `4` | Speed 1× / 2× / 3× / 5× |
| `Shift` + Click | Buy 5× upgrades |
| `Ctrl` + Click | Buy max affordable |

---

## ⚡ Quick Start

```bash
npm install
npm run dev         # dev server at localhost:5173
npm run build       # production build → build/
npm run preview     # preview production build
npm test            # run the Vitest suite
```

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | **SvelteKit** + Svelte 5 |
| Language | **TypeScript** (strict mode) |
| Renderer | **PixiJS v8** (WebGL + AdvancedBloomFilter) |
| Storage | **IndexedDB** via idb-keyval |
| Audio | Procedural **Web Audio API** (no asset files) |
| Testing | **Vitest** (400+ tests across 20+ files) |
| Build | **Vite** + @sveltejs/adapter-node |
| Container | Single-container **Docker** Node server |
| PWA | Installable + offline-ready via SvelteKit service worker |

---

## 📁 Project Structure

```
src/
├── app.css                  # Design tokens + global styles (CSS variables for everything)
├── app.html                 # HTML shell + SEO meta/OG/Twitter tags
├── lib/
│   ├── components/          # Tutorial, BossHealthBar, Stats panels, News, Icon
│   ├── stores/              # Reactive Svelte stores (Alloy, settings, engine)
│   ├── content/             # Flatland News (18 humorous items)
│   └── game/
│       ├── engine/          # GameEngine + GameConfig + GameTypes
│       ├── systems/         # Wave, Enemy, Tower, Projectile, Economy (pure functions)
│       ├── balance/         # Enemies, upgrades, Research Deck, Fronts, Schematics, achievements
│       ├── progression/     # Unlock requirements + Schematic discovery RNG
│       ├── render/          # PixiJS WebGL rendering (layered renderers, death FX, effects)
│       ├── audio/           # Procedural Web Audio SFX + music
│       ├── save/            # IndexedDB persistence + schema migrations
│       └── __tests__/       # Vitest unit tests
├── utils/                   # countUp action, viewport math
└── routes/
    ├── +layout.svelte       # Global footer nav + lab polling + toasts
    ├── +error.svelte        # Themed 404/500 error page
    ├── +page.svelte         # Landing page with animated stars + news
    ├── play/+page.svelte    # Game canvas + HUD + vignette + boss intro + killstreak chip
    ├── hub/+page.svelte     # Forge · Research Deck · Schematics · Fronts · Black Market · Simulation · Archives
    ├── help/+page.svelte    # FAQ (12 questions) · Lore · Controls · Tutorial replay
    ├── imprint/+page.svelte # Legal notice
    ├── privacy/+page.svelte # Privacy policy (local-first + optional online)
    └── sitemap.xml/         # Dynamic XML sitemap
```

---

## 🐳 Docker

Multi-arch images are published automatically on Git tags. The container runs one Node/SvelteKit server that serves both the frontend and `/api/*`. SQLite is stored in a persistent `/data` volume; no Postgres, Redis, or second container is required.

```bash
docker pull ghcr.io/shik3i/koalatower:latest
docker run -p 8080:8080 \
  -v flatland-data:/data \
  -e SESSION_SECRET="change-this-long-random-session-secret" \
  -e AUTH_PASSWORD_PEPPER="change-this-long-random-password-pepper" \
  ghcr.io/shik3i/koalatower:latest
# → http://localhost:8080
```

Docker Compose + Caddy reverse proxy examples in `examples/` and `docker-compose.example.yml`.

### Optional Online Features

Flatland TD keeps **local-first gameplay** as a hard rule:

- **No login required for normal play**
- local saves remain primary and are not overwritten automatically
- API failures are treated as offline state, not gameplay failures
- the service worker bypasses `/api/`, while cached gameplay assets remain available offline
- unverified leaderboard scores are community/fun only
- verified challenge leaderboard will require login and stricter validation later

Backend environment variables:

| Variable | Purpose |
|----------|---------|
| `NODE_ENV` | `production` enables secure session cookies |
| `PORT` | Node server port, defaults to `8080` in Docker |
| `DATABASE_PATH` | SQLite path, defaults to `/data/flatland.db` |
| `SESSION_SECRET` | server-only secret for session-token hashes/fingerprints |
| `AUTH_PASSWORD_PEPPER` | server-only password pepper, never `PUBLIC_` |
| `KOFI_WEBHOOK_SECRET` | shared secret checked against Ko-fi's `verification_token`; **required in production** or the webhook refuses all events |
| `PUBLIC_ONLINE_FEATURES_ENABLED` | optional public flag for online feature visibility |

SQLite migrations run on first server DB access and record applied versions in `schema_migrations`. WAL mode is enabled when the environment supports it. Production requires `DATABASE_PATH`, `SESSION_SECRET`, `AUTH_PASSWORD_PEPPER`, and (for the Ko-fi webhook) `KOFI_WEBHOOK_SECRET`. Docker persists SQLite in the `/data` volume.

Auth foundation notes:

- username/password auth uses bcrypt-compatible hashes with cost `12`
- password hashes are based on `password + AUTH_PASSWORD_PEPPER`
- session cookies are `httpOnly`, `SameSite=Lax`, and `Secure` in production
- only SHA-256 session-token hashes are stored in SQLite
- login/register have basic in-memory rate limiting and generic login errors
- no password or session token is ever stored in `localStorage`

Optional account & cloud save (Systems tab in Orbital Command):

- account login is optional; normal play stays local-first and offline-capable
- cloud save is manual and explicit — upload and restore are both user actions
- cloud save **never** auto-overwrites local data; on login only metadata is fetched
- restore runs the cloud payload through the standard migration/import pipeline and reloads the app, so a newer-schema cloud save is refused rather than crashing

Ko-fi community buff & support code:

- the Ko-fi webhook endpoint is `/api/kofi/webhook` (i.e. `https://<domain>/api/kofi/webhook`)
- Ko-fi posts `application/x-www-form-urlencoded` with a `data=<json>` field; raw JSON is also accepted
- the webhook verifies Ko-fi's `verification_token` against `KOFI_WEBHOOK_SECRET`; a wrong/missing token is rejected with `403` and creates no event
- in production a missing `KOFI_WEBHOOK_SECRET` disables the webhook entirely (`503`, no event, no buff); dev/test tolerates a missing secret for local testing
- `verification_token` is redacted before the raw payload is stored
- players can have a local anonymous support code before registering (shown in Systems); it is account-linked after login. It is for future supporter attribution only
- the community buff is global: `+1%` Alloy per `€1` for `7 days`, capped at `+100%` server-side (client clamps `0..100`), and fractional EUR amounts are preserved. It applies to **all** players, is shown in the Systems widget, and boosts Alloy income only — never Energy, Strange Matter, Schematics, or personal power
- if the API/DB is unavailable the buff is treated as `0%` and gameplay is unaffected

### Publishing a release

```bash
git tag v0.5.0
git push origin v0.5.0
# → CI builds multi-arch image + pushes to GHCR with SBOM attestation
```

---

## 🔒 Privacy

- **Local-first** — normal saves stay in your browser (IndexedDB)
- **Optional online features** — accounts, sessions, cloud-save scaffolding, and community APIs are not required for normal play
- **No tracking** — zero analytics; an `httpOnly` session cookie is used only if you log in
- **No CDN** — fonts and assets are self-hosted
- Export/Import save as JSON with encoding + checksums
- Reset save with confirmation dialog

---

## 🧪 Testing

```bash
npm test            # run the Vitest suite
npm run check       # TypeScript strict typecheck
npm run build       # Production build verification
```

Test coverage includes: enemy scaling formulas, upgrade cost curves, save migration/import integrity, progression requirements, wave system, viewport placement math, killstreak/cosmetic-chain tests, floating-text classification, and enemy damage-state helpers.

---

## 🚧 Alpha Notes

Flatland TD v0.5.7 — **Alpha Release Candidate** — is alpha software. It is local-first, offline-friendly, and playable without login, analytics, backend APIs, cloud saves, or payment checks.

Known limits: all 16 Fronts are structurally active, but high-end Blacksite/Anomaly mechanics are still scaffolded and not final balance. The Outsourced Research Lab is visible as Coming Later and is not active. Black Market support links are optional; Daily Pickup and Weekly Shipment rewards are never gated by payment or online checks.

---

## 📄 License

MIT — see [LICENSE](LICENSE)

---

*"Orbital Command has reviewed the situation. It is not great."*
