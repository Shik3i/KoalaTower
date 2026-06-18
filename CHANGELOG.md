# Changelog

## v0.5.5

- Corrected the Forge/Field upgrade model: the Forge now sets the permanent **starting level** of each Field Upgrade on a single shared curve. A Forge level equals that many in-deployment Field levels — same value, and the next in-run purchase (and its cost) continues from the Forge level. Research multiplies on top. Economy Forge upgrades (Alloy/Energy bonus, Starting Energy) remain permanent-only. (Save migration v15 resets legacy combat Forge levels to 0; economy upgrades are preserved.)
- Reworked the Black Market daily Strange Matter into a once-per-local-day **Daily Pickup** (+1 Strange Matter, no deployment required). The Weekly Shipment is unchanged (+3 on its own cooldown). Removed the "complete a deployment first" requirement.
- Added **Orbital Command Tasks**: official daily assignments rewarding Alloy, separate from the Black Market. Up to 25 per local day, 5 visible at a time, with a Command Gift Box every 5 completed (5/10/15/20/25). Deterministic per local day, progression-gated, no streaks and no punishment for missing days.
- Field Upgrade panel highlights the cheapest affordable upgrade in the current category as the suggested next buy.
- Updated the Help page to explain the Forge/Field relationship, the Black Market daily pickup, and Orbital Command Tasks.

## v0.5.0 - Alpha Release Candidate

- Hardened save migration/import repair for corrupted numeric fields, legacy JSON imports, and final migrated-save validation.
- Unified optional Support URL behavior so footer and Black Market use the same configured source and never gate rewards.
- Suppressed What's New for true first-run players while preserving returning-player release notes.
- Polished the play and Orbital Command tutorials with lighter spotlighting, shorter first-run copy, and reduced-motion handling.
- Clarified the launch and run-complete flow so new players understand Front 1, temporary Energy, permanent Alloy, and Orbital upgrades.
- Improved Import Save and Reset Save dialog keyboard/accessibility behavior.
- Reduced floating combat text clutter: resource gains no longer show `+`, damage no longer shows `-`, and damage/resources use distinct compact styles.
- Updated README/release notes to reflect 16 Fronts, Schematics, Strange Matter, local-first/offline play, and current alpha limitations without implying a real-money shop or backend systems.
