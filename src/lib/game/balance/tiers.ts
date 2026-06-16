import { TierId, type TierDef } from '../engine/gameTypes';

export const TIERS: TierDef[] = [
	{
		id: TierId.Tier1,
		name: 'Tier 1: The Awakening',
		description: 'The tower awakens. Defend against the first waves.',
		waveRequirement: 0,
		unlocked: true,
		rewards: ['Unlock Workshop', 'Unlock Lab'],
	},
	{
		id: TierId.Tier2,
		name: 'Tier 2: Neon Storm',
		description: 'The storm intensifies. Harder enemies, greater rewards.',
		waveRequirement: 50,
		unlocked: false,
		rewards: ['Unlock Challenges', '+50% Coin Bonus'],
	},
	{
		id: TierId.Tier3,
		name: 'Tier 3: Digital Onslaught',
		description: 'Digital nightmares emerge. Prove your worth.',
		waveRequirement: 150,
		unlocked: false,
		rewards: ['Unlock Elite Enemies', '+100% Coin Bonus'],
	},
	{
		id: TierId.Tier4,
		name: 'Tier 4: Quantum Surge',
		description: 'Reality bends. Only the strong survive.',
		waveRequirement: 300,
		unlocked: false,
		rewards: ['Unlock Quantum Upgrades', '+200% Coin Bonus'],
	},
	{
		id: TierId.Tier5,
		name: 'Tier 5: The Koala Ascension',
		description: 'Ascend beyond. Become the legend.',
		waveRequirement: 500,
		unlocked: false,
		rewards: ['Unlock Ascension Perks', '+500% Coin Bonus'],
	},
];
