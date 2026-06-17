/**
 * milestones.ts — Long-term milestone goals across all tiers.
 *
 * Milestones provide one-time coin rewards for reaching key wave thresholds.
 * They are NOT designed to be collected in a single run — they span the
 * entire lifetime of a player's progress.
 *
 * Tier 1 milestones go up to wave 4500, but reaching wave 4500 on Tier 1
 * requires months of workshop investment and good strategy.
 * Higher tiers have their own milestone tables (future).
 */

import { MilestoneId, TierId, type MilestoneDef } from '../engine/gameTypes';

export const MILESTONES: MilestoneDef[] = [
	// ── Tier 1: Onboarding & early game ──
	{
		id: MilestoneId.Wave10,
		tierId: TierId.Tier1,
		wave: 10,
		name: 'First Steps',
		reward: '100 Coins',
		claimed: false,
	},
	{
		id: MilestoneId.Wave25,
		tierId: TierId.Tier1,
		wave: 25,
		name: 'Getting Stronger',
		reward: '250 Coins',
		claimed: false,
	},
	{
		id: MilestoneId.Wave50,
		tierId: TierId.Tier1,
		wave: 50,
		name: 'Half Century',
		reward: '500 Coins',
		claimed: false,
	},

	// ── Tier 1: Mid game ──
	{
		id: MilestoneId.Wave100,
		tierId: TierId.Tier1,
		wave: 100,
		name: 'Centurion',
		reward: '1200 Coins — Tier 2 Unlock',
		claimed: false,
	},
	{
		id: MilestoneId.Wave250,
		tierId: TierId.Tier1,
		wave: 250,
		name: 'Quarter Millennium',
		reward: '3000 Coins',
		claimed: false,
	},
	{
		id: MilestoneId.Wave500,
		tierId: TierId.Tier1,
		wave: 500,
		name: 'Geo Warrior',
		reward: '8000 Coins — Tier 3 Unlock',
		claimed: false,
	},

	// ── Tier 1: Late game ──
	{
		id: MilestoneId.Wave1000,
		tierId: TierId.Tier1,
		wave: 1000,
		name: 'The Thousand',
		reward: '20000 Coins',
		claimed: false,
	},
	{
		id: MilestoneId.Wave2500,
		tierId: TierId.Tier1,
		wave: 2500,
		name: 'The Long Haul',
		reward: '75000 Coins',
		claimed: false,
	},
	{
		id: MilestoneId.Wave4500,
		tierId: TierId.Tier1,
		wave: 4500,
		name: 'The Apex',
		reward: '200000 Coins',
		claimed: false,
	},
];

export function getMilestonesForWave(wave: number): MilestoneDef[] {
	return MILESTONES.filter(m => m.wave <= wave && !m.claimed);
}
