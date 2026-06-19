# Flatland TD Architecture

## Overview

Flatland TD is a fully client-side, static web application. It uses a layered architecture to keep game logic, rendering, and UI separate.

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
- **Data-driven configs**: Enemies, upgrades, labs, tiers, blueprints, achievements are defined as data arrays.
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
│   │   ├── components/
│   │   │   ├── Tutorial.svelte       # Reusable step-by-step overlay
│   │   │   ├── BossHealthBar.svelte  # ARIA progressbar for boss waves
│   │   │   ├── TowerStatsPanel.svelte
│   │   │   ├── EnemyStatsPanel.svelte
│   │   │   ├── FlatlandNews.svelte   # Rotating humorous news
│   │   │   └── Icon.svelte           # SVG icon component
│   │   ├── content/
│   │   │   └── flatlandNews.ts       # 18 news items
│   │   ├── stores/
│   │   │   ├── gameStore.ts          # Engine reference
│   │   │   └── gameUiStore.ts        # Coins, settings, save state
│   │   ├── utils/
│   │   │   └── viewportPlacement.ts  # Tooltip positioning math
│   │   └── game/
│   │       ├── engine/       # Core engine + types + config
│   │       ├── systems/      # Pure game logic
│   │       ├── balance/      # Data configs + formulas
│   │       ├── progression/  # Unlock requirements + discovery
│   │       ├── render/       # PixiJS WebGL rendering (death FX, effects, damage states)
│   │       ├── audio/        # Procedural Web Audio
│   │       ├── save/         # IndexedDB persistence
│   │       └── __tests__/    # Vitest unit tests
│   ├── routes/
│   │   ├── +layout.svelte    # Global footer + lab polling + toasts
│   │   ├── +error.svelte     # Themed error page (404/500)
│   │   ├── +page.svelte      # Home / landing page
│   │   ├── play/             # Game screen (canvas + HUD + vignette + boss intro + killstreak)
│   │   ├── hub/              # Forge, Lab, Blueprints, Fronts, Black Market, etc.
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
| Schematics     | §        | Per-Front  | Boss kills         | Upgrade-path reconstruction (per-Front)               |
| Strange Matter | ◈        | Permanent  | Local Black Market | QoL unlocks, weekly shipments, daily pickup           |

## Progression Systems

### Forge (Workshop)
13 permanent tower upgrades bought with Alloy. Pre-installed before every deployment. Max levels range from 19–6000.

### Research Deck (Lab)
5 time-based orbital research projects. Run in real time (offline too). Multiplicative bonuses stack with Forge. Browser notifications for completion.

### Schematics
Per-Front design fragments. Boss kills grant repeatable Schematics, first-time wave milestones grant larger one-time drops, and the Forge reconstructs compatible upgrade paths from them. Internal Blueprint IDs remain as legacy compatibility names.

### Fronts (Tiers)
16 Fronts across 4 bands (Perimeter → Redline → Blacksite → Anomaly) with escalating difficulty and Schematics rewards. Unlocked by reaching wave milestones on previous Fronts within the same band.

### Achievements
42 achievements across 6 categories (deployments, best wave, shapes destroyed, bosses defeated, field upgrades, alloy earned). Each awards Alloy.

### Black Market
Hidden local-first Strange Matter system. Supports weekly shipments, daily pickup, optional support copy, contraband quality-of-life unlocks (auto-deployment, speed unlocks, schematic converter), and a discovery storyboard. No backend, payment, or online check is required for rewards.

### Command Orders
Weekly official Alloy assignments issued by Orbital Command. Up to 25 orders per local week with 5 visible at a time on a board that refreshes every 4 hours. Every 5 completed orders unlocks a Command Gift Box. Rewards are Alloy only — no Strange Matter, no premium currency. No streaks or login punishment.

### Optional Online Foundation
Optional online features run in the same SvelteKit Node server that serves the frontend. SQLite lives at `DATABASE_PATH` (Docker default: `/data/flatland.db`) and is initialized by source-controlled migrations. Normal gameplay remains local-first: no login, backend, or network access is required after the app is loaded/cached. The service worker bypasses `/api/`, and frontend helpers treat API failures as offline state.

Implemented scaffolds include username/password auth, hashed session tokens, anonymous local player identity sync, cloud-save storage, unverified leaderboard entries, Ko-fi webhook records, challenge config schema, entitlement schema, and community-wide Alloy buff events. Verified challenge leaderboards, guilds, conflict-resolution UI, and permanent Ko-fi rewards are intentionally not implemented here.

## Render Feedback Systems

- **Death proxies**: Render-only corpses (capped at 60, 200ms lifetime) that scale-out + spin + fade — never enter combat state
- **Cosmetic killstreak**: Escalating chain counter near tower (cyan → yellow → pink), resets on tower damage or timeout, grants no resources
- **Enemy damage states**: Fracture lines + tint shift at ≤50% / ≤25% HP (no per-enemy HP bars)
- **Low-HP vignette**: Red radial CSS overlay that pulses <30% tower HP, stronger <15%
- **Boss intro flash**: One-shot centered overlay on boss-wave start (~850ms)
- **Floating text variety**: 8 distinct kind styles (damage/crit/energy/alloy/strange/schematic/chain/error)
- **Number count-up**: Svelte action with cubic ease-out on currency/wave pills

## Wave Scaling

- Waves increase enemy HP, damage, speed, armor, and reward using piecewise power interpolation.
- Armor reduces incoming damage (caps at 70%).
- Boss waves every 10 waves — boss preceded by 3–4 escort enemies.
- Early waves (1–10) use a gentler scaling curve for onboarding.
- Supports 10,000+ waves with deterministic stat anchors.
- **Shiny enemies**: Rare elite variants with higher HP and double rewards (tracked, visual distinction pending).

## UI/UX Features

- **Two tutorials**: Deployment page + Orbital Command hub, both replayable via Help page
- **Bulk upgrade**: Shift+Click (×5), Ctrl+Click (Max), toggle buttons [×1 ×5 ×10 ×50 Max]
- **Mobile speed control**: Single large button expands to speed menu
- **Touch targets**: ≥44px minimum for all interactive elements
- **Safe area**: iOS home indicator padding
- **Lab notifications**: Global toasts + optional browser notifications
- **Loading state**: Instant page render; action buttons disabled with spinner until IndexedDB ready
- **Global footer**: Consistent navigation across all pages
