/**
 * battleUpgrades.ts — Long-tail Battle Upgrade definitions.
 *
 * DESIGN PHILOSOPHY:
 * Battle upgrades reset each run but provide strong temporary scaling.
 * They build on top of the Workshop baseline. During a good run, a
 * player should buy many levels of core upgrades. Costs ramp
 * exponentially so there are diminishing returns within a single run.
 *
 * Per-level effects are strong enough that upgrading feels impactful
 * each time, while the growing costs prevent infinite single-run scaling.
 */

import type { UpgradeCategory } from '../engine/gameTypes';
import { UpgradeId } from '../engine/gameTypes';
import { hybridCost, additiveEffect, formatBattleEffect as fmtEffect } from './upgradeScaling';

export interface BattleUpgradeDef {
	id: UpgradeId;
	name: string;
	description: string;
	icon: string;
	category: UpgradeCategory;
	maxLevel: number;
	baseCost: number;
	costGrowth: number;
	costExponent: number;
	effectPerLevel: number;
	effectCap?: number;
	/** Wave at which this upgrade becomes purchasable (0 = always) */
	unlockWave?: number;
}

export const BATTLE_UPGRADE_DEFS: BattleUpgradeDef[] = [
	{
		// Core damage. Very high cap. Each level is +3 damage.
		// With 50 levels: +150 damage during a run.
		id: UpgradeId.Damage,
		name: 'Damage',
		description: '+3 damage per projectile per level. Core scaling stat.',
		icon: '⚡',
		category: 'offense',
		maxLevel: 999,
		baseCost: 100,
		costGrowth: 1.18,
		costExponent: 0.50,
		effectPerLevel: 1.5,
	},
	{
		// Attack speed. Critical early and mid game.
		id: UpgradeId.FireRate,
		name: 'Attack Speed',
		description: '+0.04 attacks per second per level.',
		icon: '🔥',
		category: 'offense',
		maxLevel: 399,
		baseCost: 80,
		costGrowth: 1.16,
		costExponent: 0.52,
		effectPerLevel: 0.04,
	},
	{
		// Range. Medium cap.
		id: UpgradeId.Range,
		name: 'Range',
		description: '+2 range per level.',
		icon: '🎯',
		category: 'offense',
		maxLevel: 199,
		baseCost: 18,
		costGrowth: 1.11,
		costExponent: 0.45,
		effectPerLevel: 2,
	},
	{
		// Multishot chance. Unlocks at wave 10 so early runs focus on basics.
		id: UpgradeId.Multishot,
		name: 'Multishot Chance',
		description: '+0.6% chance per level to fire extra projectiles. Caps at 50%.',
		icon: '🎲',
		category: 'offense',
		maxLevel: 99,
		baseCost: 35,
		costGrowth: 1.14,
		costExponent: 0.50,
		effectPerLevel: 0.006,
		effectCap: 0.50,
		unlockWave: 10,
	},
	{
		// Multishot targets. Low cap — each level adds +1 projectile.
		id: UpgradeId.MultishotProjectiles,
		name: 'Multishot Targets',
		description: '+1 extra projectile when Multishot triggers.',
		icon: '💥',
		category: 'offense',
		maxLevel: 14,
		baseCost: 250,
		costGrowth: 2.2,
		costExponent: 0.20,
		effectPerLevel: 1,
	},
	{
		// Crit chance. Unlocks at wave 10.
		id: UpgradeId.CritChance,
		name: 'Crit Chance',
		description: '+0.6% crit chance per level. Caps at 45%.',
		icon: '⭐',
		category: 'offense',
		maxLevel: 89,
		baseCost: 28,
		costGrowth: 1.13,
		costExponent: 0.48,
		effectPerLevel: 0.006,
		effectCap: 0.45,
		unlockWave: 10,
	},
	{
		// Crit multiplier. Unlocks at wave 10.
		id: UpgradeId.CritMultiplier,
		name: 'Crit Multiplier',
		description: '+0.08× crit damage per level. Base 2.0×.',
		icon: '✨',
		category: 'offense',
		maxLevel: 49,
		baseCost: 60,
		costGrowth: 1.16,
		costExponent: 0.55,
		effectPerLevel: 0.08,
		unlockWave: 10,
	},
	{
		// Max HP. High cap for survivability builds.
		id: UpgradeId.MaxHp,
		name: 'Max HP',
		description: '+12 max HP per level. Core survivability.',
		icon: '❤️',
		category: 'defense',
		maxLevel: 399,
		baseCost: 18,
		costGrowth: 1.11,
		costExponent: 0.42,
		effectPerLevel: 12,
	},
	{
		// Defense Absolute: flat damage reduction after defense%.
		// Reduced from 1.0 to 0.5 per level — prevents trivializing mid-game.
		// Players need many levels for meaningful reduction.
		id: UpgradeId.Defense,
		name: 'Defense Abs',
		description: 'Flat -0.5 damage per hit after defense%. Minimum 1 damage.',
		icon: '🛡️',
		category: 'defense',
		maxLevel: 199,
		baseCost: 20,
		costGrowth: 1.11,
		costExponent: 0.44,
		effectPerLevel: 0.5,
	},
	{
		// Defense Percent: percentage damage reduction. Capped at 50%.
		// Unlocks at wave 15 — gating prevents early immortality.
		id: UpgradeId.DefensePercent,
		name: 'Defense %',
		description: '-1% incoming damage per level. Caps at 50%.',
		icon: '🔰',
		category: 'defense',
		maxLevel: 59,
		baseCost: 45,
		costGrowth: 1.16,
		costExponent: 0.52,
		effectPerLevel: 0.01,
		effectCap: 0.50,
		unlockWave: 15,
	},
	{
		// Health Regen: minor HP/sec. Unlocks at wave 15 so early runs
		// can't sustain through chip damage. Small per-level keeps it
		// as a long-term investment, not a quick fix.
		id: UpgradeId.Regen,
		name: 'Regen',
		description: '+0.2 HP/sec per level. Minor sustain.',
		icon: '💚',
		category: 'defense',
		maxLevel: 199,
		baseCost: 20,
		costGrowth: 1.11,
		costExponent: 0.42,
		effectPerLevel: 0.2,
		unlockWave: 15,
	},
	{
		// Lifesteal: heal fraction of projectile damage dealt.
		// Unlocks at wave 50 — deep into mid-game.
		// This is intentionally late because lifesteal with even moderate
		// DPS completely negates all chip damage forever.
		id: UpgradeId.Lifesteal,
		name: 'Lifesteal',
		description: '+0.2% of damage healed per level. Caps at 5%. Unlocks wave 50.',
		icon: '🩸',
		category: 'defense',
		maxLevel: 24,
		baseCost: 100,
		costGrowth: 1.22,
		costExponent: 0.58,
		effectPerLevel: 0.002,
		effectCap: 0.05,
		unlockWave: 50,
	},
	{
		// Thorns: reflect damage to melee attackers.
		// Unlocks at wave 15.
		id: UpgradeId.Thorns,
		name: 'Thorns',
		description: '+2 reflected damage per hit per level. Bosses take 50%.',
		icon: '🌵',
		category: 'defense',
		maxLevel: 49,
		baseCost: 35,
		costGrowth: 1.15,
		costExponent: 0.50,
		effectPerLevel: 2,
		unlockWave: 15,
	},
	{
		// Cash bonus. Economy upgrades matter.
		id: UpgradeId.GoldAmp,
		name: 'Energy Amp',
		description: '+2% energy per kill per level.',
		icon: '⚡',
		category: 'utility',
		maxLevel: 199,
		baseCost: 20,
		costGrowth: 1.12,
		costExponent: 0.45,
		effectPerLevel: 0.02,
	},
	{
		// Cash per wave. Steady income source.
		id: UpgradeId.CashPerWave,
		name: 'Cash/Wave',
		description: '+3 bonus cash per wave cleared per level.',
		icon: '💎',
		category: 'utility',
		maxLevel: 299,
		baseCost: 15,
		costGrowth: 1.10,
		costExponent: 0.38,
		effectPerLevel: 3,
	},
];

