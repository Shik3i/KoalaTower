import { LabId, type LabItem } from '../engine/gameTypes';

function defaultCost(level: number, base: number, scale: number): number {
	return Math.floor(base * Math.pow(scale, level));
}

function defaultDuration(level: number): number {
	return Math.max(0, 60 - level * 2);
}

export const LAB_ITEMS: LabItem[] = [
	{
		id: LabId.DamageResearch,
		name: 'Damage Research',
		description: 'Permanently increases base tower damage',
		level: 0,
		maxLevel: 50,
		cost: (level: number) => defaultCost(level, 200, 1.4),
		duration: (level: number) => defaultDuration(level),
		icon: '🔬',
	},
	{
		id: LabId.CoinEfficiency,
		name: 'Coin Efficiency',
		description: 'Increase all coin earnings by percentage',
		level: 0,
		maxLevel: 40,
		cost: (level: number) => defaultCost(level, 300, 1.45),
		duration: (level: number) => defaultDuration(level),
		icon: '📈',
	},
	{
		id: LabId.TowerDurability,
		name: 'Tower Durability',
		description: 'Permanently increases starting tower HP',
		level: 0,
		maxLevel: 40,
		cost: (level: number) => defaultCost(level, 250, 1.42),
		duration: (level: number) => defaultDuration(level),
		icon: '🏗️',
	},
];

export function getLabItemCost(id: LabId, level: number): number {
	const item = LAB_ITEMS.find(i => i.id === id);
	if (!item) return Infinity;
	return item.cost(level);
}

export function getLabItemEffect(id: LabId, level: number): number {
	switch (id) {
		case LabId.DamageResearch: return level * 2;
		case LabId.CoinEfficiency: return level * 0.03;
		case LabId.TowerDurability: return level * 8;
	}
}
