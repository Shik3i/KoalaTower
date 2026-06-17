/**
 * balanceMath.ts — Long-tail idle tower defense scaling formulas.
 *
 * DESIGN PHILOSOPHY:
 * This is NOT a 20-wave roguelite. Flatland TD supports thousands of waves
 * across months/years of permanent progression. All formulas are designed
 * for long-term compounding without numerical collapse.
 *
 * Key principles:
 * - Enemy HP/ATK use piecewise power interpolation from reference anchors.
 *   This produces a deterministic curve that matches proven TD scaling curves.
 * - Workshop upgrades provide meaningful base growth so permanent investment
 *   is visibly rewarded.
 * - Battle upgrades provide strong run-scaling.
 * - Tier system multiplies difficulty for long-term challenge layers.
 * - Cost curves range from cheap (early levels) to astronomical (late levels).
 *   Maxing everything is never expected.
 */

import { EnemyType } from '../engine/gameTypes';
import type { EnemyConfig } from '../engine/gameTypes';

// ─── Piecewise power interpolation ──────────────────────────────────────────

export interface StatAnchor {
	wave: number;
	value: number;
}

/**
 * Deterministic piecewise power interpolation for enemy stat scaling.
 * Given two anchors A and B:
 *   value(wave) = valueA * (wave / waveA) ^ exponent
 *   where exponent = ln(valueB / valueA) / ln(waveB / waveA)
 *
 * For waves between anchors, uses the surrounding pair.
 * For waves before the first anchor, returns the first anchor's value.
 * For waves past the last anchor, extrapolates using the last two anchors.
 */
export function piecewisePowerStat(wave: number, anchors: StatAnchor[]): number {
	if (!Number.isFinite(wave) || wave <= 1) {
		return anchors[0]!.value;
	}

	for (let i = 0; i < anchors.length - 1; i++) {
		const a = anchors[i]!;
		const b = anchors[i + 1]!;
		if (wave <= b.wave) {
			const exponent = Math.log(b.value / a.value) / Math.log(b.wave / a.wave);
			return a.value * Math.pow(wave / a.wave, exponent);
		}
	}

	const a = anchors[anchors.length - 2]!;
	const b = anchors[anchors.length - 1]!;
	const exponent = Math.log(b.value / a.value) / Math.log(b.wave / a.wave);
	return b.value * Math.pow(wave / b.wave, exponent);
}

// ─── Reference Tier 1 enemy stat anchors ────────────────────────────────────
// These are enemy damage and enemy HP reference values for Front 1 Normal enemy.
// They define the curve shape. The values come from a proven TD enemy scaling
// curve and are NOT tower damage or tower HP.

const REFERENCE_TIER_1_DAMAGE_ANCHORS: StatAnchor[] = [
	{ wave: 1, value: 1.18 },
	{ wave: 10, value: 4.81 },
	{ wave: 20, value: 13.65 },
	{ wave: 30, value: 28.76 },
	{ wave: 40, value: 50.41 },
	{ wave: 50, value: 81.33 },
	{ wave: 60, value: 120.19 },
	{ wave: 70, value: 167.99 },
	{ wave: 80, value: 229.96 },
	{ wave: 90, value: 304.54 },
	{ wave: 100, value: 402.95 },
	{ wave: 150, value: 1100 },
	{ wave: 200, value: 2420 },
	{ wave: 250, value: 4620 },
	{ wave: 300, value: 7740 },
	{ wave: 400, value: 19180 },
	{ wave: 500, value: 38940 },
	{ wave: 750, value: 155440 },
	{ wave: 1000, value: 482950 },
];

