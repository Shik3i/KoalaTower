/**
 * blueprints.ts — Blueprint definitions and the upgrade-gating they drive.
 *
 * LIFECYCLE (see progression/blueprintDiscovery.ts):
 *   undiscovered → discovered (found via RNG at a qualifying front) → owned (bought with Alloy)
 *
 * SINGLE SOURCE OF TRUTH:
 *   The upgrade declares its own prerequisite via `requiredBlueprint`
 *   (see battleUpgrades.ts / workshopUpgrades.ts). The blueprint → upgrades
 *   mapping is DERIVED from that — never hand-maintained here. Adding a new
 *   gated ability is therefore: write the upgrade def (+ requiredBlueprint),
 *   write a BlueprintDef (cost + requirement + discovery). No switch edits.
 */

import { BlueprintId, TierId, UpgradeId, WorkshopUpgradeId } from '../engine/gameTypes';
import type { BlueprintCategory } from '../engine/gameTypes';
import { type Requirement, type ProgressSnapshot, meetsRequirement, describeRequirement } from '../progression/requirements';
import { BATTLE_UPGRADE_DEFS } from './battleUpgrades';
import { WORKSHOP_UPGRADE_DEFS } from './workshopUpgrades';
import { getFrontName } from './tiers';

/** How a blueprint is found in the field (the RNG discovery step). */
export interface BlueprintDiscovery {
	/** Fronts (tiers) on which this blueprint can drop. */
	fronts: TierId[];
	/** Per-deployment drop chance once the front + requirement are satisfied (0–1). */
	chance: number;
}

export interface BlueprintDef {
	id: BlueprintId;
	name: string;
	description: string;
	icon: string;
	category: BlueprintCategory;
	/** Alloy cost to acquire (research) once discovered. */
	cost: number;
	/** Display order (lower = first). */
	order: number;
	/** What must be true for this blueprint to become discoverable. */
	requirement: Requirement;
	/** Where/how often it drops. */
	discovery: BlueprintDiscovery;
}

export const BLUEPRINT_DEFS: BlueprintDef[] = [
	// ── Attack ──────────────────────────────────────────────────────────
	{
		id: BlueprintId.ExtendedCoreOptics,
		name: 'Extended Tower Optics',
		description: "Long-range targeting array. Procurement claims it was 'temporarily misplaced' for six fiscal quarters.",
		icon: '🎯', category: 'attack', cost: 200, order: 5,
		requirement: { minWave: 25 },
		discovery: { fronts: [TierId.Tier1], chance: 0.08 },
	},
	{
		id: BlueprintId.CriticalTargeting,
		name: 'Critical Targeting',
		description: "Critical hit calibration system. R&D insists the 0.001% crit amplification is 'within acceptable margins.'",
		icon: '⭐', category: 'attack', cost: 250, order: 10,
		requirement: { anyOf: [{ minWave: 25 }, { minBosses: 2 }] },
		discovery: { fronts: [TierId.Tier1], chance: 0.08 },
	},
	{
		id: BlueprintId.SplitBeamGeometry,
		name: 'Split Beam Geometry',
		description: "Multi-target splitting lens. The beam doesn't actually split — it just argues with several shapes at once.",
		icon: '💥', category: 'attack', cost: 500, order: 20,
		requirement: { minWave: 50 },
		discovery: { fronts: [TierId.Tier1, TierId.Tier2], chance: 0.08 },
	},
	// ── Defense ─────────────────────────────────────────────────────────
	{
		id: BlueprintId.PlatedCoreShell,
		name: 'Plated Tower Shell',
		description: "Ablative plating. Absorbs damage after percentage reduction, or as Command puts it, 'after the important damage has already happened.'",
		icon: '🛡️', category: 'defense', cost: 200, order: 10,
		requirement: { minWave: 20 },
		discovery: { fronts: [TierId.Tier1], chance: 0.08 },
	},
	{
		id: BlueprintId.PhaseDampener,
		name: 'Phase Dampener',
		description: "Phase-shift field. Reduces incoming damage by a percentage that Command insists is 'mathematically significant.'",
		icon: '🔰', category: 'defense', cost: 400, order: 20,
		requirement: { minWave: 50 },
		discovery: { fronts: [TierId.Tier1, TierId.Tier2], chance: 0.08 },
	},
	{
		id: BlueprintId.ReactiveSurface,
		name: 'Reactive Surface',
		description: "Spike-core reactive armor. Returns damage to melee attackers. The shapes call it 'unsportsmanlike geometry.'",
		icon: '🌵', category: 'defense', cost: 500, order: 30,
		requirement: { anyOf: [{ minBosses: 5 }, { minWave: 75 }] },
		discovery: { fronts: [TierId.Tier2], chance: 0.07 },
	},
	{
		id: BlueprintId.EnergyReclaimer,
		name: 'Energy Reclaimer',
		description: "Siphon-core system that leeches structural integrity from damaged targets. R&D calls it 'recycling.' The shapes call it 'theft.'",
		icon: '🩸', category: 'defense', cost: 1200, order: 40,
		requirement: { minWave: 100 },
		discovery: { fronts: [TierId.Tier3], chance: 0.06 },
	},
	// ── Utility ─────────────────────────────────────────────────────────
	{
		id: BlueprintId.AlloyExtraction,
		name: 'Alloy Extraction',
		description: "Scavenger schematics that improve alloy yield. Procurement insists the extra alloy was 'always there, you just weren't looking hard enough.'",
		icon: '🔩', category: 'utility', cost: 250, order: 10,
		requirement: { minWave: 25 },
		discovery: { fronts: [TierId.Tier1], chance: 0.08 },
	},
	{
		id: BlueprintId.EnergyCondenser,
		name: 'Energy Condenser',
		description: "Condenser that amplifies harvested energy. Command describes the efficiency gain as 'classified,' which means 'we don't know either.'",
		icon: '⚡', category: 'utility', cost: 400, order: 20,
		requirement: { minWave: 50 },
		discovery: { fronts: [TierId.Tier1, TierId.Tier2], chance: 0.08 },
	},
	{
		id: BlueprintId.DeploymentReserves,
		name: 'Deployment Reserves',
		description: "Pre-charges the Core with starting energy. The energy is 'borrowed' from future deployments. Future you will not be filing a complaint.",
		icon: '🔋', category: 'utility', cost: 400, order: 30,
		requirement: { minWave: 75 },
		discovery: { fronts: [TierId.Tier2], chance: 0.07 },
	},
];

