import type { UpgradeId, BattleUpgrade } from '../engine/gameTypes';

// ─── Scaling presets for endless play ─────────────────────────────────────

/** Scaling strategy determines how cost and effect grow with level. */
export type ScalingPreset = 'polynomial' | 'linear_capped' | 'linear' | 'premium';

export interface UpgradeScaling {
	preset: ScalingPreset;
	/** Base cost at level 0 */
	costBase: number;
	/** Cost growth factor (meaning depends on preset) */
	costRate: number;
	/** Base effect per level (before power curve) */
	effectBase: number;
	/** Power exponent for polynomial scaling (ignored for linear) */
	effectPower?: number;
	/** Hard cap on total effect (for linear_capped) */
	effectCap?: number;
}

/** Compute gold cost for level `n` (0-indexed: cost to buy level n+1). */
export function computeCost(s: UpgradeScaling, level: number): number {
	switch (s.preset) {
		case 'linear':
		case 'linear_capped':
			// cost = base * (1 + level * rate) — gentle linear growth
			return Math.floor(s.costBase * (1 + level * s.costRate));
		case 'polynomial':
			// cost = base * (1 + level*rate + level²*0.00003) — slight curve for high levels
			return Math.floor(s.costBase * (1 + level * s.costRate + level * level * 0.00003));
		case 'premium':
			// cost = base * rate^level — exponential for special upgrades
			return Math.floor(s.costBase * Math.pow(s.costRate, level));
	}
}

/** Compute raw effect at level `n`. Does NOT apply cap — use computeCappedEffect for that. */
export function computeEffect(s: UpgradeScaling, level: number): number {
	switch (s.preset) {
		case 'linear':
			return level * s.effectBase;
		case 'linear_capped':
			return level * s.effectBase;
		case 'polynomial':
			// effect = base * level^power — gives meaningful scaling at high levels
			return s.effectBase * Math.pow(level, s.effectPower ?? 1.08);
		case 'premium':
			return level * s.effectBase;
	}
}

/** Effect with cap applied (for capped presets). */
export function computeCappedEffect(s: UpgradeScaling, level: number): number {
	const raw = computeEffect(s, level);
	if (s.effectCap !== undefined) return Math.min(raw, s.effectCap);
	return raw;
}

/** Format effect value for UI display. */
export function formatEffect(id: UpgradeId, value: number): string {
	switch (id) {
		case 'damage' as UpgradeId: return '+' + value.toFixed(1) + ' DMG';
		case 'fireRate' as UpgradeId: return '+' + (value * 100).toFixed(1) + '% ATK/s';
		case 'range' as UpgradeId: return '+' + value.toFixed(0) + ' range';
		case 'multishot' as UpgradeId: return '+' + (value * 100).toFixed(1) + '% chance';
		case 'multishotProjectiles' as UpgradeId: return '+' + value + ' extra proj';
		case 'critChance' as UpgradeId: return '+' + (value * 100).toFixed(1) + '% crit';
		case 'defense' as UpgradeId: return '-' + value.toFixed(1) + ' dmg/hit';
		case 'maxHp' as UpgradeId: return '+' + value.toFixed(0) + ' max HP';
		case 'goldAmp' as UpgradeId: return '+' + (value * 100).toFixed(1) + '% gold';
		case 'piercing' as UpgradeId: return '-' + (value * 100).toFixed(1) + '% armor';
		default: return String(value);
	}
}

// ─── Upgrade definitions ───────────────────────────────────────────────────

export interface UpgradeConfig {
	id: UpgradeId;
	name: string;
	description: string;
	icon: string;
	category: 'offense' | 'defense' | 'utility';
	maxLevel: number;
	scaling: UpgradeScaling;
}

