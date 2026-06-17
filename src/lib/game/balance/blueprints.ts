/**
 * blueprints.ts — Blueprint unlock system for progression gating.
 *
 * Blueprints are permanently unlocked schematics that gate access to
 * upgrade paths in Field Upgrades (battle) and Foundry (workshop).
 * Each blueprint is discovered by reaching milestones and purchased
 * with Alloy. Once unlocked, all related upgrades become available.
 *
 * DESIGN:
 * - Starter upgrades (Damage, Attack Speed, Max HP, Regen, Alloy/Wave, Energy/Wave)
 *   have no blueprint requirement.
 * - All advanced upgrades require a specific blueprint.
 * - Blueprints unlock both Field Upgrade and Foundry upgrade paths.
 * - Blueprint unlocks are saved permanently.
 */

import { BlueprintId, UpgradeId, WorkshopUpgradeId } from '../engine/gameTypes';
import type { BlueprintCategory } from '../engine/gameTypes';

export interface BlueprintDef {
	id: BlueprintId;
	name: string;
	description: string;
	icon: string;
	category: BlueprintCategory;
	/** Human-readable unlock condition text */
	unlockCondition: string;
	/** Alloy cost to purchase */
	cost: number;
	/** Display order (lower = first) */
	order: number;
	/** Battle upgrade IDs this blueprint unlocks */
	unlocksFieldUpgrades: UpgradeId[];
	/** Workshop upgrade IDs this blueprint unlocks */
	unlocksFoundryUpgrades: WorkshopUpgradeId[];
	/** Whether this blueprint also unlocks lab research */
	unlocksLabIds?: string[];
}

/**
 * Returns true if the wave/boss condition is met.
 * Called with current highestWave for permanent unlock eligibility.
 */
export function isBlueprintUnlockable(bp: BlueprintDef, highestWave: number, bossesDefeated: number): boolean {
	switch (bp.id) {
		case BlueprintId.CriticalTargeting:
			return highestWave >= 25 || bossesDefeated >= 2;
		case BlueprintId.SplitBeamGeometry:
			return highestWave >= 50;
		case BlueprintId.ExtendedCoreOptics:
			return highestWave >= 25;
		case BlueprintId.PlatedCoreShell:
			return highestWave >= 20;
		case BlueprintId.PhaseDampener:
			return highestWave >= 50;
		case BlueprintId.ReactiveSurface:
			return bossesDefeated >= 5 || highestWave >= 75;
		case BlueprintId.EnergyReclaimer:
			return highestWave >= 100;
		case BlueprintId.AlloyExtraction:
			return highestWave >= 25;
		case BlueprintId.EnergyCondenser:
			return highestWave >= 50;
		case BlueprintId.DeploymentReserves:
			return highestWave >= 75;
		default:
			return false;
	}
}

/**
 * Returns the list of UpgradeIds that are starter upgrades (no blueprint required).
 */
export const STARTER_FIELD_UPGRADES: UpgradeId[] = [
	UpgradeId.Damage,
	UpgradeId.FireRate,
	UpgradeId.MaxHp,
	UpgradeId.Regen,
	UpgradeId.CritChance,
	UpgradeId.CritMultiplier,
];

/**
 * Returns the list of WorkshopUpgradeIds that are starter upgrades (no blueprint required).
 */
export const STARTER_FOUNDRY_UPGRADES: WorkshopUpgradeId[] = [
	WorkshopUpgradeId.BaseDamage,
	WorkshopUpgradeId.BaseFireRate,
	WorkshopUpgradeId.StartingHp,
	WorkshopUpgradeId.Regen,
	WorkshopUpgradeId.CoinBonus,
];

/**
 * Check if a field (battle) upgrade is unlocked given a set of owned blueprint IDs.
 */
export function isFieldUpgradeUnlocked(
	upgradeId: UpgradeId,
	ownedBlueprints: BlueprintId[],
): boolean {
	if (STARTER_FIELD_UPGRADES.includes(upgradeId)) return true;
	for (const bp of BLUEPRINT_DEFS) {
		if (bp.unlocksFieldUpgrades.includes(upgradeId) && ownedBlueprints.includes(bp.id)) {
			return true;
		}
	}
	return false;
}

