/**
 * forgeUpgrades.ts — Permanent Forge levels for the SHARED Field upgrade curve.
 *
 * DESIGN (v0.5.x correction):
 * The Forge no longer defines its own divergent stat bonuses. Instead it stores
 * the permanent STARTING LEVEL of each Field (battle) upgrade. The level→value
 * curve is the single source of truth in battleUpgrades.ts — Forge and Field
 * both read it via getBattleUpgradeEffect(). A run begins with
 * battleUpgrades[id] = forgeUpgrades[id], and in-run Field purchases continue
 * from that level (so cost and value both pick up where the Forge left off).
 *
 * What the Forge stores here are the shared Field upgrade starting levels.
 * Global economy multipliers (Alloy Boost, Energy Boost, Starting Energy)
 * remain permanent-only in workshopUpgrades.ts.
 *
 * Cost note: the SHARED thing is the value curve, not the cost. Field upgrades
 * are bought with per-run Energy; Forge levels are bought with permanent Alloy
 * on the dedicated curve below (deliberately a slower, meta-progression grind).
 */

import { UpgradeId, BlueprintId } from '../engine/gameTypes';
import type { UpgradeCategory } from '../engine/gameTypes';
import { getBattleUpgradeEffect, getBattleUpgradeDef } from './battleUpgrades';
import { roundedCost } from './balanceMath';

export interface ForgeUpgradeDef {
	id: UpgradeId;
	name: string;
	description: string;
	icon: string;
	category: UpgradeCategory;
	/** Permanent cap for the Forge starting level (≤ the Field maxLevel). */
	maxLevel: number;
	/** Alloy cost = round(baseCost × costGrowth^level). */
	baseCost: number;
	costGrowth: number;
	/** Blueprint that must be owned before this Forge path can be bought. */
	requiredBlueprint?: BlueprintId;
}

/**
 * The combat stats shared between Forge and Field. Each entry's level feeds the
 * SAME getBattleUpgradeEffect(id, level) curve used in-run. Blueprint gating
 * mirrors the Field upgrade gating so a path can't be pre-installed before it
 * can be used. Forge caps are intentionally modest — each level is a full Field
 * level of permanent power.
 */
export const FORGE_UPGRADE_DEFS: ForgeUpgradeDef[] = [
	{
		id: UpgradeId.Damage,
		name: 'Damage',
		description: 'Permanent starting Damage level. Seeds in-run Field upgrade starting level.',
		icon: '⚡', category: 'offense', maxLevel: 60, baseCost: 40, costGrowth: 1.23,
	},
	{
		id: UpgradeId.FireRate,
		name: 'Attack Speed',
		description: 'Permanent starting Attack Speed level. Each level = +0.05 attacks/sec.',
		icon: '🔥', category: 'offense', maxLevel: 50, baseCost: 50, costGrowth: 1.24,
	},
	{
		id: UpgradeId.Range,
		name: 'Range',
		description: 'Permanent starting Range level. Each level = +2 range.',
		icon: '🎯', category: 'offense', maxLevel: 40, baseCost: 45, costGrowth: 1.22,
		requiredBlueprint: BlueprintId.ExtendedCoreOptics,
	},
	{
		id: UpgradeId.CritChance,
		name: 'Crit Chance',
		description: 'Permanent starting Crit Chance level. Each level = +1% crit chance.',
		icon: '⭐', category: 'offense', maxLevel: 30, baseCost: 60, costGrowth: 1.26,
	},
	{
		id: UpgradeId.CritMultiplier,
		name: 'Crit Multiplier',
		description: 'Permanent starting Crit Multiplier level. Base ×1.30, +0.10× per level.',
		icon: '✨', category: 'offense', maxLevel: 25, baseCost: 60, costGrowth: 1.27,
	},
	{
		id: UpgradeId.MaxHp,
		name: 'Max HP',
		description: 'Permanent starting Max HP level. Each level = +100 max HP.',
		icon: '❤️', category: 'defense', maxLevel: 60, baseCost: 35, costGrowth: 1.22,
	},
	{
		id: UpgradeId.Defense,
		name: 'Defense Abs',
		description: 'Permanent starting flat damage reduction. Each level = -0.5 per hit.',
		icon: '🛡️', category: 'defense', maxLevel: 50, baseCost: 50, costGrowth: 1.23,
		requiredBlueprint: BlueprintId.PlatedCoreShell,
	},
	{
		id: UpgradeId.DefensePercent,
		name: 'Defense %',
		description: 'Permanent starting damage reduction. Each level = -1%. Caps at 50%.',
		icon: '🔰', category: 'defense', maxLevel: 30, baseCost: 80, costGrowth: 1.28,
		requiredBlueprint: BlueprintId.PhaseDampener,
	},
	{
		id: UpgradeId.Regen,
		name: 'Regen',
		description: 'Permanent starting Regen. Each level = +0.5 HP/sec. Caps at 10/sec.',
		icon: '💚', category: 'defense', maxLevel: 20, baseCost: 45, costGrowth: 1.24,
	},
	{
		id: UpgradeId.Lifesteal,
		name: 'Lifesteal',
		description: 'Permanent starting Lifesteal. Each level = +0.2% healed. Caps at 5%.',
		icon: '🩸', category: 'defense', maxLevel: 24, baseCost: 100, costGrowth: 1.30,
		requiredBlueprint: BlueprintId.EnergyReclaimer,
	},
	{
		id: UpgradeId.Thorns,
		name: 'Thorns',
		description: 'Permanent starting Thorns. Each level = +2 reflected damage.',
		icon: '🌵', category: 'defense', maxLevel: 30, baseCost: 55, costGrowth: 1.25,
		requiredBlueprint: BlueprintId.ReactiveSurface,
	},
	{
		id: UpgradeId.EnergyAmp,
		name: 'Energy Amp',
		description: 'Permanent starting Energy Amp level. Each level = +2% energy per kill.',
		icon: '⚡', category: 'utility', maxLevel: 40, baseCost: 70, costGrowth: 1.25,
		requiredBlueprint: BlueprintId.EnergyCondenser,
	},
	{
		id: UpgradeId.AlloyPerWave,
		name: 'Alloy/Wave',
		description: 'Permanent starting Alloy/Wave level. Each level = +1 Alloy per cleared wave.',
		icon: '🔩', category: 'utility', maxLevel: 60, baseCost: 80, costGrowth: 1.24,
		requiredBlueprint: BlueprintId.AlloyExtraction,
	},
	{
		id: UpgradeId.CashPerWave,
		name: 'Energy/Wave',
		description: 'Permanent starting Energy/Wave level. Each level = +4 Energy per cleared wave.',
		icon: '💎', category: 'utility', maxLevel: 60, baseCost: 65, costGrowth: 1.24,
		requiredBlueprint: BlueprintId.EnergyCondenser,
	},
];

