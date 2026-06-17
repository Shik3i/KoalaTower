/**
 * labs.ts — Real Lab system for long-term multiplicative progression.
 *
 * Labs are permanent account-wide multipliers purchased with Coins.
 * They provide the second layer of progression (after Workshop) and
 * are the primary driver of long-term wave depth.
 *
 * EFFECT MODEL:
 * Each lab level adds a multiplicative bonus to its stat:
 *   effectiveStat = baseStat × (1 + labLevel × effectPerLevel)
 *
 * At level 100, Damage Lab (3%/level) gives 4× damage multiplier.
 * Combined with Workshop base, this enables deep wave progression.
 *
 * LAB LIST:
 * 1. Damage Research      — +3% damage per level (cap 199)
 * 2. Attack Speed Research — +2% fire rate per level (cap 149)
 * 3. Health Research       — +3% max HP per level (cap 199)
 * 4. Coin Research         — +3% coin gain per level (cap 199)
 * 5. Cash Research         — +3% cash gain per level (cap 199)
 *
 * FUTURE: Timed research (progress continues offline) can be added
 * without changing the effect formulas.
 */

import { LabId, type GameState } from '../engine/gameTypes';
import { hybridCost, additiveEffect, formatCompact } from './balanceMath';

export interface LabDef {
	id: LabId;
	name: string;
	description: string;
	icon: string;
	maxLevel: number;
	baseCost: number;
	costGrowth: number;
	costExponent: number;
	/** Multiplicative effect per level: 0.03 = +3% */
	effectPerLevel: number;
	/** Wave at which this lab unlocks (0 = always available) */
	unlockWave: number;
}

export const LAB_DEFS: LabDef[] = [
	{
		id: LabId.DamageResearch,
		name: 'Damage Research',
		description: '+2% damage per level. Multiplies all damage sources.',
		icon: '🔬',
		maxLevel: 199,
		baseCost: 200,
		costGrowth: 1.30,
		costExponent: 0.45,
		effectPerLevel: 0.02,
		unlockWave: 25,
	},
	{
		id: LabId.AttackSpeedResearch,
		name: 'Attack Speed Research',
		description: '+1.5% fire rate per level. Multiplies attack speed.',
		icon: '⚡',
		maxLevel: 149,
		baseCost: 200,
		costGrowth: 1.32,
		costExponent: 0.48,
		effectPerLevel: 0.015,
		unlockWave: 50,
	},
	{
		id: LabId.HealthResearch,
		name: 'Health Research',
		description: '+2% max HP per level. Multiplies all HP sources.',
		icon: '❤️',
		maxLevel: 199,
		baseCost: 200,
		costGrowth: 1.30,
		costExponent: 0.45,
		effectPerLevel: 0.02,
		unlockWave: 25,
	},
	{
		id: LabId.CoinEfficiency,
		name: 'Alloy Research',
		description: '+2% alloy gain per level. More alloy from all sources.',
		icon: '🔩',
		maxLevel: 199,
		baseCost: 200,
		costGrowth: 1.30,
		costExponent: 0.45,
		effectPerLevel: 0.02,
		unlockWave: 50,
	},
	{
		id: LabId.CashEfficiency,
		name: 'Energy Research',
		description: '+2% energy gain per level. More energy from kills and waves.',
		icon: '⚡',
		maxLevel: 199,
		baseCost: 200,
		costGrowth: 1.30,
		costExponent: 0.45,
		effectPerLevel: 0.02,
		unlockWave: 50,
	},
];

const defMap = new Map<LabId, LabDef>();
for (const def of LAB_DEFS) {
	defMap.set(def.id, def);
}

export function getLabDef(id: LabId): LabDef | undefined {
	return defMap.get(id);
}

export function isLabUnlocked(def: LabDef, highestWave: number): boolean {
	return def.unlockWave <= 0 || highestWave >= def.unlockWave;
}

export function getLabCost(id: LabId, level: number): number {
	const def = defMap.get(id);
	if (!def) return Infinity;
	return hybridCost(def.baseCost, def.costGrowth, def.costExponent, level);
}

export function getLabEffect(id: LabId, level: number): number {
	const def = defMap.get(id);
	if (!def) return 0;
	return level * def.effectPerLevel;
}

export function getLabMultiplier(state: GameState): {
	dmg: number;
	fireRate: number;
	hp: number;
	coin: number;
	cash: number;
} {
	const lab = state.labLevels;
	return {
		dmg: 1 + getLabEffect(LabId.DamageResearch, lab[LabId.DamageResearch] ?? 0),
		fireRate: 1 + getLabEffect(LabId.AttackSpeedResearch, lab[LabId.AttackSpeedResearch] ?? 0),
		hp: 1 + getLabEffect(LabId.HealthResearch, lab[LabId.HealthResearch] ?? 0),
		coin: 1 + getLabEffect(LabId.CoinEfficiency, lab[LabId.CoinEfficiency] ?? 0),
		cash: 1 + getLabEffect(LabId.CashEfficiency, lab[LabId.CashEfficiency] ?? 0),
	};
}

// Legacy exports for backward compatibility
export const LAB_ITEMS = LAB_DEFS.map(def => ({
	id: def.id,
	name: def.name,
	description: def.description,
	level: 0,
	maxLevel: def.maxLevel,
	cost: (level: number) => getLabCost(def.id, level),
	icon: def.icon,
}));

export function getLabItemCost(id: LabId, level: number): number {
	return getLabCost(id, level);
}

export function getLabItemDuration(_id: LabId, _level: number): number {
	return 0; // No timers for MVP — instant purchase
}

export function getLabItemEffect(id: LabId, level: number): number {
	return getLabEffect(id, level);
}
