# KoalaTower 🐨

**Neon Cyber Idle Tower Defense**

A beautiful, playable idle tower defense game built with SvelteKit, TypeScript, and Canvas rendering. No backend, no tracking, no cookies — just a standalone static web app.

## Features

### Current (MVP)
- Central neon tower with automatic targeting and shooting
- 5 enemy types: Normal, Fast, Tank, Ranged, Boss
- Endless wave progression with scaling difficulty
- Battle upgrades (Cash) — Damage, Fire Rate, Range, Multishot, Crit Chance, Defense, Max HP
- Workshop upgrades (Coins) — 8 permanent upgrades between runs
- Lab research system (3 research items)
- Tier system (5 tiers with progression requirements)
- Challenge system (3 challenge scaffolds)
- Local save via IndexedDB (idb-keyval)
- Export/Import save as JSON
- Settings: Reduced motion, screen shake, particles, damage numbers, low effects mode
- Responsive desktop/tablet/mobile layout
- Neon cyber visual theme with glowing tower, projectiles, particles, and starfield background
- Screen shake on damage
- Floating damage numbers
- Death particle effects
- Wave announcements
- Privacy-first: no analytics, no tracking, no backend

### Planned
- Full challenge implementations
- Elite enemy variants
- More lab research items
- Achievement system
- Sound effects and music
- Additional tier content
- Prestige/ascension mechanics
- More tower customization

## Tech Stack

- **SvelteKit** with Svelte 5
- **TypeScript** (strict mode)
- **Canvas 2D API** for rendering (lightweight, no heavy framework)
- **idb-keyval** for IndexedDB save storage
- **@sveltejs/adapter-static** for static output
- **Vitest** for game logic tests

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test

# Type check
npm run check
```

## Static Hosting (Caddy)

The production build outputs to `build/`. Serve it with Caddy:

```Caddyfile
example.com {
    root * /path/to/koala-tower/build
    try_files {path} /index.html
    file_server
}
```

Or with any static file server:

```bash
npx serve build
```

## Privacy

KoalaTower stores all game data locally in your browser's IndexedDB database. No data is transmitted to any server. No cookies, no analytics, no tracking. You can export, import, and reset your save at any time from the settings menu.

## Project Structure

```
src/
├── lib/
│   ├── game/
│   │   ├── engine/       # Core game engine
│   │   │   ├── GameEngine.ts
│   │   │   ├── gameTypes.ts
│   │   │   └── gameConfig.ts
│   │   ├── systems/      # Game logic systems
│   │   │   ├── enemySystem.ts
│   │   │   ├── towerSystem.ts
│   │   │   ├── waveSystem.ts
│   │   │   └── economySystem.ts
│   │   ├── balance/      # Data-driven configs
│   │   │   ├── enemies.ts
│   │   │   ├── battleUpgrades.ts
│   │   │   ├── workshopUpgrades.ts
│   │   │   ├── tiers.ts
│   │   │   ├── milestones.ts
│   │   │   ├── labs.ts
│   │   │   └── challenges.ts
│   │   ├── render/       # Canvas rendering
│   │   │   ├── PixiGameView.ts
│   │   │   ├── renderTypes.ts
│   │   │   └── shapeFactory.ts
│   │   ├── save/         # Save system
│   │   │   ├── saveTypes.ts
│   │   │   ├── saveService.ts
│   │   │   └── migrations.ts
│   │   └── __tests__/    # Vitest tests
│   └── stores/           # Svelte stores
│       └── gameUiStore.ts
└── routes/
    ├── +layout.svelte
    ├── +layout.ts
    ├── +page.svelte      # Home page
    ├── play/
    │   └── +page.svelte  # Main game
    └── privacy/
        └── +page.svelte  # Privacy page
```

## License

MIT
