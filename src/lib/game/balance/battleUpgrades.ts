import type { UpgradeCategory, BlueprintId } from '../engine/gameTypes';
import { UpgradeId, BlueprintId as BP } from '../engine/gameTypes';
import { hybridCost, additiveEffect, roundedCost, formatBattleEffect as fmtEffect } from './upgradeScaling';
import { flatlandBaseDamageAtLevel } from './balanceMath';

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
	requiredBlueprint?: BlueprintId;
}

export const BATTLE_UPGRADE_DEFS: BattleUpgradeDef[] = [
	{
		id: UpgradeId.Damage,
		name: 'Damage',
		description: 'Increases player base Damage following a smooth progression curve.',
		icon: '⚡',
		category: 'offense',
		maxLevel: 999,
		baseCost: 13,
		costGrowth: 1.20,
		costExponent: 0,
		effectPerLevel: 25,
	},
	{
		id: UpgradeId.FireRate,
		name: 'Attack Speed',
		description: '+0.1 attacks per second per level.',
		icon: '🔥',
		category: 'offense',
		maxLevel: 399,
		baseCost: 20,
		costGrowth: 1.20,
		costExponent: 0,
		effectPerLevel: 0.1,
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
		maxLevel: 84,
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
		description: '+1% crit chance per level. Combined crit chance caps at 75%.',
		icon: '⭐',
		category: 'offense',
		maxLevel: 75,
		baseCost: 5,
		costGrowth: 1.20,
		costExponent: 0,
		effectPerLevel: 0.01,
		effectCap: 0.75,
	},
	{
		id: UpgradeId.CritMultiplier,
		name: 'Crit Multiplier',
		description: '+0.10x crit damage per level.',
		icon: '✨',
		category: 'offense',
		maxLevel: 49,
		baseCost: 13,
		costGrowth: 1.20,
		costExponent: 0,
		effectPerLevel: 0.10,
	},
	{
		id: UpgradeId.MaxHp,
		name: 'Max HP',
		description: '+100 max HP per level. Doubles base HP on first purchase.',
		icon: '❤️',
		category: 'defense',
		maxLevel: 399,
		baseCost: 13,
		costGrowth: 1.20,
		costExponent: 0,
		effectPerLevel: 100,
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
		maxLevel: 50,
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
		description: '+0.50 HP/sec per level. First level enables regen from zero.',
		icon: '💚',
		category: 'defense',
		maxLevel: 20,
		baseCost: 7,
		costGrowth: 1.20,
		costExponent: 0,
		effectPerLevel: 0.50,
		effectCap: 10.0,
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
		baseCost: 30,
		costGrowth: 1.22,
		costExponent: 0,
		effectPerLevel: 1,
		requiredBlueprint: BP.AlloyExtraction,
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
	if (def.costExponent === 0) {
		return roundedCost(def.baseCost, def.costGrowth, level);
	}
	return hybridCost(def.baseCost, def.costGrowth, def.costExponent, level);
}

export function getBattleUpgradeEffect(id: UpgradeId, level: number): number {
	if (id === UpgradeId.Damage) {
		return flatlandBaseDamageAtLevel(level);
	}
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