const REFERENCE_TIER_1_HP_ANCHORS: StatAnchor[] = [
	{ wave: 1, value: 2.35 },
	{ wave: 10, value: 18.36 },
	{ wave: 20, value: 59.25 },
	{ wave: 30, value: 143.36 },
	{ wave: 40, value: 266.11 },
	{ wave: 50, value: 477.47 },
	{ wave: 60, value: 809.09 },
	{ wave: 70, value: 1170 },
	{ wave: 80, value: 1820 },
	{ wave: 90, value: 2780 },
	{ wave: 100, value: 4360 },
	{ wave: 150, value: 17190 },
	{ wave: 200, value: 54840 },
	{ wave: 250, value: 142350 },
	{ wave: 300, value: 323610 },
	{ wave: 400, value: 1350000 },
	{ wave: 500, value: 4530000 },
	{ wave: 750, value: 65500000 },
	{ wave: 1000, value: 742100000 },
];

/** Flatland TD applies its own scale multiplier on top of the reference curve. */
export const FLTD_ENEMY_DAMAGE_SCALE = 20;
export const FLTD_ENEMY_HP_SCALE = 20;

/** Front 1 (Tier 1) enemy damage for any wave — piecewise power interpolated. */
export function front1EnemyDamage(wave: number): number {
	return piecewisePowerStat(wave, REFERENCE_TIER_1_DAMAGE_ANCHORS) * FLTD_ENEMY_DAMAGE_SCALE;
}

/** Front 1 (Tier 1) enemy HP for any wave — piecewise power interpolated. */
export function front1EnemyHp(wave: number): number {
	return piecewisePowerStat(wave, REFERENCE_TIER_1_HP_ANCHORS) * FLTD_ENEMY_HP_SCALE;
}

// ─── Tier definitions (Front / Deployment Zone multipliers) ─────────────────
// Front 1 is base (1x). Front 2 is ~20x, Front 3 is ~60x.
// These multipliers apply to FLTD-scaled enemy HP and damage from Front 1.
// Tier 4+ are scaffold multipliers documented for future use.

export interface TierMultiplier {
	hp: number;
	attack: number;
	speed: number;
	reward: number;
}

export const TIER_MULTIPLIERS: Record<number, TierMultiplier> = {
	1: { hp: 1.0,   attack: 1.0,   speed: 1.0,  reward: 1.0 },
	2: { hp: 20.0,  attack: 20.0,  speed: 1.15, reward: 20.0 },
	3: { hp: 60.0,  attack: 60.0,  speed: 1.30, reward: 60.0 },
	4: { hp: 180.0, attack: 180.0, speed: 1.50, reward: 180.0 },
	5: { hp: 540.0, attack: 540.0, speed: 1.50, reward: 540.0 },
};

export function getTierMultiplier(tier: number): TierMultiplier {
	return TIER_MULTIPLIERS[tier] ?? TIER_MULTIPLIERS[1]!;
}

// ─── Wave scaling (legacy — kept for speed/reward formulas) ─────────────────
// Enemy HP and damage now use piecewisePowerStat via front1EnemyHp/Damage.
// Speed and reward formulas remain simpler.

export function waveHpMultiplier(wave: number): number {
	return piecewisePowerStat(wave, REFERENCE_TIER_1_HP_ANCHORS);
}

export function waveAttackMultiplier(wave: number): number {
	return piecewisePowerStat(wave, REFERENCE_TIER_1_DAMAGE_ANCHORS);
}

export function waveSpeedMultiplier(wave: number): number {
	return 1 + Math.min(0.5, wave * 0.001);
}

// ─── Reward scaling ────────────────────────────────────────────────────────
// Cash (run gold) and Coin (permanent currency) scale to support
// continued upgrade purchasing across hundreds of waves.

export function waveCashRewardMultiplier(wave: number): number {
	return 1 + wave * 0.05 + Math.pow(wave, 1.3) * 0.0002;
}

export function waveCoinRewardMultiplier(wave: number): number {
	return 1 + wave * 0.03 + Math.pow(wave, 1.1) * 0.0001;
}

// ─── Boss multipliers ──────────────────────────────────────────────────────
// Boss stats relative to a normal enemy at the same wave × tier.
// Capped to prevent absurd spikes on top of already steep piecewise enemy scaling.
// Early boss wave 10: ~5.5× HP, ~1.6× ATK — reachable after early permanent progress.
// Late boss: caps at 25× HP, 8× ATK to remain walls but not impossible spikes.