/**
 * Check if a foundry (workshop) upgrade is unlocked given a set of owned blueprint IDs.
 */
export function isFoundryUpgradeUnlocked(
	upgradeId: WorkshopUpgradeId,
	ownedBlueprints: BlueprintId[],
): boolean {
	if (STARTER_FOUNDRY_UPGRADES.includes(upgradeId)) return true;
	for (const bp of BLUEPRINT_DEFS) {
		if (bp.unlocksFoundryUpgrades.includes(upgradeId) && ownedBlueprints.includes(bp.id)) {
			return true;
		}
	}
	return false;
}

/**
 * Returns the blueprint that unlocks a given field upgrade, or null if starter.
 */
export function getBlueprintForFieldUpgrade(upgradeId: UpgradeId): BlueprintDef | null {
	if (STARTER_FIELD_UPGRADES.includes(upgradeId)) return null;
	for (const bp of BLUEPRINT_DEFS) {
		if (bp.unlocksFieldUpgrades.includes(upgradeId)) return bp;
	}
	return null;
}

/**
 * Returns the blueprint that unlocks a given foundry upgrade, or null if starter.
 */
export function getBlueprintForFoundryUpgrade(upgradeId: WorkshopUpgradeId): BlueprintDef | null {
	if (STARTER_FOUNDRY_UPGRADES.includes(upgradeId)) return null;
	for (const bp of BLUEPRINT_DEFS) {
		if (bp.unlocksFoundryUpgrades.includes(upgradeId)) return bp;
	}
	return null;
}

/**
 * Auto-unlock blueprints based on existing upgrade levels during migration.
 * If the player already has levels in a locked upgrade path, unlock the
 * corresponding blueprint (grandfathering).
 */
export function computeGrandfatheredBlueprints(
	workshopLevels: Partial<Record<WorkshopUpgradeId, number>>,
	battleLevels: Partial<Record<UpgradeId, number>>,
	labLevels: Partial<Record<string, number>>,
): BlueprintId[] {
	const ids = new Set<BlueprintId>();

	for (const bp of BLUEPRINT_DEFS) {
		// Check workshop upgrades
		for (const wsId of bp.unlocksFoundryUpgrades) {
			if ((workshopLevels[wsId] ?? 0) > 0) {
				ids.add(bp.id);
				break;
			}
		}
		// Check battle upgrades (from save if available — battle levels are per-run
		// and not persisted, so we only check workshop for grandfathering)
		// But we check lab unlocks too
		if (bp.unlocksLabIds) {
			for (const labId of bp.unlocksLabIds) {
				if ((labLevels[labId] ?? 0) > 0) {
					ids.add(bp.id);
					break;
				}
			}
		}
	}

	return Array.from(ids);
}

