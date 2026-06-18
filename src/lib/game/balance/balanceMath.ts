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

import { EnemyType, DamageType } from '../engine/gameTypes';
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
			if (a.wave <= 0 || b.wave <= a.wave) return a.value;
			const exponent = Math.log(b.value / a.value) / Math.log(b.wave / a.wave);
			return a.value * Math.pow(wave / a.wave, exponent);
		}
	}

	const a = anchors[anchors.length - 2]!;
	const b = anchors[anchors.length - 1]!;
	if (b.wave <= a.wave) return b.value;
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
// Each front is ~10× harder than the previous one — reaching wave ~1000 on a
// front equates to roughly wave ~100 on the next. `reward` (in-run Energy)
// scales with difficulty so the economy keeps pace; `alloy` is a SEPARATE,
// modest permanent-currency incentive to risk the harder fronts.

export interface TierMultiplier {
	hp: number;
	attack: number;
	speed: number;
	/** In-run Energy/cash reward multiplier (scales with difficulty). */
	reward: number;
	/** Permanent Alloy multiplier for everything earned on this front. */
	alloy: number;
}

// Fronts 1–5 keep their original, tuned values (locked by existing tests).
// Fronts 6–16 are PLACEHOLDER scaffolding: difficulty continues ~10× per Front,
// Alloy continues +0.2 per Front, speed eases up toward a 1.6 cap. These are NOT
// final balance — the 16-Front curve is not claimed complete (see report).
export const TIER_MULTIPLIERS: Record<number, TierMultiplier> = (() => {
	const base: Record<number, TierMultiplier> = {
		1: { hp: 1.0,      attack: 1.0,      speed: 1.0,  reward: 1.0,      alloy: 1.0 },
		2: { hp: 10.0,     attack: 10.0,     speed: 1.15, reward: 10.0,     alloy: 1.2 },
		3: { hp: 100.0,    attack: 100.0,    speed: 1.30, reward: 100.0,    alloy: 1.4 },
		4: { hp: 1000.0,   attack: 1000.0,   speed: 1.45, reward: 1000.0,   alloy: 1.6 },
		5: { hp: 10000.0,  attack: 10000.0,  speed: 1.50, reward: 10000.0,  alloy: 1.8 },
	};
	for (let front = 6; front <= 16; front++) {
		const mag = Math.pow(10, front - 1); // ~10× per Front (placeholder)
		base[front] = {
			hp: mag,
			attack: mag,
			speed: Math.min(1.6, 1.5 + (front - 5) * 0.01),
			reward: mag,
			alloy: 1.0 + (front - 1) * 0.2,
		};
	}
	return base;
})();

export function getTierMultiplier(tier: number): TierMultiplier {
	return TIER_MULTIPLIERS[tier] ?? TIER_MULTIPLIERS[1]!;
}

// ─── Enemy count scaling per Front ──────────────────────────────────────────
// Higher Fronts spawn MORE enemies per wave (not more HP/damage — that is the
// Front multiplier above). This keeps the economy/shiny rate scaling with the
// Front while making higher Fronts feel denser, not just numerically bigger.

/** Per-Front enemy-count multiplier: 1 + 0.33·(front−1). Front 1 = 1.00×. */
export function enemyCountMultiplier(front: number): number {
	const f = Number.isFinite(front) && front >= 1 ? front : 1;
	return 1 + 0.33 * (f - 1);
}

