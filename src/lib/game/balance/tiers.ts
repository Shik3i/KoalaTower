/**
 * tiers.ts — Tier definitions with real difficulty scaling.
 *
 * Each tier multiplies enemy stats and rewards:
 *   Tier 1: Baseline (1× HP, 1× ATK, 1× rewards)
 *   Tier 2: 20× HP, 20× ATK, 20× rewards — unlocked at wave 100
 *   Tier 3: 60× HP, 60× ATK, 60× rewards — unlocked at wave 500
 *   Tier 4: 180× HP, 180× ATK, 180× rewards — unlocked at wave 1500
 *   Tier 5: 540× HP, 540× ATK, 540× rewards — unlocked at wave 3000
 *
 * A player who dominates Tier 1 wave 500 will struggle on Tier 2 wave 40.
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
		description: '20× enemy HP, 20× enemy damage, 20× rewards. First real difficulty jump.',
		waveRequirement: 100,
		unlocked: false,
		rewards: ['20× Coin Rewards', 'Challenge Unlock', 'Tier 2 Milestones'],
	},
	{
		id: TierId.Tier3,
		name: 'Tier 3: Digital Onslaught',
		description: '60× enemy HP, 60× enemy damage, 60× rewards. Requires significant workshop investment.',
		waveRequirement: 500,
		unlocked: false,
		rewards: ['60× Coin Rewards', 'Card System (future)', 'Tier 3 Milestones'],
	},
	{
		id: TierId.Tier4,
		name: 'Tier 4: Quantum Surge',
		description: '180× enemy HP, 180× enemy damage, 180× rewards. Deep progression territory.',
		waveRequirement: 1500,
		unlocked: false,
		rewards: ['180× Coin Rewards', 'Module System (future)', 'Tier 4 Milestones'],
	},
	{
		id: TierId.Tier5,
		name: 'Tier 5: Geo Ascension',
		description: '540× enemy HP, 540× enemy damage, 540× rewards. Endgame aspirational tier.',
		waveRequirement: 3000,
		unlocked: false,
		rewards: ['540× Coin Rewards', 'Ultimate Weapon (future)', 'Ascension Perks'],
	},
];
