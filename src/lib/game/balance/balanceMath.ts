/**
 * balanceMath.ts — Long-tail idle tower defense scaling formulas.
 *
 * DESIGN PHILOSOPHY:
 * This is NOT a 20-wave roguelite. GeoCore TD supports thousands of waves
 * across months/years of permanent progression. All formulas are designed
 * for long-term compounding without numerical collapse.
 *
 * Key principles:
 * - Enemy HP/ATK grow sub-exponentially (approx wave^1.2) so player
 *   upgrades compound meaningfully across hundreds of waves.
 * - Workshop upgrades provide meaningful base growth (+5 dmg/level, etc.)
 *   so permanent investment is visibly rewarded.
 * - Battle upgrades provide strong run-scaling (+3 dmg/level, etc.)
 * - Tier system multiplies difficulty for long-term challenge layers.
 * - Cost curves range from cheap (early levels) to astronomical (late levels).
 *   Maxing everything is never expected.
 *
 * Future layers (Labs, Cards, Modules, Ultimate Weapons) can slot in as
 * additional multipliers on top of this foundation.
 */

import { EnemyType } from '../engine/gameTypes';
import type { EnemyConfig } from '../engine/gameTypes';

// ─── Tier definitions ──────────────────────────────────────────────────────
// Each tier multiplies enemy stats and rewards to create meaningful
// difficulty layers. Tier 1 is the baseline/farming tier.
// Higher tiers are unlocked via milestones and provide better rewards.

export interface TierMultiplier {
	hp: number;
	attack: number;
	speed: number;
	reward: number;
}

export const TIER_MULTIPLIERS: Record<number, TierMultiplier> = {
	1: { hp: 1.0,  attack: 1.0,  speed: 1.0,  reward: 1.0 },
	2: { hp: 3.0,  attack: 2.0,  speed: 1.1,  reward: 2.5 },
	3: { hp: 8.0,  attack: 4.5,  speed: 1.2,  reward: 5.0 },
	4: { hp: 22.0, attack: 10.0, speed: 1.3,  reward: 12.0 },
	5: { hp: 55.0, attack: 22.0, speed: 1.5,  reward: 25.0 },
};

export function getTierMultiplier(tier: number): TierMultiplier {
	return TIER_MULTIPLIERS[tier] ?? TIER_MULTIPLIERS[1]!;
}

// ─── Wave scaling (Tier 1 base) ────────────────────────────────────────────
// These formulas grow sub-exponentially so player upgrades remain relevant
// for hundreds of waves. Shape: linear + polynomial ~ wave^1.2
//
// hp:   1 + wave*0.02 + wave^1.2 * 0.001
// atk:  1 + wave*0.012 + wave^1.1 * 0.0005
// spd:  1 + min(0.5, wave*0.001)
//
// Key values (Tier 1):
//   Wave   10: HP×1.22  ATK×1.13  SPD×1.01
//   Wave   25: HP×1.55  ATK×1.32  SPD×1.025
//   Wave   50: HP×2.11  ATK×1.64  SPD×1.05
//   Wave  100: HP×3.25  ATK×2.28  SPD×1.10
//   Wave  250: HP×6.72  ATK×4.23  SPD×1.25
//   Wave  500: HP×12.6  ATK×7.51  SPD×1.50
//   Wave 1000: HP×24.5  ATK×14.1  SPD×1.50 (capped)
//   Wave 2500: HP×61.9  ATK×34.0  SPD×1.50 (capped)
//   Wave 4500: HP×113   ATK×60.5  SPD×1.50 (capped)

export function waveHpMultiplier(wave: number): number {
	return 1 + wave * 0.07 + Math.pow(wave, 1.2) * 0.0012;
}

export function waveAttackMultiplier(wave: number): number {
	return 1 + wave * 0.025 + Math.pow(wave, 1.2) * 0.0004;
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

export function bossHpMultiplier(wave: number): number {
	return 8 + wave * 0.15;
}

export function bossAttackMultiplier(wave: number): number {
	return 2.0 + wave * 0.025;
}

export function bossRewardMultiplier(wave: number): number {
	return 6 + wave * 0.08;
}

// ─── Enemy count formula ───────────────────────────────────────────────────

export function enemiesPerWave(wave: number, cap: number = 200): number {
	const raw = 3 + wave * 0.25 + Math.sqrt(wave) * 1.5;
	return Math.min(Math.floor(raw), cap);
}

export function bossEscortCount(wave: number, cap: number = 20): number {
	return Math.min(Math.floor(2 + wave * 0.15), cap);
}

// ─── Cost formulas ─────────────────────────────────────────────────────────

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
	[EnemyType.Normal]:  { hp: 10,  speed: 65,  attack: 2,  attackRange: 30,  attackCooldown: 1.5, size: 16 },
	[EnemyType.Fast]:    { hp: 5,   speed: 120, attack: 1,  attackRange: 25,  attackCooldown: 1.0, size: 13 },
	[EnemyType.Tank]:    { hp: 35,  speed: 30,  attack: 4,  attackRange: 30,  attackCooldown: 2.0, size: 24 },
	[EnemyType.Ranged]:  { hp: 8,   speed: 50,  attack: 2,  attackRange: 200, attackCooldown: 2.5, size: 15 },
	[EnemyType.Boss]:    { hp: 250, speed: 30,  attack: 15, attackRange: 50,  attackCooldown: 1.5, size: 40 },
};