export function bossHpMultiplier(wave: number): number {
	return Math.min(25, 5 + wave * 0.05);
}

export function bossAttackMultiplier(wave: number): number {
	return Math.min(8, 1.5 + wave * 0.01);
}

export function bossRewardMultiplier(wave: number): number {
	return Math.min(30, 5 + wave * 0.05);
}

// ─── Enemy count formula ───────────────────────────────────────────────────

export function enemiesPerWave(wave: number, cap: number = 200): number {
	const raw = 22 + (wave - 1) * 1.6 + Math.sqrt(wave) * 1.5;
	return Math.min(Math.max(Math.floor(raw), 3), cap);
}

export function bossEscortCount(wave: number, cap: number = 20): number {
	return Math.min(Math.floor(2 + wave * 0.15), cap);
}

// ─── Cost formulas ─────────────────────────────────────────────────────────

/**
 * Rounds to nearest integer, away from zero (standard Math.round).
 * Used for clean early-game costs without flat repeated values.
 */
export function roundNice(value: number): number {
	return Math.round(value);
}

/**
 * Polynomial cost for high-cap upgrades: cost = floor(base × (level+1)^exponent)
 * This grows much more slowly than hybridCost, supporting thousands of levels.
 * At exponent 1.6 with base 50:
 *   Level 1: ~150     Level 10: ~2.3K   Level 100: ~81K
 *   Level 1000: ~3M   Level 5000: ~79M
 */
export function polynomialCost(base: number, exponent: number, level: number): number {
	return Math.floor(base * Math.pow(level + 1, exponent));
}

/**
 * Hybrid cost for low-cap high-power upgrades: cost = floor(base × growth^level × (level+1)^exponent)
 * This grows exponentially, making high levels prohibitively expensive.
 * Used for capped powerful stats (fire rate, defense%, lifesteal, etc.)
 */
export function hybridCost(base: number, growth: number, exponent: number, level: number): number {
	return Math.floor(base * Math.pow(growth, level) * Math.pow(level + 1, exponent));
}

/**
 * Clean early-game cost: round(base × growth^level)
 * Uses round() instead of floor() to avoid repeated flat costs at very early levels.
 */
export function roundedCost(base: number, growth: number, level: number): number {
	return Math.round(base * Math.pow(growth, level));
}

export function additiveEffect(perLevel: number, level: number, cap?: number): number {
	const raw = level * perLevel;
	return cap !== undefined ? Math.min(raw, cap) : raw;
}

// ─── Enemy type configuration ───────────────────────────────────────

export const ENEMY_BASE_STATS: Record<EnemyType, {
	hp: number;
	speed: number;
	attack: number;
	attackRange: number;
	attackCooldown: number;
	size: number;
}> = {
	[EnemyType.Normal]:  { hp: 45,  speed: 65,  attack: 22, attackRange: 30,  attackCooldown: 1.5, size: 16 },
	[EnemyType.Fast]:    { hp: 22,  speed: 120, attack: 11, attackRange: 25,  attackCooldown: 1.0, size: 13 },
	[EnemyType.Tank]:    { hp: 140, speed: 30,  attack: 33, attackRange: 30,  attackCooldown: 2.0, size: 24 },
	[EnemyType.Ranged]:  { hp: 34,  speed: 50,  attack: 18, attackRange: 200, attackCooldown: 2.5, size: 15 },
	[EnemyType.Boss]:    { hp: 800, speed: 30,  attack: 55, attackRange: 50,  attackCooldown: 1.5, size: 40 },
};

export const ENEMY_TYPE_MODIFIERS: Record<EnemyType, {
	hp: number;
	attack: number;
	speed: number;
	reward: number;
}> = {
	[EnemyType.Normal]:  { hp: 1.0,  attack: 1.0,  speed: 1.0,  reward: 1.0 },
	[EnemyType.Fast]:    { hp: 0.5,  attack: 1.0,  speed: 1.8,  reward: 1.3 },
	[EnemyType.Tank]:    { hp: 3.0,  attack: 1.5,  speed: 0.6,  reward: 2.2 },
	[EnemyType.Ranged]:  { hp: 1.3,  attack: 1.2,  speed: 0.8,  reward: 1.7 },
	[EnemyType.Boss]:    { hp: 1.0,  attack: 1.0,  speed: 1.0,  reward: 1.0 },
};

