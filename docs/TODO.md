# KoalaTower TODO

## Polish & UX
- [ ] Add enemy kill count per wave display in run info
- [ ] Add boss health bar at top of screen during boss waves
- [ ] Improve damage number overlap handling (spread them out)
- [ ] Add coin/cash gain popups when earning currency
- [ ] Add wave milestone notifications with reward popup
- [ ] Polish wave announcement animation (scale-in + glow)
- [ ] Add boss warning 3 seconds before boss wave starts
- [ ] Improve multishot spread angle visualization
- [ ] Add crit hit screen flash effect
- [ ] Add tower firing muzzle flash
- [ ] Draw enemy path indicators (subtle lines from spawn to tower)

## Gameplay
- [ ] Fix enemy attack cooldown — ranged enemies should actually shoot
- [ ] Implement proper tower HP bar on game canvas
- [ ] Add defense upgrade damage reduction calculation to enemy damage
- [ ] Fix screen shake not triggering on tower hits
- [ ] Add elite enemy variants (shiny, more HP, double reward)
- [ ] Implement challenge mode modifiers in game engine
- [ ] Add tier unlock logic based on highest wave
- [ ] Implement milestone rewards with coin payouts
- [ ] Add boss count to run summary

## Performance
- [ ] Add object pooling for projectiles and particles
- [ ] Reduce allocations in hot paths (enemy system, projectile system)
- [ ] Add canvas size clamping on very large screens
- [ ] Add FPS counter (debug mode)
- [ ] Handle tab visibility properly (pause/fps-limit when hidden)

## Mobile
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