// ─── Lookup maps (built once) ────────────────────────────────────────────────

const bpMap = new Map<BlueprintId, BlueprintDef>();
for (const bp of BLUEPRINT_DEFS) bpMap.set(bp.id, bp);

/** upgradeId → required blueprint (or undefined = starter), derived from upgrade defs. */
const fieldRequirement = new Map<UpgradeId, BlueprintId | undefined>();
for (const u of BATTLE_UPGRADE_DEFS) fieldRequirement.set(u.id, u.requiredBlueprint);

const foundryRequirement = new Map<WorkshopUpgradeId, BlueprintId | undefined>();
for (const u of WORKSHOP_UPGRADE_DEFS) foundryRequirement.set(u.id, u.requiredBlueprint);

export function getBlueprintDef(id: BlueprintId): BlueprintDef | undefined {
	return bpMap.get(id);
}

/** Field (battle) upgrades a blueprint unlocks — derived, not hand-maintained. */
export function getFieldUpgradesUnlockedBy(id: BlueprintId): UpgradeId[] {
	return BATTLE_UPGRADE_DEFS.filter(u => u.requiredBlueprint === id).map(u => u.id);
}

/** Foundry (workshop) upgrades a blueprint unlocks — derived, not hand-maintained. */
export function getFoundryUpgradesUnlockedBy(id: BlueprintId): WorkshopUpgradeId[] {
	return WORKSHOP_UPGRADE_DEFS.filter(u => u.requiredBlueprint === id).map(u => u.id);
}

// ─── Upgrade gating ──────────────────────────────────────────────────────────

export function isFieldUpgradeUnlocked(upgradeId: UpgradeId, ownedBlueprints: readonly BlueprintId[]): boolean {
	const req = fieldRequirement.get(upgradeId);
	return !req || ownedBlueprints.includes(req);
}

export function isFoundryUpgradeUnlocked(upgradeId: WorkshopUpgradeId, ownedBlueprints: readonly BlueprintId[]): boolean {
	const req = foundryRequirement.get(upgradeId);
	return !req || ownedBlueprints.includes(req);
}

export function getBlueprintForFieldUpgrade(upgradeId: UpgradeId): BlueprintDef | null {
	const req = fieldRequirement.get(upgradeId);
	return req ? (bpMap.get(req) ?? null) : null;
}

export function getBlueprintForFoundryUpgrade(upgradeId: WorkshopUpgradeId): BlueprintDef | null {
	const req = foundryRequirement.get(upgradeId);
	return req ? (bpMap.get(req) ?? null) : null;
}

/** Battle upgrades with no blueprint requirement (available from the start). */
export const STARTER_FIELD_UPGRADES: UpgradeId[] = BATTLE_UPGRADE_DEFS.filter(u => !u.requiredBlueprint).map(u => u.id);
export const STARTER_FOUNDRY_UPGRADES: WorkshopUpgradeId[] = WORKSHOP_UPGRADE_DEFS.filter(u => !u.requiredBlueprint).map(u => u.id);

// ─── Display helpers ─────────────────────────────────────────────────────────

const blueprintName = (id: BlueprintId): string => bpMap.get(id)?.name ?? id;

/** Human-readable discovery condition, e.g. "Front: Tier 1 · Reach Wave 25". */
export function describeBlueprintDiscovery(bp: BlueprintDef): string {
	const fronts = bp.discovery.fronts.map(getFrontName).join(' / ');
	const cond = describeRequirement(bp.requirement, blueprintName);
	return `Find at ${fronts} · ${cond}`;
}

/** True when the blueprint's requirement is met (eligible to be discovered). */
export function isBlueprintDiscoverable(bp: BlueprintDef, progress: ProgressSnapshot): boolean {
	return meetsRequirement(bp.requirement, progress);
}

/**
 * Back-compat shim for existing tests/UI: evaluates the requirement against a
 * bare (wave, bosses) pair. Prefer isBlueprintDiscoverable with a full snapshot.
 */
export function isBlueprintUnlockable(bp: BlueprintDef, highestWave: number, bossesDefeated: number): boolean {
	return meetsRequirement(bp.requirement, { highestWave, bossesDefeated, ownedBlueprints: [], unlockedFronts: [] });
}

/**
 * Auto-unlock blueprints based on existing upgrade levels during migration:
 * if a player already invested in a gated workshop path, grandfather the
 * blueprint so they don't lose access.
 */
export function computeGrandfatheredBlueprints(
	workshopLevels: Partial<Record<WorkshopUpgradeId, number>>,
	_battleLevels: Partial<Record<UpgradeId, number>>,
	_labLevels: Partial<Record<string, number>>,
): BlueprintId[] {
	const ids = new Set<BlueprintId>();
	for (const u of WORKSHOP_UPGRADE_DEFS) {
		if (u.requiredBlueprint && (workshopLevels[u.id] ?? 0) > 0) {
			ids.add(u.requiredBlueprint);
		}
	}
	return Array.from(ids);
}
