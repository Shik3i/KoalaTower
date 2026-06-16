import { LabId, type LabItem } from '../engine/gameTypes';

function labCost(level: number, base: number, scale: number): number {
	return Math.floor(base * Math.pow(scale, level));
}

/** Duration in milliseconds for a lab research level. */
function labDuration(level: number): number {
	// Level 1: 10 seconds
	// Level 10: ~2 min
	// Level 50: ~4 hours
	// Level 100: ~12 days
	// Level 200: ~350 years (effectively infinite for practical play)
	const seconds = 10 * Math.pow(1.25, level);
	return Math.floor(seconds * 1000);
}

export const LAB_ITEMS: LabItem[] = [
	{
		id: LabId.DamageResearch,
		name: 'Damage Research',
		description: '+0.01× damage multiplier per level',
		level: 0,
		maxLevel: 9999,
		cost: (level: number) => labCost(level, 100, 1.35),
		duration: (level: number) => labDuration(level),
		icon: '🔬',
	},
	{
		id: LabId.CoinEfficiency,
		name: 'Coin Efficiency',
		description: '+0.02× coin earnings per level',
		level: 0,
		maxLevel: 9999,
		cost: (level: number) => labCost(level, 150, 1.38),
		duration: (level: number) => labDuration(level),
		icon: '📈',
	},
	{
		id: LabId.TowerDurability,
		name: 'Tower Durability',
		description: '+0.5% tower HP per level',
		level: 0,
		maxLevel: 9999,
		cost: (level: number) => labCost(level, 120, 1.36),
		duration: (level: number) => labDuration(level),
		icon: '🏗️',
	},
];

export function getLabItemCost(id: LabId, level: number): number {
	const item = LAB_ITEMS.find(i => i.id === id);
	if (!item) return Infinity;
	return item.cost(level);
}

export function getLabItemDuration(id: LabId, level: number): number {
	const item = LAB_ITEMS.find(i => i.id === id);
	if (!item) return Infinity;
	return item.duration(level);
}

export function getLabItemEffect(id: LabId, level: number): number {
	switch (id) {
		case LabId.DamageResearch: return level * 0.01;
		case LabId.CoinEfficiency: return level * 0.02;
		case LabId.TowerDurability: return level * 0.5;
	}
}
