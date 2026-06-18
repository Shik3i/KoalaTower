# Changelog

## v0.5.6

- Renamed the legacy `dailyTasks` save field to `commandOrders` with a safe v16→v17 migration. Existing saves with the old field are preserved.
- Fixed Command Orders board-refresh behavior: started orders with partial progress remain visible until claimed. Board refresh now only fills empty slots — it never removes progress or completed-but-unclaimed orders.
- Added a **Completed Orders** section: orders that are complete but not yet claimed move to a collapsible "Completed" panel with individual claim buttons.
- Added **Claim All**: claims every completed-but-unclaimed order at once, respecting the weekly max of 25 and correctly unlocking gift milestones across thresholds.
- Weekly Command Favor now increments on **claim** (not on completion), avoiding confusion with unclaimed completed orders.
- Clarified the order board: active orders show "Available" for untouched orders and "In progress" for started ones. Completed orders show "Complete — awaiting acknowledgement."
- Removed all remaining `dailyTasks` references from runtime code (kept legacy aliases for migration compatibility only).
- Added Reddit link (r/FlatlandTD) to the global footer.
- Bumped mobile touch targets: settings, SFX, music, drawer toggles, Black Market signal, and Notification Center bell are now ≥44px.
- Added **Best Chain** display to the Game Over panel (cosmetic only, no rewards).
- Added Space-key input guard: pause no longer triggers while typing in inputs or contenteditable elements.

## v0.5.5

- Corrected the Forge/Field upgrade model: the Forge now sets the permanent **starting level** of each Field Upgrade on a single shared curve. A Forge level equals that many in-deployment Field levels — same value, and the next in-run purchase (and its cost) continues from the Forge level. Research multiplies on top. Economy Forge upgrades (Alloy/Energy bonus, Starting Energy) remain permanent-only. (Save migration v15 resets legacy combat Forge levels to 0; economy upgrades are preserved.)
- Reworked the Black Market daily Strange Matter into a once-per-local-day **Daily Pickup** (+1 Strange Matter, no deployment required). The Weekly Shipment is unchanged (+3 on its own cooldown). Removed the "complete a deployment first" requirement.
- Added **Command Orders**: official weekly assignments rewarding Alloy, separate from the Black Market. Up to 25 per local week, 5 visible at a time, with a Command Gift Box every 5 completed (5/10/15/20/25). Deterministic per local week with a 4-hour board refresh cooldown, progression-gated, no streaks and no punishment for missing days. (Save migration v16.)
- Field Upgrade panel highlights the cheapest affordable upgrade in the current category as the suggested next buy.
- Updated the Help page to explain the Forge/Field relationship, the Black Market daily pickup, and Command Orders.

## v0.5.0 - Alpha Release Candidate

- Hardened save migration/import repair for corrupted numeric fields, legacy JSON imports, and final migrated-save validation.
- Unified optional Support URL behavior so footer and Black Market use the same configured source and never gate rewards.
- Suppressed What's New for true first-run players while preserving returning-player release notes.
- Polished the play and Orbital Command tutorials with lighter spotlighting, shorter first-run copy, and reduced-motion handling.
- Clarified the launch and run-complete flow so new players understand Front 1, temporary Energy, permanent Alloy, and Orbital upgrades.
- Improved Import Save and Reset Save dialog keyboard/accessibility behavior.
- Reduced floating combat text clutter: resource gains no longer show `+`, damage no longer shows `-`, and damage/resources use distinct compact styles.
- Updated README/release notes to reflect 16 Fronts, Schematics, Strange Matter, local-first/offline play, and current alpha limitations without implying a real-money shop or backend systems.