/** Permanent Alloy multiplier for a front (1.0 on Front 1, rising on harder fronts). */
export function getFrontAlloyMultiplier(tier: number): number {
	return getTierMultiplier(tier).alloy;
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
// HP is stable so every boss wave reads as a major event without hidden ramp
// weirdness on top of the already steep piecewise enemy scaling.

export function bossHpMultiplier(_wave: number): number {
	return 22.5;
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

export const STARTING_TOWER_RANGE = 180;
export const RANGED_ATTACK_RANGE = STARTING_TOWER_RANGE - 1;

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
	[EnemyType.Fast]:    { hp: 22,  speed: 65,  attack: 11, attackRange: 25,  attackCooldown: 1.0, size: 13 },
	[EnemyType.Tank]:    { hp: 140, speed: 65,  attack: 33, attackRange: 30,  attackCooldown: 2.0, size: 24 },
	[EnemyType.Ranged]:  { hp: 34,  speed: 50,  attack: 18, attackRange: RANGED_ATTACK_RANGE, attackCooldown: 2.5, size: 15 },
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
	[EnemyType.Tank]:    { hp: 8.0,  attack: 1.5,  speed: 0.55, reward: 2.2 },
	[EnemyType.Ranged]:  { hp: 1.3,  attack: 1.2,  speed: 0.8,  reward: 1.7 },
	[EnemyType.Boss]:    { hp: 1.0,  attack: 1.0,  speed: 1.0,  reward: 1.0 },
};

export const ENEMY_BASE_ARMOR: Record<EnemyType, number> = {
	[EnemyType.Normal]:  0,
	[EnemyType.Fast]:    0,
	[EnemyType.Tank]:    0,
	[EnemyType.Ranged]:  0,
	[EnemyType.Boss]:    0,
};

/** Legacy no-op kept for back-compat; Front-aware armor lives in frontEnemyArmor. */
export function waveArmorBonus(_wave: number, _isBoss: boolean): number {
	return 0;
}

// ─── Armor / Resistance / Damage-Type scaffolding ───────────────────────────
// Armor is a flat damage-reduction fraction (0–1), the same field the combat
// pipeline already reads. Policy (see design pass):
//   Perimeter (1–4): NO armor anywhere.
//   Redline opener (Front 5): armor appears LATE, ~Wave 100 / Boss 10.
//   Front 6–8: armor more frequent, from mid-game.
//   Blacksite/Anomaly (9+): armor is part of the Front identity, from early on.

/** True once a Front can ever field armored enemies (Front 5+). */
export function frontHasArmor(front: number): boolean {
	return front >= 5;
}

/** True once a Front can ever field damage-type resistances (Front 9+). */
export function frontHasResistance(front: number): boolean {
	return front >= 9;
}

/** Front-aware enemy armor fraction for a given wave (capped later by type). */
export function frontEnemyArmor(front: number, wave: number, isBoss: boolean): number {
	if (front <= 4) return 0; // Perimeter — no armor
	if (front === 5) {
		// Late Redline introduction: nothing until ~Wave 100 / Boss 10.
		if (wave < 100) return 0;
		const t = Math.min(1, (wave - 100) / 200);
		return (isBoss ? 0.15 : 0.08) + t * 0.15;
	}
	if (front <= 8) {
		if (wave < 30) return 0;
		const t = Math.min(1, (wave - 30) / 200);
		return (isBoss ? 0.20 : 0.12) + t * 0.20;
	}
	// Front 9+ : armor is identity.
	const t = Math.min(1, wave / 200);
	return (isBoss ? 0.28 : 0.18) + t * 0.22;
}

/**
 * Front-aware damage-type resistances (0–1 per type). Empty before Front 9 —
 * the only state Perimeter/Redline ever see. Scaffolded for Front 9+ so the
 * damage pipeline and UI can display resistances without a later schema change.
 * Values are PLACEHOLDER and intentionally mild; not a tuned elemental system.
 */
export function frontEnemyResistances(front: number, wave: number): Partial<Record<DamageType, number>> {
	if (front < 9) return {};
	const t = Math.min(0.5, 0.1 + wave / 1000);
	// Blacksite (9–12): a single non-Kinetic resistance begins to matter.
	if (front <= 12) {
		return { [DamageType.Thermal]: t * 0.6 };
	}
	// Anomaly (13–16): broader resistance spread; Front 16 hints at immunity.
	const immune = front >= 16 ? 1 : t;
	return {
		[DamageType.Thermal]: t,
		[DamageType.Arc]: t * 0.8,
		[DamageType.Void]: immune,
	};
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
	resistances: Partial<Record<DamageType, number>>;
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

	const armor = Math.min(ENEMY_BASE_ARMOR[type] + frontEnemyArmor(tier, wave, isBoss), isBoss ? 0.55 : 0.45);

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
		resistances: frontEnemyResistances(tier, wave),
	};
}

