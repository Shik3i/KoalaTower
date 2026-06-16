import { UpgradeId, type BattleUpgrade } from '../engine/gameTypes';

function defaultCost(level: number, base: number, scale: number): number {
	return Math.floor(base * Math.pow(scale, level));
}

export const BATTLE_UPGRADES: BattleUpgrade[] = [
	// ── Offense ──
	{
		id: UpgradeId.Damage,
		name: 'Damage',
		description: 'Increases damage per shot',
		category: 'offense',
		level: 0, maxLevel: 50,
		cost: (level) => defaultCost(level, 15, 1.22),
		icon: '⚡',
	},
	{
		id: UpgradeId.FireRate,
		name: 'Fire Rate',
		description: 'Increases attacks per second',
		category: 'offense',
		level: 0, maxLevel: 40,
		cost: (level) => defaultCost(level, 20, 1.25),
		icon: '🔥',
	},
	{
		id: UpgradeId.Range,
		name: 'Range',
		description: 'Increases attack range',
		category: 'offense',
		level: 0, maxLevel: 30,
		cost: (level) => defaultCost(level, 25, 1.28),
		icon: '🎯',
	},
	{
		id: UpgradeId.Multishot,
		name: 'Multishot',
		description: 'Extra projectiles per shot',
		category: 'offense',
		level: 0, maxLevel: 20,
		cost: (level) => defaultCost(level, 40, 1.32),
		icon: '💥',
	},
	{
		id: UpgradeId.CritChance,
		name: 'Crit Chance',
		description: 'Chance to deal 2x damage',
		category: 'offense',
		level: 0, maxLevel: 30,
		cost: (level) => defaultCost(level, 25, 1.28),
		icon: '⭐',
	},
	// ── Defense ──
	{
		id: UpgradeId.Defense,
		name: 'Defense',
		description: 'Flat damage reduction per hit',
		category: 'defense',
		level: 0, maxLevel: 30,
		cost: (level) => defaultCost(level, 20, 1.25),
		icon: '🛡️',
	},
	{
		id: UpgradeId.MaxHp,
		name: 'Max HP',
		description: 'Increases maximum tower HP',
		category: 'defense',
		level: 0, maxLevel: 30,
		cost: (level) => defaultCost(level, 20, 1.28),
		icon: '❤️',
	},
	// ── Utility ──
	{
		id: UpgradeId.GoldAmp,
		name: 'Gold Amp',
		description: '+5% Gold per kill per level',
		category: 'utility',
		level: 0, maxLevel: 30,
		cost: (level) => defaultCost(level, 30, 1.28),
		icon: '💰',
	},
	{
		id: UpgradeId.Piercing,
		name: 'Piercing',
		description: 'Ignores 2% more enemy armor per level',
		category: 'utility',
		level: 0, maxLevel: 30,
		cost: (level) => defaultCost(level, 35, 1.30),
		icon: '🔱',
	},
];

export function getBattleUpgradeCost(id: UpgradeId, level: number): number {
	const upgrade = BATTLE_UPGRADES.find(u => u.id === id);
	if (!upgrade) return Infinity;
	return upgrade.cost(level);
}

export function getBattleUpgradeEffect(id: UpgradeId, level: number): number {
	switch (id) {
		case UpgradeId.Damage: return level * 8;
		case UpgradeId.FireRate: return level * 0.10;
		case UpgradeId.Range: return level * 12;
		case UpgradeId.Multishot: return Math.min(level, 20);
		case UpgradeId.CritChance: return level * 0.025;
		case UpgradeId.Defense: return level * 2;
		case UpgradeId.MaxHp: return level * 15;
		case UpgradeId.GoldAmp: return level * 0.06;
		case UpgradeId.Piercing: return level * 0.025;
	}
}
