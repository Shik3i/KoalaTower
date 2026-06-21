/**
 * schematics.ts — Schematics: the per-Front material used to reconstruct
 * upgrade paths.
 *
 * Schematics are a FUNGIBLE currency, collected per Front (Front 1 Schematics,
 * Front 2 Schematics, …). They are NOT cards and there is no gacha — a Front's
 * Schematics are just a number. You spend a Front's Schematics to permanently
 * unlock (reconstruct) an upgrade path; the path then stays owned forever.
 *
 * Sources (Part 5):
 *   • Boss kills        → chance-based, REPEATABLE Schematics for that Front.
 *   • Wave milestones   → larger, ONE-TIME Schematic bonuses per Front.
 *
 * Internal note: the unlockable "paths" reuse the existing BlueprintId ids so
 * that already-owned paths from old saves stay owned. "Blueprint" is the legacy
 * internal name; everything user-facing now says "Schematics".
 */

import { BlueprintId } from '../engine/gameTypes';
import { FRONT_COUNT } from './tiers';

export type SchematicsByFront = Record<number, number>;

/** Dry, slightly-suspicious flavor for the Schematics concept. */
export const SCHEMATICS_FLAVOR =
	'Recovered Schematics are incomplete battlefield design fragments. One fragment ' +
	'is useless. Ten are suspicious. A hundred becomes engineering. Most arrive ' +
	'burned, corrupted, or written by someone who had already died — the Research ' +
	'Deck requires several copies before it is willing to call the result “safe.”';

// ─── Balance helpers ─────────────────────────────────────────────────────────

/** A fresh Schematics ledger with every Front (1–FRONT_COUNT) initialized to 0. */
export function emptySchematics(): SchematicsByFront {
	const map: SchematicsByFront = {};
	for (let front = 1; front <= FRONT_COUNT; front++) map[front] = 0;
	return map;
}

/** Backfill any missing Front keys with 0 without dropping existing values. */
export function normalizeSchematics(raw: unknown): SchematicsByFront {
	const out = emptySchematics();
	if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
		for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
			const front = Number(k);
			const val = Number(v);
			if (Number.isInteger(front) && front >= 1 && front <= FRONT_COUNT && Number.isFinite(val)) {
				out[front] = Math.max(0, Math.floor(val));
			}
		}
	}
	return out;
}

export function getSchematics(map: SchematicsByFront, front: number): number {
	return Math.max(0, Math.floor(map[front] ?? 0));
}

/** Add `amount` (clamped ≥ 0) Schematics to a Front. Returns the new total. */
export function addSchematics(map: SchematicsByFront, front: number, amount: number): number {
	if (front < 1 || front > FRONT_COUNT) return getSchematics(map, front);
	const add = Math.max(0, Math.floor(amount));
	map[front] = getSchematics(map, front) + add;
	return map[front];
}

export function canAfford(map: SchematicsByFront, front: number, cost: number): boolean {
	return cost > 0 && getSchematics(map, front) >= cost;
}

/**
 * Spend `cost` Schematics from a Front. Returns true on success. Refuses to
 * spend negative/zero amounts or to overdraw (no negative balances ever).
 */
export function spendSchematics(map: SchematicsByFront, front: number, cost: number): boolean {
	if (!Number.isFinite(cost) || cost <= 0) return false;
	if (!canAfford(map, front, cost)) return false;
	map[front] = getSchematics(map, front) - Math.floor(cost);
	return true;
}

// ─── Source 1: repeatable boss-kill rewards ──────────────────────────────────

/**
 * Schematic bundle size granted when a boss drops Schematics (REPEATABLE).
 * Front 1 → 1; rises slowly so higher Fronts pay a little more (1–3 range).
 */
export function getBossSchematicReward(front: number): number {
	return Math.min(3, 1 + Math.floor((front - 1) / 6));
}

/**
 * Chance that a killed boss drops its Front's Schematic bundle.
 * Early bosses are occasional finds; deep bosses become reliable salvage.
 */
export function getBossSchematicDropChance(bossWave: number): number {
	const safeWave = Math.max(10, Math.floor(bossWave));
	return Math.min(1, 0.2 + 0.8 * Math.sqrt(safeWave / 1000));
}

export function rollBossSchematicReward(front: number, bossWave: number, rng: () => number = Math.random): number {
	return rng() < getBossSchematicDropChance(bossWave) ? getBossSchematicReward(front) : 0;
}

// ─── Source 2: one-time wave milestones ──────────────────────────────────────

