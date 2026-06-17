# Flatland TD TODO

## Polish & UX
- [x] Add boss count to run summary
- [x] Polish wave announcement animation (boss-specific pink theme)
- [x] Add boss warning before boss wave (escort-first spawning signals danger)
- [x] Improve damage number overlap handling (better sizing, stroke for readability)
- [x] Improve coin/cash gain popups (larger, color-coded)
- [ ] Add boss health bar at top of screen during boss waves
- [ ] Add wave milestone notifications with reward popup
- [ ] Improve multishot spread angle visualization
- [ ] Add crit hit screen flash effect
- [ ] Add tower firing muzzle flash
- [ ] Draw enemy path indicators (subtle lines from spawn to tower)

## Gameplay
- [x] Boss waves now include escort enemies before the boss
- [x] Improved first-50-waves balancing (gentler start, progressive ramp)
- [x] Battle upgrade costs lowered, effects increased for better early-game feel
- [x] Workshop upgrade costs lowered, more achievable after first runs
- [ ] Fix enemy attack cooldown — ranged enemies should actually shoot
- [ ] Implement proper tower HP bar on game canvas
- [ ] Add defense upgrade damage reduction calculation to enemy damage
- [ ] Fix screen shake not triggering on tower hits
- [ ] Add elite enemy variants (shiny, more HP, double reward)
- [ ] Implement challenge mode modifiers in game engine
- [ ] Add tier unlock logic based on highest wave
- [ ] Implement milestone rewards with coin payouts

## Performance
- [ ] Add object pooling for projectiles and particles
- [ ] Reduce allocations in hot paths (enemy system, projectile system)
- [ ] Add canvas size clamping on very large screens
- [ ] Add FPS counter (debug mode)
- [ ] Handle tab visibility properly (pause/fps-limit when hidden)

## Mobile
- [x] Bottom upgrade drawer for mobile (thumb-friendly)
- [x] Portrait-optimized layout, canvas stays focused
- [ ] Add swipe gesture to close mobile panels
- [ ] Make upgrade cards larger on small screens
- [ ] Improve touch response on canvas (no-op area for UI toggles)
- [ ] Landscape orientation should not break layout

## Features
- [ ] Sound effects and music (Web Audio API)
- [ ] More lab research items
- [ ] Full challenge implementations (Fast Swarm, Glass Tower, Boss Rush)
- [ ] Tier 2–5 content
- [ ] Prestige/ascension system
- [ ] Achievement system with notifications
- [ ] Stats page with charts (per-run data)
- [ ] Tower skins / customization
- [ ] Tutorial/onboarding flow