export const ENEMY_BASE_ARMOR: Record<EnemyType, number> = {
	[EnemyType.Normal]:  0,
	[EnemyType.Fast]:    0,
	[EnemyType.Tank]:    0.15,
	[EnemyType.Ranged]:  0,
	[EnemyType.Boss]:    0.10,
};

export function waveArmorBonus(wave: number, isBoss: boolean): number {
	if (wave <= 15) return 0;
	const raw = (wave - 15) * 0.001;
	return Math.min(raw, isBoss ? 0.50 : 0.40);
}

export const ENEMY_BASE_CASH_REWARD: Record<EnemyType, number> = {
	[EnemyType.Normal]:  2,
	[EnemyType.Fast]:    3,
	[EnemyType.Tank]:    5,
	[EnemyType.Ranged]:  4,
	[EnemyType.Boss]:    20,
};

export const ENEMY_BASE_COIN_REWARD: Record<EnemyType, number> = {
	[EnemyType.Normal]:  0,
	[EnemyType.Fast]:    0,
	[EnemyType.Tank]:    0,
	[EnemyType.Ranged]:  0,
	[EnemyType.Boss]:    5,
};

export const ENEMY_SHAPES: Record<EnemyType, EnemyConfig['shape']> = {
	[EnemyType.Normal]:  'square',
	[EnemyType.Fast]:    'diamond',
	[EnemyType.Tank]:    'hexagon',
	[EnemyType.Ranged]:  'triangle',
	[EnemyType.Boss]:    'pentagon',
};

export const ENEMY_COLORS: Record<EnemyType, number> = {
	[EnemyType.Normal]:  0x00FFFF,
	[EnemyType.Fast]:    0x44FF88,
	[EnemyType.Tank]:    0x8844FF,
	[EnemyType.Ranged]:  0xFF8844,
	[EnemyType.Boss]:    0xFF44AA,
};

// ─── Enemy config builder (tier-aware, piecewise power) ────────────────────

export function computeEnemyConfig(
	type: EnemyType,
	wave: number,
	tier: number = 1,
	isShiny: boolean = false,
): {
	hp: number;
	maxHp: number;
	speed: number;
	damage: number;
	armor: number;
	attackRange: number;
	attackCooldown: number;
	size: number;
	color: number;
	shape: EnemyConfig['shape'];
	cashReward: number;
	coinReward: number;
	isShiny: boolean;
} {
	const base = ENEMY_BASE_STATS[type];
	const mod = ENEMY_TYPE_MODIFIERS[type];
	const tierMul = getTierMultiplier(tier);
	const isBoss = type === EnemyType.Boss;

	const refHp = front1EnemyHp(wave);
	const refAtk = front1EnemyDamage(wave);
	const spdMul = waveSpeedMultiplier(wave);
	const cashMul = waveCashRewardMultiplier(wave);
	const coinMul = waveCoinRewardMultiplier(wave);

	let hp: number;
	let damage: number;
	let speed: number;
	let cashReward: number;
	let coinReward: number;

	if (isBoss) {
		hp = Math.floor(refHp * bossHpMultiplier(wave) * tierMul.hp);
		damage = Math.floor(refAtk * bossAttackMultiplier(wave) * mod.attack * tierMul.attack);
		speed = base.speed * spdMul * mod.speed * tierMul.speed;
		const normalCash = ENEMY_BASE_CASH_REWARD[EnemyType.Normal] * cashMul;
		cashReward = Math.floor(normalCash * bossRewardMultiplier(wave) * tierMul.reward);
		coinReward = Math.floor(ENEMY_BASE_COIN_REWARD[EnemyType.Boss] * coinMul * tierMul.reward);
	} else {
		hp = Math.floor(refHp * mod.hp * tierMul.hp);
		damage = Math.floor(refAtk * mod.attack * tierMul.attack);
		speed = base.speed * spdMul * mod.speed * tierMul.speed;
		cashReward = Math.floor(ENEMY_BASE_CASH_REWARD[type] * cashMul * mod.reward * tierMul.reward);
		coinReward = Math.floor(ENEMY_BASE_COIN_REWARD[type] * coinMul * tierMul.reward);
	}

	const armor = Math.min(ENEMY_BASE_ARMOR[type] + waveArmorBonus(wave, isBoss), isBoss ? 0.55 : 0.45);

	const effectiveCashReward = isShiny
		? Math.max(1, Math.floor(cashReward * SHINY_ENERGY_MULTIPLIER))
		: Math.max(1, cashReward);
	const effectiveCoinReward = isShiny
		? Math.max(1, getShinyAlloyReward(wave))
		: Math.max(0, coinReward);
	const effectiveColor = isShiny ? SHINY_COLOR_OVERRIDE : ENEMY_COLORS[type];

	return {
		hp,
		maxHp: hp,
		speed: Math.max(10, speed),
		damage: Math.max(1, damage),
		armor,
		attackRange: base.attackRange,
		attackCooldown: base.attackCooldown,
		size: isBoss ? Math.min(60, base.size + Math.floor(wave * 0.1)) : base.size,
		color: effectiveColor,
		shape: ENEMY_SHAPES[type],
		cashReward: effectiveCashReward,
		coinReward: effectiveCoinReward,
		isShiny,
	};
}

