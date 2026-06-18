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
│   │       └── __tests__/    # Vitest (390 tests)
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
| Alloy          | 🔩       | Permanent  | Destroying shapes  | Forge upgrades + Research Deck + Blueprints           |
| Schematics     | §        | Per-Front  | Boss kills         | Blueprint reconstruction (per-Front)                  |
| Strange Matter | ✦        | Permanent  | Black Market       | Contraband unlocks, weekly shipments, daily contracts |

## Progression Systems

### Forge (Workshop)
13 permanent tower upgrades bought with Alloy. Pre-installed before every deployment. Max levels range from 19–6000.

### Research Deck (Lab)
5 time-based orbital research projects. Run in real time (offline too). Multiplicative bonuses stack with Forge. Browser notifications for completion.

### Blueprints
10 discoverable schematics. Found randomly during deployments on specific Fronts. Research with Alloy to unlock hidden Forge and Field upgrade paths.

### Fronts (Tiers)
16 Fronts across 4 bands (Perimeter → Redline → Blacksite → Anomaly) with escalating difficulty and Schematics rewards. Unlocked by reaching wave milestones on previous Fronts within the same band.

### Achievements
42 achievements across 6 categories (deployments, best wave, shapes destroyed, bosses defeated, field upgrades, alloy earned). Each awards Alloy.

### Black Market
Hidden unlock with Strange Matter economy. Supports weekly shipments, daily contracts, contraband unlocks (auto-deployment, speed unlocks, schematic converter), and a discovery storyboard.

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