export const ENEMY_TYPE_MODIFIERS: Record<EnemyType, {
	hp: number;
	attack: number;
	speed: number;
	reward: number;
}> = {
	[EnemyType.Normal]:  { hp: 1.0,  attack: 1.0,  speed: 1.0,  reward: 1.0 },
	[EnemyType.Fast]:    { hp: 0.5,  attack: 0.75, speed: 1.8,  reward: 1.3 },
	[EnemyType.Tank]:    { hp: 3.0,  attack: 1.25, speed: 0.6,  reward: 2.2 },
	[EnemyType.Ranged]:  { hp: 1.3,  attack: 0.7,  speed: 0.8,  reward: 1.7 },
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
	[EnemyType.Boss]:    50,
};

export const ENEMY_BASE_COIN_REWARD: Record<EnemyType, number> = {
	[EnemyType.Normal]:  0,
	[EnemyType.Fast]:    1,
	[EnemyType.Tank]:    2,
	[EnemyType.Ranged]:  1,
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

// ─── Enemy config builder (tier-aware) ─────────────────────────────────────

export function computeEnemyConfig(
	type: EnemyType,
	wave: number,
	tier: number = 1,
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
} {
	const base = ENEMY_BASE_STATS[type];
	const mod = ENEMY_TYPE_MODIFIERS[type];
	const tierMul = getTierMultiplier(tier);
	const isBoss = type === EnemyType.Boss;

	const hpMul = waveHpMultiplier(wave);
	const atkMul = waveAttackMultiplier(wave);
	const spdMul = waveSpeedMultiplier(wave);
	const cashMul = waveCashRewardMultiplier(wave);
	const coinMul = waveCoinRewardMultiplier(wave);

	let hp: number;
	let damage: number;
	let speed: number;
	let cashReward: number;
	let coinReward: number;

	if (isBoss) {
		const normalHp = ENEMY_BASE_STATS[EnemyType.Normal].hp * hpMul;
		const normalAtk = ENEMY_BASE_STATS[EnemyType.Normal].attack * atkMul;
		hp = Math.floor(normalHp * bossHpMultiplier(wave) * tierMul.hp);
		damage = Math.floor(normalAtk * bossAttackMultiplier(wave) * mod.attack * tierMul.attack);
		speed = base.speed * spdMul * mod.speed * tierMul.speed;
		const normalCash = ENEMY_BASE_CASH_REWARD[EnemyType.Normal] * cashMul;
		cashReward = Math.floor(normalCash * bossRewardMultiplier(wave) * tierMul.reward);
		coinReward = Math.floor(ENEMY_BASE_COIN_REWARD[EnemyType.Boss] * coinMul * tierMul.reward);
	} else {
		hp = Math.floor(base.hp * hpMul * mod.hp * tierMul.hp);
		damage = Math.floor(base.attack * atkMul * mod.attack * tierMul.attack);
		speed = base.speed * spdMul * mod.speed * tierMul.speed;
		cashReward = Math.floor(ENEMY_BASE_CASH_REWARD[type] * cashMul * mod.reward * tierMul.reward);
		coinReward = Math.floor(ENEMY_BASE_COIN_REWARD[type] * coinMul * tierMul.reward);
	}

	const armor = Math.min(ENEMY_BASE_ARMOR[type] + waveArmorBonus(wave, isBoss), isBoss ? 0.55 : 0.45);

	return {
		hp,
		maxHp: hp,
		speed: Math.max(10, speed),
		damage: Math.max(1, damage),
		armor,
		attackRange: base.attackRange,
		attackCooldown: base.attackCooldown,
		size: isBoss ? Math.min(60, base.size + Math.floor(wave * 0.1)) : base.size,
		color: ENEMY_COLORS[type],
		shape: ENEMY_SHAPES[type],
		cashReward: Math.max(1, cashReward),
		coinReward: Math.max(0, coinReward),
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

// ─── Compact number formatter ──────────────────────────────────────────────

export function formatCompact(n: number): string {
	if (n < 1000) return n.toFixed(0);
	if (n < 1_000_000) return (n / 1000).toFixed(1) + 'K';
	if (n < 1_000_000_000) return (n / 1_000_000).toFixed(2) + 'M';
	if (n < 1_000_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B';
	return (n / 1_000_000_000_000).toFixed(2) + 'T';
}
