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
 *
 * PROGRESSION GATING:
 * Upgrades are gated by Blueprints. Starter upgrades (Damage, Attack Speed,
 * Max HP, Regen, Cash/Wave) are always available. Advanced upgrades require
 * the corresponding Blueprint to be purchased first.
 */

import type { UpgradeCategory, BlueprintId } from '../engine/gameTypes';
import { UpgradeId, BlueprintId as BP } from '../engine/gameTypes';
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
	/** Blueprint required to unlock this upgrade (null = starter, always available) */
	requiredBlueprint?: BlueprintId;
}

export const BATTLE_UPGRADE_DEFS: BattleUpgradeDef[] = [
	{
		id: UpgradeId.Damage,
		name: 'Damage',
		description: '+1.0 damage per projectile per level. Core scaling stat.',
		icon: '⚡',
		category: 'offense',
		maxLevel: 999,
		baseCost: 60,
		costGrowth: 1.18,
		costExponent: 0.50,
		effectPerLevel: 1.0,
		// STARTER — always available
	},
	{
		id: UpgradeId.FireRate,
		name: 'Attack Speed',
		description: '+0.03 attacks per second per level.',
		icon: '🔥',
		category: 'offense',
		maxLevel: 399,
		baseCost: 50,
		costGrowth: 1.16,
		costExponent: 0.52,
		effectPerLevel: 0.03,
		// STARTER — always available
	},
	{
		id: UpgradeId.Range,
		name: 'Range',
		description: '+2 range per level. Unlocks via Extended Tower Optics.',
		icon: '🎯',
		category: 'offense',
		maxLevel: 199,
		baseCost: 18,
		costGrowth: 1.11,
		costExponent: 0.45,
		effectPerLevel: 2,
		requiredBlueprint: BP.ExtendedCoreOptics,
	},
	{
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
		requiredBlueprint: BP.SplitBeamGeometry,
	},
	{
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
		requiredBlueprint: BP.SplitBeamGeometry,
	},
	{
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
		requiredBlueprint: BP.CriticalTargeting,
	},
	{
		id: UpgradeId.CritMultiplier,
		name: 'Crit Multiplier',
		description: '+0.08x crit damage per level. Base 2.0x.',
		icon: '✨',
		category: 'offense',
		maxLevel: 49,
		baseCost: 60,
		costGrowth: 1.16,
		costExponent: 0.55,
		effectPerLevel: 0.08,
		requiredBlueprint: BP.CriticalTargeting,
	},
	{
		id: UpgradeId.MaxHp,
		name: 'Max HP',
		description: '+4 max HP per level. Core survivability.',
		icon: '❤️',
		category: 'defense',
		maxLevel: 399,
		baseCost: 25,
		costGrowth: 1.13,
		costExponent: 0.45,
		effectPerLevel: 4,
		// STARTER — always available
	},
	{
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
		requiredBlueprint: BP.PlatedCoreShell,
	},
	{
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
		requiredBlueprint: BP.PhaseDampener,
	},
	{
		id: UpgradeId.Regen,
		name: 'Regen',
		description: '+0.06 HP/sec per level. Caps at 2 HP/s. Minor sustain — smooths chip damage only.',
		icon: '💚',
		category: 'defense',
		maxLevel: 199,
		baseCost: 30,
		costGrowth: 1.13,
		costExponent: 0.45,
		effectPerLevel: 0.06,
		effectCap: 2.0,
		// STARTER — always available, intentionally weak
	},
	{
		id: UpgradeId.Lifesteal,
		name: 'Lifesteal',
		description: '+0.2% of damage healed per level. Caps at 5%. Deep progression sustain.',
		icon: '🩸',
		category: 'defense',
		maxLevel: 24,
		baseCost: 100,
		costGrowth: 1.22,
		costExponent: 0.58,
		effectPerLevel: 0.002,
		effectCap: 0.05,
		requiredBlueprint: BP.EnergyReclaimer,
	},
	{
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
		requiredBlueprint: BP.ReactiveSurface,
	},
	{
		id: UpgradeId.EnergyAmp,
		name: 'Energy Amp',
		description: '+2% energy per kill per level. Unlocks via Alloy Extraction.',
		icon: '⚡',
		category: 'utility',
		maxLevel: 199,
		baseCost: 20,
		costGrowth: 1.12,
		costExponent: 0.45,
		effectPerLevel: 0.02,
		requiredBlueprint: BP.AlloyExtraction,
	},
	{
		id: UpgradeId.CashPerWave,
		name: 'Energy/Wave',
		description: '+1 bonus energy per wave cleared per level.',
		icon: '💎',
		category: 'utility',
		maxLevel: 299,
		baseCost: 25,
		costGrowth: 1.12,
		costExponent: 0.42,
		effectPerLevel: 1,
		// STARTER — always available
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
	requiredBlueprint?: BlueprintId;
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
		requiredBlueprint: def.requiredBlueprint,
	}));
}