export const BLUEPRINT_DEFS: BlueprintDef[] = [
	// ── Attack Blueprints ──────────────────────────────────────────────
	{
		id: BlueprintId.CriticalTargeting,
		name: 'Critical Targeting',
		description: 'Precision-core schematics enable critical hit calibration and enhanced crit amplification.',
		icon: '⭐',
		category: 'attack',
		unlockCondition: 'Reach Wave 25 or defeat 2 Bosses',
		cost: 250,
		order: 10,
		unlocksFieldUpgrades: [UpgradeId.CritChance, UpgradeId.CritMultiplier],
		unlocksFoundryUpgrades: [WorkshopUpgradeId.CritBonus],
	},
	{
		id: BlueprintId.SplitBeamGeometry,
		name: 'Split Beam Geometry',
		description: 'Refracted-core lensing enables multi-target projectile splitting.',
		icon: '💥',
		category: 'attack',
		unlockCondition: 'Reach Wave 50',
		cost: 500,
		order: 20,
		unlocksFieldUpgrades: [UpgradeId.Multishot, UpgradeId.MultishotProjectiles],
		unlocksFoundryUpgrades: [],
	},
	{
		id: BlueprintId.ExtendedCoreOptics,
		name: 'Extended Tower Optics',
		description: 'Long-range targeting array extends the Tower engagement perimeter.',
		icon: '🎯',
		category: 'attack',
		unlockCondition: 'Reach Wave 25',
		cost: 200,
		order: 5,
		unlocksFieldUpgrades: [UpgradeId.Range],
		unlocksFoundryUpgrades: [WorkshopUpgradeId.BaseRange],
	},
	// ── Defense Blueprints ─────────────────────────────────────────────
	{
		id: BlueprintId.PlatedCoreShell,
		name: 'Plated Tower Shell',
		description: 'Ablative plating schematics provide flat damage absorption after percentage reduction.',
		icon: '🛡️',
		category: 'defense',
		unlockCondition: 'Reach Wave 20',
		cost: 200,
		order: 10,
		unlocksFieldUpgrades: [UpgradeId.Defense],
		unlocksFoundryUpgrades: [WorkshopUpgradeId.DefenseAbsolute],
	},
	{
		id: BlueprintId.PhaseDampener,
		name: 'Phase Dampener',
		description: 'Phase-shift field schematics reduce incoming damage by percentage.',
		icon: '🔰',
		category: 'defense',
		unlockCondition: 'Reach Wave 50',
		cost: 400,
		order: 20,
		unlocksFieldUpgrades: [UpgradeId.DefensePercent],
		unlocksFoundryUpgrades: [WorkshopUpgradeId.DefensePercent],
	},
	{
		id: BlueprintId.ReactiveSurface,
		name: 'Reactive Surface',
		description: 'Spike-core schematics reflect damage to melee attackers on contact.',
		icon: '🌵',
		category: 'defense',
		unlockCondition: 'Defeat 5 Bosses or reach Wave 75',
		cost: 500,
		order: 30,
		unlocksFieldUpgrades: [UpgradeId.Thorns],
		unlocksFoundryUpgrades: [WorkshopUpgradeId.Thorns],
	},
	{
		id: BlueprintId.EnergyReclaimer,
		name: 'Energy Reclaimer',
		description: 'Siphon-core schematics leech structural integrity from damaged targets.',
		icon: '🩸',
		category: 'defense',
		unlockCondition: 'Reach Wave 100',
		cost: 1200,
		order: 40,
		unlocksFieldUpgrades: [UpgradeId.Lifesteal],
		unlocksFoundryUpgrades: [WorkshopUpgradeId.Lifesteal],
	},
	// ── Utility Blueprints ─────────────────────────────────────────────
	{
		id: BlueprintId.AlloyExtraction,
		name: 'Alloy Extraction',
		description: 'Scavenger schematics improve alloy yield from deployed engagements.',
		icon: '🔩',
		category: 'utility',
		unlockCondition: 'Reach Wave 25',
		cost: 250,
		order: 10,
		unlocksFieldUpgrades: [UpgradeId.EnergyAmp, UpgradeId.CashPerWave],
		unlocksFoundryUpgrades: [],
	},
	{
		id: BlueprintId.EnergyCondenser,
		name: 'Energy Condenser',
		description: 'Condenser schematics amplify energy harvested from destroyed enemies.',
		icon: '⚡',
		category: 'utility',
		unlockCondition: 'Reach Wave 50',
		cost: 400,
		order: 20,
		unlocksFieldUpgrades: [],
		unlocksFoundryUpgrades: [WorkshopUpgradeId.EnergyBonus],
	},
	{
		id: BlueprintId.DeploymentReserves,
		name: 'Deployment Reserves',
		description: 'Reserve schematics pre-charge the Core with starting energy for each deployment.',
		icon: '🔋',
		category: 'utility',
		unlockCondition: 'Reach Wave 75',
		cost: 400,
		order: 30,
		unlocksFieldUpgrades: [],
		unlocksFoundryUpgrades: [WorkshopUpgradeId.StartingEnergy],
	},
];

const bpMap = new Map<BlueprintId, BlueprintDef>();
for (const bp of BLUEPRINT_DEFS) {
	bpMap.set(bp.id, bp);
}

export function getBlueprintDef(id: BlueprintId): BlueprintDef | undefined {
	return bpMap.get(id);
}
