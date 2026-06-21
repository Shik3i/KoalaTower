/**
 * requirements.ts — Declarative unlock requirements.
 *
 * A single data shape describes "what must be true" for something to become
 * available, plus ONE evaluator and ONE describer. This replaces hand-written
 * per-id switch statements so that adding a new gated thing (upgrade path,
 * front, achievement...) is a pure data edit — the logic and the
 * human-readable text are derived from the same source and can never drift
 * apart.
 */

import type { BlueprintId, TierId } from '../engine/gameTypes';

/**
 * Conditions for availability. All present scalar fields must be satisfied
 * (logical AND). `anyOf` adds a logical-OR group: at least one of its
 * sub-requirements must also pass. Any field omitted = ignored.
 */
export interface Requirement {
	/** Lifetime best wave the player must have reached. */
	minWave?: number;
	/** Lifetime bosses the player must have defeated. */
	minBosses?: number;
	/** Another Schematic-reconstructed path that must already be owned. */
	requiresBlueprint?: BlueprintId;
	/** Front (tier) that must be unlocked. */
	requiresFront?: TierId;
	/** Logical-OR group — at least one sub-requirement must pass. */
	anyOf?: Requirement[];
}

/** The player-progress facts a Requirement is evaluated against. */
export interface ProgressSnapshot {
	highestWave: number;
	bossesDefeated: number;
	ownedBlueprints: readonly BlueprintId[];
	unlockedFronts: readonly TierId[];
}

/** True when every present condition of `req` is satisfied by `progress`. */
export function meetsRequirement(req: Requirement, progress: ProgressSnapshot): boolean {
	if (req.minWave !== undefined && progress.highestWave < req.minWave) return false;
	if (req.minBosses !== undefined && progress.bossesDefeated < req.minBosses) return false;
	if (req.requiresBlueprint !== undefined && !progress.ownedBlueprints.includes(req.requiresBlueprint)) return false;
	if (req.requiresFront !== undefined && !progress.unlockedFronts.includes(req.requiresFront)) return false;
	if (req.anyOf && req.anyOf.length > 0 && !req.anyOf.some(sub => meetsRequirement(sub, progress))) return false;
	return true;
}

/**
 * Human-readable summary of a requirement (e.g. "Reach Wave 25 · Defeat 2 Bosses").
 * `blueprintName` resolves a legacy prerequisite path id to a display name.
 */
export function describeRequirement(
	req: Requirement,
	blueprintName?: (id: BlueprintId) => string,
): string {
	const parts: string[] = [];
	if (req.minWave !== undefined) parts.push(`Reach Wave ${req.minWave}`);
	if (req.minBosses !== undefined) parts.push(`Defeat ${req.minBosses} Boss${req.minBosses === 1 ? '' : 'es'}`);
	if (req.requiresBlueprint !== undefined) {
		parts.push(`Reconstruct ${blueprintName ? blueprintName(req.requiresBlueprint) : req.requiresBlueprint}`);
	}
	if (req.anyOf && req.anyOf.length > 0) {
		parts.push(req.anyOf.map(sub => describeRequirement(sub, blueprintName)).join(' or '));
	}
	return parts.length ? parts.join(' · ') : 'Always available';
}