/**
 * Enemy types eligible for random spawn on a given (wave, Front).
 *
 * Front 1 introduces mechanics SLOWLY so the player learns one thing at a time:
 *   Wave 1–9  Basic only      (Wave 10 is the first Boss, handled elsewhere)
 *   Wave 11+  + Fast / Runner  (after the first Boss)
 *   Wave 50+  + Tank / Bulwark (after Boss 5)
 *   Wave 100+ + Ranged / Needle (after Boss 10)
 *
 * Fronts 2–4 (Perimeter escalation) introduce the SAME known types earlier.
 * Fronts 5+ (Redline and beyond) field the full roster from early on.
 * Array duplicates act as spawn weights.
 */
export function availableEnemyTypes(wave: number, front: number = 1): EnemyType[] {
	const types: EnemyType[] = [EnemyType.Normal];

	let fastAt: number, tankAt: number, rangedAt: number;
	if (front <= 1) {
		fastAt = 11; tankAt = 50; rangedAt = 100;       // deliberate slow drip
	} else if (front <= 4) {
		fastAt = 4; tankAt = 15; rangedAt = 30;          // Perimeter escalation
	} else {
		fastAt = 3; tankAt = 8; rangedAt = 15;           // Redline+ full roster
	}

	if (wave >= fastAt) types.push(EnemyType.Fast);
	if (wave >= tankAt) types.push(EnemyType.Tank);
	if (wave >= rangedAt) types.push(EnemyType.Ranged);

	// Pressure weighting once the roster is open (scaled off each Front's pacing).
	if (wave >= tankAt + 10) types.push(EnemyType.Tank);
	if (wave >= rangedAt + 15) types.push(EnemyType.Ranged);
	if (front >= 2 && wave >= 50) { types.push(EnemyType.Tank); types.push(EnemyType.Fast); }

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

/** Flat Alloy reward for a shiny enemy kill — always 2, like the original game. */
export const SHINY_BASE_ALLOY = 2;

/** Determine if an enemy spawns as shiny (uses a deterministic RNG call per enemy). */
export function isShinySpawn(rngValue: number): boolean {
	return rngValue < SHINY_CHANCE;
}

/** Alloy reward for killing a shiny enemy — flat 2, independent of wave. */
export function getShinyAlloyReward(_wave: number): number {
	return SHINY_BASE_ALLOY;
}

/** Override color for shiny enemies — a golden/white tint. */
export const SHINY_COLOR_OVERRIDE = 0xFFD700;

// ─── Compact number formatter ──────────────────────────────────────────────

const COMPACT_SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

export function formatCompact(n: number): string {
	if (!Number.isFinite(n)) return '∞';
	if (n < 0) return '-' + formatCompact(-n);
	if (n < 1000) return n.toFixed(0);
	// Pick the largest suffix whose 1000^tier divisor keeps the mantissa < 1000.
	let tier = Math.min(Math.floor(Math.log10(n) / 3), COMPACT_SUFFIXES.length - 1);
	const decimals = (t: number) => (t === 1 ? 1 : 2);
	let scaled = n / Math.pow(1000, tier);
	// Rounding can push the mantissa to 1000 (e.g. 999_999 → "1000.0K"); roll up.
	if (Number(scaled.toFixed(decimals(tier))) >= 1000 && tier < COMPACT_SUFFIXES.length - 1) {
		tier++;
		scaled = n / Math.pow(1000, tier);
	}
	// One decimal at K, two beyond — matches the prior formatting.
	return scaled.toFixed(decimals(tier)) + COMPACT_SUFFIXES[tier];
}

// ─── Enemy Mastery system ──────────────────────────────────────────────────

/** Kill-count thresholds for mastery levels 1–5. */
export const MASTERY_THRESHOLDS = [100, 1000, 10_000, 100_000, 1_000_000];

/** 0–5: how many mastery levels have been earned for this kill count. */
export function getMasteryLevel(kills: number): number {
	let level = 0;
	for (const t of MASTERY_THRESHOLDS) { if (kills >= t) level++; else break; }
	return level;
}

/** Damage bonus multiplier addend: +0.01 per mastery level (0.0–0.05). */
export function getMasteryBonus(kills: number): number {
	return getMasteryLevel(kills) * 0.01;
}