export function availableEnemyTypes(wave: number): EnemyType[] {
	const types: EnemyType[] = [EnemyType.Normal];
	if (wave >= 4) types.push(EnemyType.Fast);
	if (wave >= 8) types.push(EnemyType.Tank);
	if (wave >= 15) types.push(EnemyType.Ranged);
	// Increase tank and ranged weight at higher waves for more pressure
	if (wave >= 20) { types.push(EnemyType.Tank); types.push(EnemyType.Tank); }
	if (wave >= 25) types.push(EnemyType.Ranged);
	if (wave >= 35) types.push(EnemyType.Fast);
	if (wave >= 50) { types.push(EnemyType.Tank); types.push(EnemyType.Ranged); }
	return types;
}

export function spawnIntervalForWave(wave: number, minInterval: number = 0.06, baseInterval: number = 0.6, decay: number = 0.988): number {
	return Math.max(minInterval, baseInterval * Math.pow(decay, wave - 1));
}

// ─── Shiny enemy system ────────────────────────────────────────────────────
// Shiny enemies are rare variants with double Energy reward and small Alloy bonus.

/** Base chance for any spawned enemy to be shiny. */
export const SHINY_CHANCE = 0.05;

/** Energy multiplier for shiny enemies. */
export const SHINY_ENERGY_MULTIPLIER = 2;

/** Base Alloy reward for a shiny enemy kill (before workshop/lab multipliers). */
export const SHINY_BASE_ALLOY = 1;

/** Determine if an enemy spawns as shiny (uses a deterministic RNG call per enemy). */
export function isShinySpawn(rngValue: number): boolean {
	return rngValue < SHINY_CHANCE;
}

/** Compute the Alloy reward for killing a shiny enemy. */
export function getShinyAlloyReward(wave: number): number {
	return Math.floor(SHINY_BASE_ALLOY + wave * 0.02);
}

/** Override color for shiny enemies — a golden/white tint. */
export const SHINY_COLOR_OVERRIDE = 0xFFD700;

// ─── Compact number formatter ──────────────────────────────────────────────

export function formatCompact(n: number): string {
	if (n < 1000) return n.toFixed(0);
	if (n < 1_000_000) return (n / 1000).toFixed(1) + 'K';
	if (n < 1_000_000_000) return (n / 1_000_000).toFixed(2) + 'M';
	if (n < 1_000_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B';
	return (n / 1_000_000_000_000).toFixed(2) + 'T';
}