const defMap = new Map<UpgradeId, BattleUpgradeDef>();
for (const def of BATTLE_UPGRADE_DEFS) {
	defMap.set(def.id, def);
}

export function getBattleUpgradeDef(id: UpgradeId): BattleUpgradeDef | undefined {
	return defMap.get(id);
}

export function getBattleUpgradeCost(id: UpgradeId, level: number): number {
	const def = defMap.get(id);
	if (!def) return Infinity;
	return hybridCost(def.baseCost, def.costGrowth, def.costExponent, level);
}

export function getBattleUpgradeEffect(id: UpgradeId, level: number): number {
	const def = defMap.get(id);
	if (!def) return 0;
	return additiveEffect(def.effectPerLevel, level, def.effectCap);
}

export function formatBattleEffectValue(id: UpgradeId, value: number): string {
	return fmtEffect(id, value);
}

export function buildBattleUpgradeList(): Array<{
	id: UpgradeId;
	name: string;
	description: string;
	category: UpgradeCategory;
	level: number;
	maxLevel: number;
	cost: (level: number) => number;
	icon: string;
}> {
	return BATTLE_UPGRADE_DEFS.map(def => ({
		id: def.id,
		name: def.name,
		description: def.description,
		category: def.category,
		level: 0,
		maxLevel: def.maxLevel,
		cost: (level: number) => getBattleUpgradeCost(def.id, level),
		icon: def.icon,
	}));
}
