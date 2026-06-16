# KoalaTower 🐨

**Neon Cyber Idle Tower Defense**

A beautiful, playable idle tower defense game built with SvelteKit, TypeScript, and Canvas 2D rendering. No backend, no tracking, no cookies — just a standalone static web app.

## Quick Start

```bash
npm install
npm run dev      # dev server
npm run build    # production build → build/
npm run preview  # preview production build
npm test         # run tests
```

## Features

### Gameplay
- Central neon tower with auto-targeting and 5 enemy types (Normal, Fast, Tank, Ranged, Boss)
- Endless wave progression with scaling difficulty (supports 10k+ waves)
- Enemy armor system — armor reduces incoming damage, scales with wave
- Battle upgrades (Cash) — 7 upgrades per run
- Workshop upgrades (Coins) — 8 permanent upgrades between runs
- Lab research system — real-time research with timers (progresses offline)
- Tier system — 5 tiers with progression requirements
- Challenge system — 3 challenge scaffolds
- Highscore tracking — best wave saved persistently

### Controls
- **Space** — Pause/Resume
- **1/2/3/4** — Speed presets (1×, 2×, 3×, 5×)
- Speed controls in top bar (desktop) or dedicated bar (mobile)

### Visual
- Neon cyber theme with deep dark backgrounds (#070812, #0B1020, #181938)
- Cyan/blue/violet neon accents with glassmorphism panels
- Geometric enemies with shape AND color identity (not color alone)
- Glowing tower with pulsing core, rotating elements, and layered neon rings
- Projectile trails with glow
- Particle death bursts
- Floating damage numbers with crit distinction
- Cash popup feedback on enemy kills
- Screen shake on damage (configurable)
- Animated starfield and grid background
- Wave start and boss warning animations
- Smooth UI transitions

### Data & Privacy
- 100% local — IndexedDB via idb-keyval
- Export/Import save as JSON
- Reset save with confirmation
- No analytics, no cookies, no backend, no external requests
- No external fonts or CDN assets

## Tech Stack

- **SvelteKit** with Svelte 5
- **TypeScript** (strict mode)
- **Canvas 2D API** for game rendering
- **idb-keyval** for IndexedDB storage
- **@sveltejs/adapter-static** for static output
- **Vitest** for game logic tests

## Project Structure

```
koala-tower/
├── LICENSE              # MIT license
├── README.md
├── package.json
├── tsconfig.json
├── svelte.config.js
├── vite.config.ts
├── .gitignore
├── docs/
│   └── TODO.md          # Development roadmap & ideas
├── src/
│   ├── app.css          # Global styles & design tokens
│   ├── app.html         # HTML shell
│   ├── lib/
│   │   ├── game/
│   │   │   ├── engine/     # Core game engine (GameEngine.ts, types, config)
│   │   │   ├── systems/    # Game logic (enemy, tower, wave, economy)
│   │   │   ├── balance/    # Data-driven configs (enemies, upgrades, labs, tiers)
│   │   │   ├── render/     # Canvas 2D rendering (PixiGameView, shapeFactory)
│   │   │   ├── save/       # Save system (IndexedDB, migrations)
│   │   │   └── __tests__/  # Vitest unit tests
│   │   └── stores/         # Svelte reactive stores
│   └── routes/             # SvelteKit pages
│       ├── +page.svelte    # Home / landing page
│       ├── play/           # Main game screen
│       ├── hub/            # Workshop, Lab, Stats, Settings hub
│       └── privacy/        # Privacy policy
├── static/              # Static assets
└── build/               # Production output (gitignored)
```

## Architecture

```
┌─────────────────────────────────────────────┐
│  Svelte UI (throttled snapshots ~6-10/s)    │
│  Reads from GameSnapshot, fires events       │
├─────────────────────────────────────────────┤
│  GameEngine (pure TypeScript, 60 FPS)        │
│  Owns simulation state, calls systems         │
├─────────────────────────────────────────────┤
│  Systems (enemy, tower, wave, economy)       │
│  Pure functions, testable without Pixi/Svelte│
├─────────────────────────────────────────────┤
│  Canvas 2D Renderer (PixiGameView)           │
│  Owns rendering, reads engine state each frame│
├─────────────────────────────────────────────┤
│  Save System (IndexedDB via idb-keyval)      │
│  Schema-versioned, migration supported        │
└─────────────────────────────────────────────┘
```

## Static Hosting (Caddy)

```caddy
example.com {
    root * /path/to/koala-tower/build
    try_files {path} /index.html
    file_server
}
```

Or any static file server (`npx serve build`, nginx, etc.)

## License

MIT — see [LICENSE](./LICENSE)
