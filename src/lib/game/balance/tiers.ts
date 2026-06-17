/**
 * tiers.ts — Tier definitions with real difficulty scaling.
 *
 * Each tier multiplies enemy stats and rewards:
 *   Tier 1: Baseline (1× HP, 1× ATK, 1× rewards)
 *   Tier 2: 3× HP, 2× ATK, 2.5× rewards — unlocked at wave 100
 *   Tier 3: 8× HP, 4.5× ATK, 5× rewards — unlocked at wave 500
 *   Tier 4: 22× HP, 10× ATK, 12× rewards — unlocked at wave 1500
 *   Tier 5: 55× HP, 22× ATK, 25× rewards — unlocked at wave 3000
 *
 * A player who dominates Tier 1 wave 500 will struggle on Tier 2 wave 50.
 * This creates the core gameplay loop: farm lower tiers, push higher tiers,
 * claim milestones, return stronger.
 */

import { TierId, type TierDef } from '../engine/gameTypes';

export const TIERS: TierDef[] = [
	{
		id: TierId.Tier1,
		name: 'Tier 1: The Awakening',
		description: 'The tower awakens. Learn the basics, farm coins, build your workshop. Long-term progression target: wave 1000+.',
		waveRequirement: 0,
		unlocked: true,
		rewards: ['Permanent Workshop', 'Lab Access', 'Wave Milestones'],
	},
	{
		id: TierId.Tier2,
		name: 'Tier 2: Neon Storm',
		description: '3× enemy HP, 2× enemy damage, 2.5× rewards. First real difficulty jump.',
		waveRequirement: 100,
		unlocked: false,
		rewards: ['2.5× Coin Rewards', 'Challenge Unlock', 'Tier 2 Milestones'],
	},
	{
		id: TierId.Tier3,
		name: 'Tier 3: Digital Onslaught',
		description: '8× enemy HP, 4.5× enemy damage, 5× rewards. Requires significant workshop investment.',
		waveRequirement: 500,
		unlocked: false,
		rewards: ['5× Coin Rewards', 'Card System (future)', 'Tier 3 Milestones'],
	},
	{
		id: TierId.Tier4,
		name: 'Tier 4: Quantum Surge',
		description: '22× enemy HP, 10× enemy damage, 12× rewards. Deep progression territory.',
		waveRequirement: 1500,
		unlocked: false,
		rewards: ['12× Coin Rewards', 'Module System (future)', 'Tier 4 Milestones'],
	},
	{
		id: TierId.Tier5,
		name: 'Tier 5: Geo Ascension',
		description: '55× enemy HP, 22× enemy damage, 25× rewards. Endgame aspirational tier.',
		waveRequirement: 3000,
		unlocked: false,
		rewards: ['25× Coin Rewards', 'Ultimate Weapon (future)', 'Ascension Perks'],
	},
];
