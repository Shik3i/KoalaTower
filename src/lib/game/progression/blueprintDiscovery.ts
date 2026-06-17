/**
 * blueprintDiscovery.ts — The RNG "find a blueprint" step.
 *
 * Rolled once at the end of each deployment. A blueprint can drop only when:
 *   1. the deployment was on one of the blueprint's discovery fronts, AND
 *   2. the player's progress satisfies the blueprint's requirement, AND
 *   3. it isn't already discovered or owned.
 * Each eligible blueprint then rolls its individual drop chance.
 *
 * Pure and deterministic given `rng` — trivially unit-testable.
 */

import type { BlueprintId, TierId } from '../engine/gameTypes';
import { BLUEPRINT_DEFS } from '../balance/blueprints';
import { meetsRequirement, type ProgressSnapshot } from './requirements';

export interface DiscoveryContext {
	/** Front the just-finished deployment was on. */
	front: TierId;
	/** Lifetime progress (after this run's results have been folded in). */
	progress: ProgressSnapshot;
	/** Blueprints already found (not yet bought). */
	discovered: readonly BlueprintId[];
	/** Blueprints already owned (bought). */
	owned: readonly BlueprintId[];
	/** Random source in [0,1). Defaults to Math.random. */
	rng?: () => number;
}

/**
 * Returns the blueprint ids newly discovered by this deployment (possibly empty).
 * Caller is responsible for persisting them and notifying the player.
 */
export function rollBlueprintDiscovery(ctx: DiscoveryContext): BlueprintId[] {
	const rng = ctx.rng ?? Math.random;
	const found: BlueprintId[] = [];
	for (const bp of BLUEPRINT_DEFS) {
		if (ctx.owned.includes(bp.id) || ctx.discovered.includes(bp.id)) continue;
		if (!bp.discovery.fronts.includes(ctx.front)) continue;
		if (!meetsRequirement(bp.requirement, ctx.progress)) continue;
		if (rng() < bp.discovery.chance) found.push(bp.id);
	}
	return found;
}

/** Lifecycle status of a blueprint, for UI rendering. */
export type BlueprintStatus = 'owned' | 'discovered' | 'undiscovered';

export function getBlueprintStatus(
	id: BlueprintId,
	owned: readonly BlueprintId[],
	discovered: readonly BlueprintId[],
): BlueprintStatus {
	if (owned.includes(id)) return 'owned';
	if (discovered.includes(id)) return 'discovered';
	return 'undiscovered';
}
