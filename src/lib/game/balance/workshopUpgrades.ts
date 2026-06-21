/**
 * workshopUpgrades.ts — Long-tail Workshop (Foundry) with original-like scaling.
 *
 * DESIGN PHILOSOPHY:
 * - High-cap stats (Damage, HP, DefAbs, Regen) have 5000+ levels with
 *   tiny per-level effects. Long-term accumulation becomes powerful.
 * - Low-cap stats (FireRate, Def%, Lifesteal) are expensive per level
 *   because they are powerful. Caps prevent domination.
 * - Economy multiplier stats have 1000 levels for farming progression.
 * - Cost curves use gentle polynomial growth for high-cap stats and
 *   steeper hybrid growth for capped stats.
 *
 * PROGRESSION GATING:
 * Starter upgrades (Damage, Attack Speed, HP, Regen) are always
 * available. Advanced upgrades require purchasing the corresponding Blueprint.
 *
 * Level targets:
 *   First 10:   cheap, buyable after 1-2 runs
 *   Level 100:  farmable after moderate play (hours)
 *   Level 1000: significant time investment (weeks)
 *   Level 5000: extreme long-term goal (months/years)
 */

import { WorkshopUpgradeId, BlueprintId } from '../engine/gameTypes';
import { polynomialCost, hybridCost, additiveEffect, formatCompact } from './balanceMath';

export interface WorkshopUpgradeDef {
	id: WorkshopUpgradeId;
	name: string;
	description: string;
	icon: string;
	maxLevel: number;
	/** Cost formula: 'polynomial' for high-cap, 'hybrid' for capped stats */
	costType: 'polynomial' | 'hybrid';
	baseCost: number;
	/** Cost exponent (for polynomial) or growth factor (for hybrid) */
	costParam1: number;
	/** Cost exponent (for hybrid only, 0 for polynomial) */
	costParam2?: number;
	effectPerLevel: number;
	effectCap?: number;
	targetStat: string;
	/** Blueprint required to unlock (null = starter, always available) */
	requiredBlueprint?: BlueprintId;
}

export const WORKSHOP_UPGRADE_DEFS: WorkshopUpgradeDef[] = [
	{
		id: WorkshopUpgradeId.BaseDamage,
		name: 'Damage',
		description: '+5 base damage per level. Front-loaded for early impact.',
		icon: '⚡',
		maxLevel: 999999,
		costType: 'polynomial',
		baseCost: 30,
		costParam1: 1.6,
		effectPerLevel: 5,
		targetStat: 'damage',
		// STARTER — always available
	},
	{
		id: WorkshopUpgradeId.BaseFireRate,
		name: 'Attack Speed',
		description: '+0.1 base attacks/sec per level. Caps at 10/s before Research.',
		icon: '🔥',
		maxLevel: 90,
		costType: 'hybrid',
		baseCost: 30,
		costParam1: 1.18,
		costParam2: 0.55,
		effectPerLevel: 0.1,
		effectCap: 9,
		targetStat: 'fireRate',
		// STARTER — always available
	},
	{
		id: WorkshopUpgradeId.BaseRange,
		name: 'Range',
		description: '+0.5 base range per level.',
		icon: '🎯',
		maxLevel: 79,
		costType: 'hybrid',
		baseCost: 35,
		costParam1: 1.20,
		costParam2: 0.55,
		effectPerLevel: 0.5,
		targetStat: 'range',
		requiredBlueprint: BlueprintId.ExtendedCoreOptics,
	},
	{
		id: WorkshopUpgradeId.StartingHp,
		name: 'Health',
		description: '+10 max HP per level. Front-loaded for early survivability.',
		icon: '❤️',
		maxLevel: 6000,
		costType: 'polynomial',
		baseCost: 20,
		costParam1: 1.55,
		effectPerLevel: 10,
		targetStat: 'hp',
		// STARTER — always available
	},
	{
		id: WorkshopUpgradeId.DefenseAbsolute,
		name: 'Defense Abs',
		description: '+0.3 flat damage reduction per level after defense%.',
		icon: '🛡️',
		maxLevel: 5000,
		costType: 'polynomial',
		baseCost: 30,
		costParam1: 1.58,
		effectPerLevel: 0.3,
		targetStat: 'defenseAbsolute',
		requiredBlueprint: BlueprintId.PlatedCoreShell,
	},
	{
		id: WorkshopUpgradeId.Regen,
		name: 'Regen',
		description: '+0.3 HP/sec per level. Many levels for meaningful sustain.',
		icon: '💚',
		maxLevel: 5000,
		costType: 'polynomial',
		baseCost: 25,
		costParam1: 1.57,
		effectPerLevel: 0.3,
		targetStat: 'regen',
		// STARTER — always available
	},
	{
		id: WorkshopUpgradeId.DefensePercent,
		name: 'Defense %',
		description: '+1% damage reduction per level. Caps at 50%. Steep cost.',
		icon: '🔰',
		maxLevel: 49,
		costType: 'hybrid',
		baseCost: 60,
		costParam1: 1.22,
		costParam2: 0.60,
		effectPerLevel: 0.01,
		effectCap: 0.50,
		targetStat: 'defensePercent',
		requiredBlueprint: BlueprintId.PhaseDampener,
	},
	{
		id: WorkshopUpgradeId.Lifesteal,
		name: 'Lifesteal',
		description: '+0.5% lifesteal per level. Caps at 10%. Very expensive.',
		icon: '🩸',
		maxLevel: 19,
		costType: 'hybrid',
		baseCost: 100,
		costParam1: 1.35,
		costParam2: 0.65,
		effectPerLevel: 0.005,
		effectCap: 0.10,
		targetStat: 'lifesteal',
		requiredBlueprint: BlueprintId.EnergyReclaimer,
	},
	{
		id: WorkshopUpgradeId.Thorns,
		name: 'Thorns',
		description: '+1 reflected damage per level. Bosses take 50%.',
		icon: '🌵',
		maxLevel: 99,
		costType: 'hybrid',
		baseCost: 40,
		costParam1: 1.20,
		costParam2: 0.52,
		effectPerLevel: 1,
		targetStat: 'thorns',
		requiredBlueprint: BlueprintId.ReactiveSurface,
	},
	{
		id: WorkshopUpgradeId.CoinBonus,
		name: 'Alloy Boost',
		description: '+1% global Alloy income per level.',
		icon: '🪙',
		maxLevel: 1000,
		costType: 'polynomial',
		baseCost: 50,
		costParam1: 1.7,
		effectPerLevel: 0.01,
		targetStat: 'coinBonus',
		requiredBlueprint: BlueprintId.AlloyExtraction,
	},
	{
		id: WorkshopUpgradeId.EnergyBonus,
		name: 'Energy Bonus',
		description: '+1% energy income per level. 1000 levels for 10× energy.',
		icon: '⚡',
		maxLevel: 1000,
		costType: 'polynomial',
		baseCost: 35,
		costParam1: 1.65,
		effectPerLevel: 0.01,
		targetStat: 'cashBonus',
		requiredBlueprint: BlueprintId.EnergyCondenser,
	},
	{
		id: WorkshopUpgradeId.CritBonus,
		name: 'Crit Bonus',
		description: '+0.5% base crit chance per level.',
		icon: '⭐',
		maxLevel: 49,
		costType: 'hybrid',
		baseCost: 50,
		costParam1: 1.24,
		costParam2: 0.55,
		effectPerLevel: 0.005,
		targetStat: 'critChance',
		requiredBlueprint: BlueprintId.CriticalTargeting,
	},
	{
		id: WorkshopUpgradeId.StartingEnergy,
		name: 'Starting Energy',
		description: '+4 starting energy per level.',
		icon: '⚡',
		maxLevel: 99,
		costType: 'hybrid',
		baseCost: 25,
		costParam1: 1.22,
		costParam2: 0.50,
		effectPerLevel: 4,
		targetStat: 'startingCash',
		requiredBlueprint: BlueprintId.DeploymentReserves,
	},
];

