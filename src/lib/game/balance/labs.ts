/**
 * labs.ts — Time-based Research Deck system.
 *
 * Labs are permanent account-wide multipliers that require Alloy + real time.
 * Each lab level takes time to research. Research continues offline via
 * timestamps. Early levels are short (seconds), later levels get longer.
 *
 * DESIGN:
 * - Labs use Alloy (permanent currency) plus real time.
 * - One active research slot (at least).
 * - Research progress saved with startedAt/finishesAt timestamps.
 * - Offline completion works via Date.now().
 * - Early levels: 30s - 5min for alpha testing.
 * - Later levels: hours/days.
 * - Starter labs locked behind milestones/blueprints.
 */

import { LabId } from '../engine/gameTypes';
import { hybridCost, formatCompact } from './balanceMath';

export interface LabDef {
	id: LabId;
	name: string;
	description: string;
	icon: string;
	maxLevel: number;
	baseCost: number;
	costGrowth: number;
	costExponent: number;
	/** Multiplicative effect per level: 0.02 = +2% */
	effectPerLevel: number;
	/** Wave at which this lab unlocks for research (0 = always) */
	unlockWave: number;
	/** Base duration in ms for level 1 */
	baseDurationMs: number;
	/** Duration multiplier per level (e.g. 1.5 = 50% longer each level) */
	durationGrowth: number;
}

export const LAB_DEFS: LabDef[] = [
	{
		id: LabId.DamageResearch,
		name: 'Damage Research',
		description: '+5% damage per level. Multiplies all damage sources. Primary long-term scaling.',
		icon: '🔬',
		maxLevel: 199,
		baseCost: 200,
		costGrowth: 1.30,
		costExponent: 0.45,
		effectPerLevel: 0.05,
		unlockWave: 25,
		baseDurationMs: 30_000,
		durationGrowth: 1.6,
	},
	{
		id: LabId.AttackSpeedResearch,
		name: 'Attack Speed Research',
		description: '+3% fire rate per level. Multiplies attack speed.',
		icon: '⚡',
		maxLevel: 149,
		baseCost: 200,
		costGrowth: 1.32,
		costExponent: 0.48,
		effectPerLevel: 0.03,
		unlockWave: 50,
		baseDurationMs: 45_000,
		durationGrowth: 1.6,
	},
	{
		id: LabId.HealthResearch,
		name: 'Health Research',
		description: '+5% max HP per level. Multiplies all HP sources.',
		icon: '❤️',
		maxLevel: 199,
		baseCost: 200,
		costGrowth: 1.30,
		costExponent: 0.45,
		effectPerLevel: 0.05,
		unlockWave: 25,
		baseDurationMs: 30_000,
		durationGrowth: 1.6,
	},
	{
		id: LabId.AlloyEfficiency,
		name: 'Alloy Research',
		description: '+3% alloy gain per level. More alloy from all sources.',
		icon: '🔩',
		maxLevel: 199,
		baseCost: 200,
		costGrowth: 1.30,
		costExponent: 0.45,
		effectPerLevel: 0.03,
		unlockWave: 50,
		baseDurationMs: 45_000,
		durationGrowth: 1.6,
	},
	{
		id: LabId.EnergyEfficiency,
		name: 'Energy Research',
		description: '+3% energy gain per level. More energy from kills and waves.',
		icon: '⚡',
		maxLevel: 199,
		baseCost: 200,
		costGrowth: 1.30,
		costExponent: 0.45,
		effectPerLevel: 0.03,
		unlockWave: 50,
		baseDurationMs: 45_000,
		durationGrowth: 1.6,
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

/**
 * Returns the duration in ms for researching the given lab level.
 * Level is clamped to [0, maxLevel] so hand-edited saves never produce Infinity.
 */
export function getLabDuration(id: LabId, level: number): number {
	const def = defMap.get(id);
	if (!def) return Infinity;
	const safeLevel = Number.isFinite(level) && level >= 0 ? Math.min(Math.floor(level), def.maxLevel) : 0;
	const raw = def.baseDurationMs * Math.pow(def.durationGrowth, safeLevel);
	return Number.isFinite(raw) ? Math.floor(raw) : def.baseDurationMs * Math.pow(def.durationGrowth, def.maxLevel);
}

/** Level is clamped to [0, maxLevel] so hand-edited saves cannot produce uncapped multipliers. */
export function getLabEffect(id: LabId, level: number): number {
	const def = defMap.get(id);
	if (!def) return 0;
	const safeLevel = Number.isFinite(level) && level >= 0 ? Math.min(Math.floor(level), def.maxLevel) : 0;
	return safeLevel * def.effectPerLevel;
}

export interface LabMultipliers {
	dmg: number;
	fireRate: number;
	hp: number;
	alloy: number;
	energy: number;
}

export function getLabMultiplier(labLevels: Partial<Record<LabId, number>>): LabMultipliers {
	const lab = labLevels;
	return {
		dmg: 1 + getLabEffect(LabId.DamageResearch, lab[LabId.DamageResearch] ?? 0),
		fireRate: 1 + getLabEffect(LabId.AttackSpeedResearch, lab[LabId.AttackSpeedResearch] ?? 0),
		hp: 1 + getLabEffect(LabId.HealthResearch, lab[LabId.HealthResearch] ?? 0),
		alloy: 1 + getLabEffect(LabId.AlloyEfficiency, lab[LabId.AlloyEfficiency] ?? 0),
		energy: 1 + getLabEffect(LabId.EnergyEfficiency, lab[LabId.EnergyEfficiency] ?? 0),
	};
}

/**
 * Returns formatted duration string (e.g. "30s", "2m 15s", "1h 30m").
 */
export function formatLabDuration(ms: number): string {
	if (ms <= 0) return '0s';
	const sec = Math.floor(ms / 1000);
	if (sec < 60) return sec + 's';
	const min = Math.floor(sec / 60);
	const remSec = sec % 60;
	if (min < 60) return remSec > 0 ? min + 'm ' + remSec + 's' : min + 'm';
	const hr = Math.floor(min / 60);
	const remMin = min % 60;
	return remMin > 0 ? hr + 'h ' + remMin + 'm' : hr + 'h';
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

export function getLabItemDuration(id: LabId, level: number): number {
	return getLabDuration(id, level);
}

export function getLabItemEffect(id: LabId, level: number): number {
	return getLabEffect(id, level);
}
