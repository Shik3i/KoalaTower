# KoalaTower Architecture

## Overview

KoalaTower is a fully client-side, static web application. It uses a layered architecture to keep game logic, rendering, and UI separate.

```
┌─────────────────────────────────────────┐
│  Svelte UI (Reactively rendered)        │
│  • Routes: /, /play, /hub, /privacy    │
│  • Reads from GameSnapshot (throttled)  │
│  • Fires events: purchase, start, save │
├─────────────────────────────────────────┤
│  GameEngine (Pure TypeScript, 60 FPS)    │
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
│  • EconomySystem: gold, coins           │
├─────────────────────────────────────────┤
│  Canvas 2D Renderer (PixiGameView)      │
│  • Draws tower, enemies, projectiles    │
│  • Particles, damage numbers            │
│  • Background grid + starfield          │
│  • Screen shake                         │
├─────────────────────────────────────────┤
│  Save System (IndexedDB via idb-keyval) │
│  • Schema-versioned (v2)               │
│  • Auto-save + manual export/import    │
│  • Migration support                    │
└─────────────────────────────────────────┘
```

## Key Design Decisions

- **No framework rendering in game loop**: PixiJS/Canvas owns rendering, not Svelte.
- **Snapshot-based UI**: Svelte receives throttled snapshots from the engine, not real-time state.
- **Pure systems**: All game logic functions are testable without PixiJS or Svelte.
- **Data-driven configs**: Enemies, upgrades, labs, tiers are defined as data, not code.
- **Schema-versioned saves**: Save migration is handled separately from game logic.

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
│   ├── app.html
│   ├── app.css
│   ├── lib/
│   │   ├── version.ts
│   │   ├── components/
│   │   │   └── Tutorial.svelte
│   │   ├── stores/
│   │   │   ├── gameStore.ts
│   │   │   └── gameUiStore.ts
│   │   └── game/
│   │       ├── engine/       # Core engine
│   │       ├── systems/      # Game logic
│   │       ├── balance/      # Data configs
│   │       ├── render/       # Canvas rendering
│   │       ├── save/         # Persistence
│   │       └── __tests__/    # Vitest tests
│   └── routes/
│       ├── +page.svelte      # Home
│       ├── play/             # Game
│       ├── hub/              # Workshop/Lab/Stats
│       ├── privacy/          # Privacy policy
│       ├── imprint/          # Legal notice
│       └── sitemap.xml/      # SEO sitemap
├── static/
│   └── robots.txt
└── build/                    # Static output
```

## Currency System

| Currency   | Icon | Type       | Earned by         | Spent on                    |
|-----------|------|------------|-------------------|-----------------------------|
| Gold       | 💰   | Temporary  | Killing enemies   | Battle upgrades (per run)   |
| KoalaCoins | 🪙   | Permanent  | Killing enemies   | Workshop + Lab upgrades     |

## Wave Scaling

- Waves increase enemy HP, damage, speed, armor, and reward.
- Armor reduces incoming damage (caps at 80%).
- Boss waves every 10 waves — boss is preceded by 3–4 escort enemies.
- Early waves (1–10) use a gentler scaling curve for onboarding.
- Supports 10,000+ waves with piecewise scaling formulas.