export const UPGRADE_CONFIGS: UpgradeConfig[] = [
	// ── Offense ──
	{
		id: 'damage' as UpgradeId,
		name: 'Damage',
		description: 'Damage per projectile. Scales up at higher levels.',
		icon: '⚡',
		category: 'offense',
		maxLevel: 500,
		scaling: { preset: 'polynomial', costBase: 10, costRate: 0.025, effectBase: 0.4, effectPower: 1.12 },
	},
	{
		id: 'fireRate' as UpgradeId,
		name: 'Fire Rate',
		description: 'Attacks per second. Capped at +50%.',
		icon: '🔥',
		category: 'offense',
		maxLevel: 250,
		scaling: { preset: 'linear_capped', costBase: 15, costRate: 0.035, effectBase: 0.002, effectCap: 0.50 },
	},
	{
		id: 'range' as UpgradeId,
		name: 'Range',
		description: 'Attack range in pixels. Scales up at higher levels.',
		icon: '🎯',
		category: 'offense',
		maxLevel: 200,
		scaling: { preset: 'polynomial', costBase: 12, costRate: 0.02, effectBase: 0.8, effectPower: 1.08 },
	},
	{
		id: 'multishot' as UpgradeId,
		name: 'Multishot Chance',
		description: 'Chance to fire extra projectiles. Capped at 80%.',
		icon: '🎲',
		category: 'offense',
		maxLevel: 160,
		scaling: { preset: 'linear_capped', costBase: 25, costRate: 0.04, effectBase: 0.005, effectCap: 0.80 },
	},
	{
		id: 'multishotProjectiles' as UpgradeId,
		name: 'Multishot Proj.',
		description: 'Extra projectiles when Multishot triggers. Capped at 8.',
		icon: '💥',
		category: 'offense',
		maxLevel: 8,
		scaling: { preset: 'premium', costBase: 80, costRate: 1.15, effectBase: 1, effectCap: 8 },
	},
	{
		id: 'critChance' as UpgradeId,
		name: 'Crit Chance',
		description: 'Chance to deal 2× damage. Capped at 50%.',
		icon: '⭐',
		category: 'offense',
		maxLevel: 500,
		scaling: { preset: 'linear_capped', costBase: 15, costRate: 0.03, effectBase: 0.001, effectCap: 0.50 },
	},
	{
		id: 'piercing' as UpgradeId,
		name: 'Piercing',
		description: 'Ignores enemy armor. Capped at 40%.',
		icon: '🔱',
		category: 'offense',
		maxLevel: 200,
		scaling: { preset: 'linear_capped', costBase: 18, costRate: 0.035, effectBase: 0.002, effectCap: 0.40 },
	},
	// ── Defense ──
	{
		id: 'defense' as UpgradeId,
		name: 'Defense',
		description: 'Flat damage reduction per hit. Scales up at higher levels.',
		icon: '🛡️',
		category: 'defense',
		maxLevel: 200,
		scaling: { preset: 'polynomial', costBase: 12, costRate: 0.025, effectBase: 0.25, effectPower: 1.06 },
	},
	{
		id: 'maxHp' as UpgradeId,
		name: 'Max HP',
		description: 'Increases maximum tower HP. Scales up at higher levels.',
		icon: '❤️',
		category: 'defense',
		maxLevel: 250,
		scaling: { preset: 'polynomial', costBase: 12, costRate: 0.025, effectBase: 2.5, effectPower: 1.06 },
	},
	// ── Utility ──
	{
		id: 'goldAmp' as UpgradeId,
		name: 'Gold Amp',
		description: 'Bonus gold per kill. Capped at 75%.',
		icon: '💰',
		category: 'utility',
		maxLevel: 150,
		scaling: { preset: 'linear_capped', costBase: 20, costRate: 0.04, effectBase: 0.005, effectCap: 0.75 },
	},
];

/** Look up scaling config by upgrade ID */
export function getUpgradeConfig(id: UpgradeId): UpgradeConfig | undefined {
	return UPGRADE_CONFIGS.find(c => c.id === id);
}

/** Build BattleUpgrade objects for the UI (adds cost/level functions) */
export function buildBattleUpgrades(): BattleUpgrade[] {
	return UPGRADE_CONFIGS.map(c => ({
		id: c.id,
		name: c.name,
		description: c.description,
		category: c.category,
		level: 0,
		maxLevel: c.maxLevel,
		cost: (level: number) => computeCost(c.scaling, level),
		icon: c.icon,
	}));
}
