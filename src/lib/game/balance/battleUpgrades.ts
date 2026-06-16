import { UpgradeId, type BattleUpgrade } from '../engine/gameTypes';

function defaultCost(level: number, base: number, scale: number): number {
	return Math.floor(base * Math.pow(scale, level));
}

export const BATTLE_UPGRADES: BattleUpgrade[] = [
	{
		id: UpgradeId.Damage,
		name: 'Damage',
		description: 'Increase tower damage per shot',
		category: 'offense',
		level: 0, maxLevel: 50,
		cost: (level) => defaultCost(level, 20, 1.25),
		icon: '⚡',
	},
	{
		id: UpgradeId.FireRate,
		name: 'Fire Rate',
		description: 'Increase tower attack speed',
		category: 'offense',
		level: 0, maxLevel: 40,
		cost: (level) => defaultCost(level, 25, 1.28),
		icon: '🔥',
	},
	{
		id: UpgradeId.Range,
		name: 'Range',
		description: 'Increase tower attack range',
		category: 'offense',
		level: 0, maxLevel: 30,
		cost: (level) => defaultCost(level, 30, 1.3),
		icon: '🎯',
	},
	{
		id: UpgradeId.Multishot,
		name: 'Multishot',
		description: 'Fire additional projectiles',
		category: 'offense',
		level: 0, maxLevel: 20,
		cost: (level) => defaultCost(level, 50, 1.35),
		icon: '💥',
	},
	{
		id: UpgradeId.CritChance,
		name: 'Crit Chance',
		description: 'Chance to deal double damage',
		category: 'offense',
		level: 0, maxLevel: 30,
		cost: (level) => defaultCost(level, 35, 1.3),
		icon: '⭐',
	},
	{
		id: UpgradeId.Defense,
		name: 'Defense',
		description: 'Reduce damage taken',
		category: 'defense',
		level: 0, maxLevel: 30,
		cost: (level) => defaultCost(level, 30, 1.28),
		icon: '🛡️',
	},
	{
		id: UpgradeId.MaxHp,
		name: 'Max HP',
		description: 'Increase tower maximum HP',
		category: 'defense',
		level: 0, maxLevel: 30,
		cost: (level) => defaultCost(level, 25, 1.3),
		icon: '❤️',
	},
];

export function getBattleUpgradeCost(id: UpgradeId, level: number): number {
	const upgrade = BATTLE_UPGRADES.find(u => u.id === id);
	if (!upgrade) return Infinity;
	return upgrade.cost(level);
}

export function getBattleUpgradeEffect(id: UpgradeId, level: number): number {
	switch (id) {
		case UpgradeId.Damage: return level * 5;
		case UpgradeId.FireRate: return level * 0.08;
		case UpgradeId.Range: return level * 10;
		case UpgradeId.Multishot: return Math.min(level, 20);
		case UpgradeId.CritChance: return level * 0.02;
		case UpgradeId.Defense: return level * 1.5;
		case UpgradeId.MaxHp: return level * 10;
	}
}