const defMap = new Map<UpgradeId, ForgeUpgradeDef>();
for (const def of FORGE_UPGRADE_DEFS) defMap.set(def.id, def);

/** The Field upgrade IDs that have a permanent Forge equivalent. */
export const FORGE_UPGRADE_IDS: UpgradeId[] = FORGE_UPGRADE_DEFS.map((d) => d.id);

export function getForgeUpgradeDef(id: UpgradeId): ForgeUpgradeDef | undefined {
	return defMap.get(id);
}

export function isForgeUpgrade(id: UpgradeId): boolean {
	return defMap.has(id);
}

/** Permanent Alloy cost to buy the next Forge level from `level`. */
export function getForgeUpgradeCost(id: UpgradeId, level: number): number {
	const def = defMap.get(id);
	if (!def) return Infinity;
	return roundedCost(def.baseCost, def.costGrowth, level);
}

/**
 * The permanent stat VALUE delta granted at a Forge level — read from the SHARED
 * Field curve so Forge level N is exactly N in-run Field levels.
 */
export function getForgeUpgradeEffect(id: UpgradeId, level: number): number {
	return getBattleUpgradeEffect(id, level);
}

export function buildForgeUpgradeList(): Array<{
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
	return FORGE_UPGRADE_DEFS.map((def) => {
		// Defensive: keep the Forge cap within the Field maxLevel.
		const fieldDef = getBattleUpgradeDef(def.id);
		const cap = fieldDef ? Math.min(def.maxLevel, fieldDef.maxLevel) : def.maxLevel;
		return {
			id: def.id,
			name: def.name,
			description: def.description,
			category: def.category,
			level: 0,
			maxLevel: cap,
			cost: (level: number) => getForgeUpgradeCost(def.id, level),
			icon: def.icon,
			requiredBlueprint: def.requiredBlueprint,
		};
	});
}

/**
 * Seed a run's battle upgrade levels from the permanent Forge levels. The
 * returned record is the starting `battleUpgrades` for the deployment — in-run
 * Field purchases increment from here.
 */
export function seedBattleUpgradesFromForge(
	forge: Partial<Record<UpgradeId, number>> | undefined,
): Partial<Record<UpgradeId, number>> {
	const seed: Partial<Record<UpgradeId, number>> = {};
	if (!forge) return seed;
	for (const def of FORGE_UPGRADE_DEFS) {
		const lv = forge[def.id] ?? 0;
		if (lv > 0) seed[def.id] = Math.min(Math.floor(lv), def.maxLevel);
	}
	return seed;
}