export interface SchematicMilestone {
	wave: number;
	amount: number;
}

/** Per-Front first-time wave milestones (claimed once per Front, ever). */
export const SCHEMATIC_MILESTONES: SchematicMilestone[] = [
	{ wave: 50, amount: 5 },
	{ wave: 100, amount: 10 },
	{ wave: 200, amount: 20 },
	{ wave: 300, amount: 30 },
	{ wave: 400, amount: 40 },
];

/** Stable claim key, e.g. "3:100" = Front 3, Wave-100 milestone. */
export function schematicMilestoneKey(front: number, wave: number): string {
	return `${front}:${wave}`;
}

export interface SchematicMilestoneAward {
	key: string;
	front: number;
	wave: number;
	amount: number;
}

/**
 * Milestones newly satisfied on a Front given its best wave and the set of
 * already-claimed keys. Pure — caller persists keys and adds Schematics.
 */
export function pendingMilestoneSchematics(
	front: number,
	bestWaveOnFront: number,
	claimed: readonly string[],
): SchematicMilestoneAward[] {
	const claimedSet = new Set(claimed);
	const out: SchematicMilestoneAward[] = [];
	for (const m of SCHEMATIC_MILESTONES) {
		if (bestWaveOnFront < m.wave) continue;
		const key = schematicMilestoneKey(front, m.wave);
		if (claimedSet.has(key)) continue;
		out.push({ key, front, wave: m.wave, amount: m.amount });
	}
	return out;
}

// ─── Spending: upgrade-path unlock costs ─────────────────────────────────────

export type UnlockTier = 'small' | 'medium' | 'strong';

export interface SchematicUnlockCost {
	/** Which Front's Schematics pay for this path. */
	front: number;
	/** Schematic cost. */
	cost: number;
	/** Coarse strength label for UI grouping / future tuning. */
	tier: UnlockTier;
}

/**
 * Schematic cost per upgrade path (keyed by the legacy BlueprintId). Front 1
 * paths cost Front 1 Schematics; deeper paths cost deeper Fronts' Schematics.
 *
 * Cost bands (Part 4): small 5 · medium 8–12 · strong 15–25.
 *
 * Future categories (Armor at Front 5+, Resistance at Front 9+, Anomaly at
 * Front 13+) are SCAFFOLDED here as data only — paths whose mechanics do not
 * yet exist are simply not present, and are added when the mechanic ships.
 */
export const SCHEMATIC_UNLOCK_COST: Partial<Record<BlueprintId, SchematicUnlockCost>> = {
	// ── Front 1 (Perimeter) — onboarding paths ──
	[BlueprintId.ExtendedCoreOptics]: { front: 1, cost: 8, tier: 'medium' },   // Range / Extended Optics
	[BlueprintId.CriticalTargeting]:  { front: 1, cost: 10, tier: 'medium' },
	[BlueprintId.AlloyExtraction]:    { front: 1, cost: 5, tier: 'small' },
	[BlueprintId.PlatedCoreShell]:    { front: 1, cost: 8, tier: 'medium' },
	[BlueprintId.SplitBeamGeometry]:  { front: 1, cost: 15, tier: 'strong' },  // Multishot
	[BlueprintId.EnergyCondenser]:    { front: 1, cost: 10, tier: 'medium' },
	// ── Front 2 (Perimeter ★) — advanced versions / extra paths ──
	[BlueprintId.PhaseDampener]:      { front: 2, cost: 12, tier: 'medium' },
	[BlueprintId.DeploymentReserves]: { front: 2, cost: 12, tier: 'medium' },
	[BlueprintId.ReactiveSurface]:    { front: 2, cost: 18, tier: 'strong' },
	// ── Front 3 (Perimeter ★★) — stronger paths ──
	[BlueprintId.EnergyReclaimer]:    { front: 3, cost: 20, tier: 'strong' },
};

export function getPathSchematicCost(id: BlueprintId): SchematicUnlockCost | undefined {
	return SCHEMATIC_UNLOCK_COST[id];
}

/**
 * Attempt to reconstruct (unlock) a path by spending its Front's Schematics.
 * Returns true and mutates `map` on success. Already-owned or unknown paths,
 * and insufficient balances, fail without spending.
 */
export function tryUnlockPathWithSchematics(
	map: SchematicsByFront,
	owned: readonly BlueprintId[],
	id: BlueprintId,
): boolean {
	if (owned.includes(id)) return false;
	const cost = getPathSchematicCost(id);
	if (!cost) return false;
	return spendSchematics(map, cost.front, cost.cost);
}
