# Flatland TD TODO

## Polish & UX
- [x] Add boss count to run summary
- [x] Polish wave announcement animation (boss-specific pink theme)
- [x] Add boss warning before boss wave (escort-first spawning signals danger)
- [x] Improve damage number overlap handling (better sizing, stroke for readability)
- [x] Improve coin/cash gain popups (larger, color-coded)
- [x] Add boss health bar at top of screen during boss waves
- [x] Add wave milestone notifications with toasts
- [x] Add tower firing muzzle flash
- [x] Global font-size system with CSS variables
- [x] Bulk-upgrade system (Shift×5, Ctrl×Max, toggle buttons)
- [x] Enemy death animation (scale-out + spin + fade, shape-specific)
- [x] Cosmetic killstreak chain (visual-only, resets on damage/new run)
- [x] Low-HP vignette overlay (<30% red pulse, <15% stronger)
- [x] Damage-state readability on enemies (cracks + tint, no HP bars)
- [x] Boss-wave intro flash
- [x] Floating-text visual hierarchy (8 kind styles)
- [x] Number count-up animation on currency/wave pills
- [x] Themed +error.svelte (404/500)
- [x] Brotli/Gzip precompression in static adapter
- [x] Enemy object pooling for projectiles, particles, damage text, death FX
- [ ] Improve multishot spread angle visualization
- [ ] Draw enemy path indicators (subtle lines from spawn to tower)
- [x] Per-run stats dashboard with charts

## Gameplay
- [x] Boss waves now include escort enemies before the boss
- [x] Improved first-50-waves balancing (gentler start, progressive ramp)
- [x] Battle upgrade costs lowered, effects increased for better early-game feel
- [x] Workshop upgrade costs lowered, more achievable after first runs
- [x] Add tier unlock logic based on highest wave (front-based progression)
- [x] Implementation of Tiers 1–5 with multipliers and alloy scaling
- [x] Schematic path reconstruction system
- [x] Lab research with offline time tracking + browser notifications
- [ ] Fix enemy attack cooldown — ranged enemies should actually shoot
- [x] Add elite/shiny enemy variants with glow-based visual distinction
- [ ] Full challenge mode implementations (Fast Swarm, Glass Tower, Boss Rush — currently scaffolds)
- [ ] Prestige/ascension system

## Performance
- [x] Object pooling for projectiles, particles, damage text, shockwaves, death FX
- [x] Spatial index for targeting queries
- [x] Canvas size clamping on very large screens
- [x] Tab visibility handling (auto-pause on blur, persist on visibilitychange)
- [x] Add FPS counter (debug mode)
- [ ] Reduce per-frame allocation in hot paths (further micro-optimizations)

## Mobile
- [x] Bottom upgrade drawer for mobile (thumb-friendly)
- [x] Portrait-optimized layout, canvas stays focused
- [x] Mobile speed control redesign (1 large button → expandable menu)
- [x] Upgrade cards larger (fonts +20%, padding +20%)
- [x] Safe-area inset for iOS home indicator
- [x] Touch targets ≥44px for panel toggles and icon buttons
- [ ] Add swipe gesture to close mobile panels
- [ ] Improve touch response on canvas (no-op area for UI toggles)
- [ ] Landscape orientation layout testing

## Features
- [x] Procedural sound effects and music (Web Audio API, no asset files)
- [x] Achievement system with 42 achievements + alloy rewards
- [x] Tutorial system (Deployment page + Orbital Command hub tutorial, replayable)
- [x] SEO: og:image, JSON-LD (WebApplication + FAQPage), sitemap.xml, robots.txt
- [x] Global footer navigation across all pages
- [x] Loading state with spinner (instant page render, buttons disabled until save loaded)
- [x] Browser notifications for lab research completion (opt-in)
- [x] Save export/import with encoding + checksums
- [x] Flatland News (18 rotating humorous news items on landing page)
- [ ] Full challenge implementations
- [x] Stats page with charts (per-run data)
- [ ] Tower skins / customization
- [ ] Social sharing / OpenGraph image (1200×630 PNG for maximum platform compatibility)
