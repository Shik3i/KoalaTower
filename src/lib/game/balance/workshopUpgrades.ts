import { WorkshopUpgradeId, type WorkshopUpgrade } from '../engine/gameTypes';

function defaultCost(level: number, base: number, scale: number): number {
	return Math.floor(base * Math.pow(scale, level));
}

export const WORKSHOP_UPGRADES: WorkshopUpgrade[] = [
	{
		id: WorkshopUpgradeId.BaseDamage,
		name: 'Base Damage',
		description: 'Permanently increase tower damage',
		level: 0,
		maxLevel: 100,
		cost: (level: number) => defaultCost(level, 50, 1.28),
		icon: '⚡',
	},
	{
		id: WorkshopUpgradeId.BaseFireRate,
		name: 'Base Fire Rate',
		description: 'Permanently increase fire rate',
		level: 0,
		maxLevel: 80,
		cost: (level: number) => defaultCost(level, 60, 1.30),
		icon: '🔥',
	},
	{
		id: WorkshopUpgradeId.BaseRange,
		name: 'Base Range',
		description: 'Permanently increase tower range',
		level: 0,
		maxLevel: 60,
		cost: (level: number) => defaultCost(level, 70, 1.32),
		icon: '🎯',
	},
	{
		id: WorkshopUpgradeId.StartingHp,
		name: 'Starting HP',
		description: 'Start each run with more HP',
		level: 0,
		maxLevel: 80,
		cost: (level: number) => defaultCost(level, 40, 1.26),
		icon: '❤️',
	},
	{
		id: WorkshopUpgradeId.CoinBonus,
		name: 'Coin Bonus',
		description: 'Earn more coins per run',
		level: 0,
		maxLevel: 60,
		cost: (level: number) => defaultCost(level, 100, 1.35),
		icon: '🪙',
	},
	{
		id: WorkshopUpgradeId.CashBonus,
		name: 'Cash Bonus',
		description: 'Earn more gold per kill',
		level: 0,
		maxLevel: 60,
		cost: (level: number) => defaultCost(level, 80, 1.35),
		icon: '💰',
	},
	{
		id: WorkshopUpgradeId.CritBonus,
		name: 'Crit Bonus',
		description: 'Permanently increase crit chance',
		level: 0,
		maxLevel: 50,
		cost: (level: number) => defaultCost(level, 90, 1.36),
		icon: '⭐',
	},
	{
		id: WorkshopUpgradeId.StartingCash,
		name: 'Starting Gold',
		description: 'Start each run with more gold',
		level: 0,
		maxLevel: 50,
		cost: (level: number) => defaultCost(level, 60, 1.30),
		icon: '💵',
	},
];

export function getWorkshopUpgradeCost(id: WorkshopUpgradeId, level: number): number {
	const upgrade = WORKSHOP_UPGRADES.find(u => u.id === id);
	if (!upgrade) return Infinity;
	return upgrade.cost(level);
}

export function getWorkshopUpgradeEffect(id: WorkshopUpgradeId, level: number): number {
	switch (id) {
		case WorkshopUpgradeId.BaseDamage: return level * 3;
		case WorkshopUpgradeId.BaseFireRate: return level * 0.03;
		case WorkshopUpgradeId.BaseRange: return level * 5;
		case WorkshopUpgradeId.StartingHp: return level * 5;
		case WorkshopUpgradeId.CoinBonus: return level * 0.02;
		case WorkshopUpgradeId.CashBonus: return level * 0.02;
		case WorkshopUpgradeId.CritBonus: return level * 0.005;
		case WorkshopUpgradeId.StartingCash: return level * 3;
	}
}