/**
 * Economy-only Forge upgrades that have NO Field equivalent — they stay
 * permanent-only in the Foundry. Combat Forge stats moved to forgeUpgrades.ts
 * (the shared Field curve) in v15; their old WorkshopUpgradeId entries are
 * stripped on migration. Everything not in this set is a legacy combat entry.
 */
export const FORGE_ECONOMY_WORKSHOP_IDS: WorkshopUpgradeId[] = [
	WorkshopUpgradeId.CoinBonus,
	WorkshopUpgradeId.EnergyBonus,
	WorkshopUpgradeId.StartingEnergy,
];

const defMap = new Map<WorkshopUpgradeId, WorkshopUpgradeDef>();
for (const def of WORKSHOP_UPGRADE_DEFS) {
	defMap.set(def.id, def);
}

export function getWorkshopUpgradeDef(id: WorkshopUpgradeId): WorkshopUpgradeDef | undefined {
	return defMap.get(id);
}

export function getWorkshopUpgradeCost(id: WorkshopUpgradeId, level: number): number {
	const def = defMap.get(id);
	if (!def) return Infinity;
	if (def.costType === 'polynomial') {
		return polynomialCost(def.baseCost, def.costParam1, level);
	}
	return hybridCost(def.baseCost, def.costParam1, def.costParam2 ?? 0.50, level);
}

export function getWorkshopUpgradeEffect(id: WorkshopUpgradeId, level: number): number {
	const def = defMap.get(id);
	if (!def) return 0;
	return additiveEffect(def.effectPerLevel, level, def.effectCap);
}

export function buildWorkshopUpgradeList(): Array<{
	id: WorkshopUpgradeId;
	name: string;
	description: string;
	level: number;
	maxLevel: number;
	cost: (level: number) => number;
	icon: string;
	requiredBlueprint?: BlueprintId;
}> {
	return WORKSHOP_UPGRADE_DEFS.map(def => ({
		id: def.id,
		name: def.name,
		description: def.description,
		level: 0,
		maxLevel: def.maxLevel,
		cost: (level: number) => getWorkshopUpgradeCost(def.id, level),
		icon: def.icon,
		requiredBlueprint: def.requiredBlueprint,
	}));
}
