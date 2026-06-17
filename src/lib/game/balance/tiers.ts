/**
 * tiers.ts — Front (Tier) definitions.
 *
 * Each front is ~10× harder than the one before and pays a higher permanent
 * Alloy multiplier (1.0× / 1.2× / 1.4× / 1.6× / 1.8×). Fronts unlock
 * SEQUENTIALLY: reach wave FRONT_UNLOCK_WAVE (100) on a front to open the next.
 * Reaching ~wave 1000 on a front is roughly equivalent to ~wave 100 on the next.
 *
 * Core loop: farm an easier front for Alloy, push the wave-100 gate on your
 * current front, then graduate to the harder, better-paying front.
 */

import { TierId, type TierDef } from '../engine/gameTypes';

/** Stable front ordering — also the numeric `tier` passed to the balance math. */
export const FRONT_ORDER: TierId[] = [TierId.Tier1, TierId.Tier2, TierId.Tier3, TierId.Tier4, TierId.Tier5];

/** Short display name for a front, e.g. "Tier 2". */
export function getFrontName(id: TierId): string {
	return `Tier ${getTierNumber(id)}`;
}

/** Numeric tier (1–5) for a TierId — feeds getTierMultiplier / createEnemy. */
export function getTierNumber(id: TierId): number {
	const idx = FRONT_ORDER.indexOf(id);
	return idx < 0 ? 1 : idx + 1;
}

export function getTierDef(id: TierId): TierDef | undefined {
	return TIERS.find(t => t.id === id);
}

/** Wave that must be reached on a front to unlock the NEXT one. */
export const FRONT_UNLOCK_WAVE = 100;

/** The front immediately before `id`, or null for Front 1. */
export function getPreviousFront(id: TierId): TierId | null {
	const idx = FRONT_ORDER.indexOf(id);
	return idx > 0 ? FRONT_ORDER[idx - 1]! : null;
}

type FrontBestWave = Partial<Record<TierId, number>>;

/**
 * Fronts unlock SEQUENTIALLY: Front 1 is always open; every later front
 * requires reaching FRONT_UNLOCK_WAVE on the front directly before it.
 */
export function isFrontUnlocked(id: TierId, frontBestWave: FrontBestWave): boolean {
	const prev = getPreviousFront(id);
	if (prev === null) return true; // Front 1
	return (frontBestWave[prev] ?? 0) >= FRONT_UNLOCK_WAVE;
}

/** All fronts currently unlocked given per-front best waves. */
export function getUnlockedFronts(frontBestWave: FrontBestWave): TierId[] {
	const unlocked: TierId[] = [];
	for (const id of FRONT_ORDER) {
		if (isFrontUnlocked(id, frontBestWave)) unlocked.push(id);
		else break; // sequential — stop at the first locked front
	}
	return unlocked;
}

export const TIERS: TierDef[] = [
	{
		id: TierId.Tier1,
		name: 'Tier 1: The Awakening',
		description: 'Baseline difficulty, ×1.0 Alloy. Learn the basics, farm Alloy, build your Forge. Reach Wave 100 here to open Tier 2.',
		waveRequirement: 0,
		unlocked: true,
		rewards: ['×1.0 Alloy', 'Permanent Forge', 'Wave Milestones'],
	},
	{
		id: TierId.Tier2,
		name: 'Tier 2: Neon Storm',
		description: '~10× harder, ×1.2 Alloy. The first real difficulty jump. Reach Wave 100 here to open Tier 3.',
		waveRequirement: 100,
		unlocked: false,
		rewards: ['×1.2 Alloy', '~10× difficulty', 'Tier 2 Milestones'],
	},
	{
		id: TierId.Tier3,
		name: 'Tier 3: Digital Onslaught',
		description: '~100× harder than Tier 1, ×1.4 Alloy. Requires significant Forge investment.',
		waveRequirement: 100,
		unlocked: false,
		rewards: ['×1.4 Alloy', '~100× difficulty', 'Tier 3 Milestones'],
	},
	{
		id: TierId.Tier4,
		name: 'Tier 4: Quantum Surge',
		description: '~1000× harder than Tier 1, ×1.6 Alloy. Deep progression territory.',
		waveRequirement: 100,
		unlocked: false,
		rewards: ['×1.6 Alloy', '~1000× difficulty', 'Tier 4 Milestones'],
	},
	{
		id: TierId.Tier5,
		name: 'Tier 5: Geo Ascension',
		description: '~10000× harder than Tier 1, ×1.8 Alloy. Endgame aspirational front.',
		waveRequirement: 100,
		unlocked: false,
		rewards: ['×1.8 Alloy', '~10000× difficulty', 'Ascension'],
	},
];
