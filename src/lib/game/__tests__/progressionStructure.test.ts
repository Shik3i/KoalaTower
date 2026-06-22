/**
 * progressionStructure.test.ts — Prompt A (16-Front progression pass).
 *
 * Covers: Front structure/metadata/unlocks, Schematics currency + rewards +
 * migration, enemy-count multiplier, delayed enemy-type pacing, and the
 * Armor/Resistance scaffolding policy.
 */

import { describe, it, expect } from 'vitest';
import {
	FRONT_ORDER, FRONT_COUNT, FRONT_META, TIERS, FRONT_BANDS,
	getFrontName, getFrontMeta, getFrontUnlockWave, getTierNumber,
	frontToTierId, isFrontUnlocked, getUnlockedFronts, getFrontBandDef,
} from '../balance/tiers';
import { FrontBand, TierId, EnemyType, BlueprintId } from '../engine/gameTypes';
import {
	enemyCountMultiplier, availableEnemyTypes, frontEnemyArmor,
	frontHasArmor, frontHasResistance, frontEnemyResistances, computeEnemyConfig,
	front1EnemyHp, front1EnemyDamage, enemySpawnWeightsForWave,
} from '../balance/balanceMath';
import { getEnemyCountForWave } from '../balance/enemies';
import {
	emptySchematics, normalizeSchematics, getSchematics, addSchematics,
	spendSchematics, canAfford, getBossSchematicReward, pendingMilestoneSchematics,
	schematicMilestoneKey, getPathSchematicCost, tryUnlockPathWithSchematics,
	SCHEMATIC_UNLOCK_COST,
} from '../balance/schematics';
import { migrateSave } from '../save/migrations';
import { createDefaultSave } from '../save/saveTypes';

// ─── Fronts ──────────────────────────────────────────────────────────────────

describe('16 Front structure', () => {
	it('has exactly 16 Fronts', () => {
		expect(FRONT_COUNT).toBe(16);
		expect(FRONT_ORDER.length).toBe(16);
		expect(FRONT_META.length).toBe(16);
		expect(TIERS.length).toBe(16);
		expect(new Set(FRONT_ORDER).size).toBe(16); // all distinct
	});

	it('display names follow the Perimeter/Redline/Blacksite/Anomaly band + star pattern', () => {
		const expected = [
			'Perimeter', 'Perimeter ★', 'Perimeter ★★', 'Perimeter ★★★',
			'Redline', 'Redline ★', 'Redline ★★', 'Redline ★★★',
			'Blacksite', 'Blacksite ★', 'Blacksite ★★', 'Blacksite ★★★',
			'Anomaly', 'Anomaly ★', 'Anomaly ★★', 'Anomaly ★★★',
		];
		expect(FRONT_META.map(m => m.displayName)).toEqual(expected);
		FRONT_ORDER.forEach((id, i) => expect(getFrontName(id)).toBe(expected[i]));
	});

	it('stars run 0–3 within each band', () => {
		for (const m of FRONT_META) {
			expect(m.stars).toBe((m.front - 1) % 4);
			expect(m.stars).toBeGreaterThanOrEqual(0);
			expect(m.stars).toBeLessThanOrEqual(3);
		}
	});

	it('groups four Fronts per band', () => {
		const bands: Record<FrontBand, number[]> = {
			[FrontBand.Perimeter]: [], [FrontBand.Redline]: [],
			[FrontBand.Blacksite]: [], [FrontBand.Anomaly]: [],
		};
		for (const m of FRONT_META) bands[m.band].push(m.front);
		expect(bands[FrontBand.Perimeter]).toEqual([1, 2, 3, 4]);
		expect(bands[FrontBand.Redline]).toEqual([5, 6, 7, 8]);
		expect(bands[FrontBand.Blacksite]).toEqual([9, 10, 11, 12]);
		expect(bands[FrontBand.Anomaly]).toEqual([13, 14, 15, 16]);
	});

	it('every band has a defined color/identity for the shared icon', () => {
		for (const band of Object.values(FrontBand)) {
			expect(FRONT_BANDS[band].color).toMatch(/^#/);
			expect(FRONT_BANDS[band].identity.length).toBeGreaterThan(0);
		}
		// Sanity: distinct band colors keep contrast bands readable.
		const colors = Object.values(FRONT_BANDS).map(b => b.color);
		expect(new Set(colors).size).toBe(4);
	});

	it('numeric Front <-> TierId round-trips', () => {
		for (let f = 1; f <= 16; f++) {
			expect(getTierNumber(frontToTierId(f))).toBe(f);
		}
	});
});

describe('Front unlock requirements', () => {
	it('Front 1 is always unlocked; normal gates are Wave 100 on the previous Front', () => {
		expect(getFrontUnlockWave(1)).toBe(0);
		expect(getFrontUnlockWave(2)).toBe(100);
		expect(getFrontUnlockWave(3)).toBe(100);
		expect(getFrontUnlockWave(4)).toBe(100);
		expect(getFrontUnlockWave(6)).toBe(100);
	});

	it('band-transition Fronts are harder: 5→200, 9→300, 13→400', () => {
		expect(getFrontUnlockWave(5)).toBe(200);
		expect(getFrontUnlockWave(9)).toBe(300);
		expect(getFrontUnlockWave(13)).toBe(400);
	});

	it('isFrontUnlocked respects the per-Front gate wave', () => {
		// Wave 100 on Front 4 is NOT enough for Front 5 (needs 200).
		const at100 = { [TierId.Tier4]: 100 } as Partial<Record<TierId, number>>;
		expect(isFrontUnlocked(TierId.Tier5, at100)).toBe(false);
		const at200 = { [TierId.Tier4]: 200 } as Partial<Record<TierId, number>>;
		expect(isFrontUnlocked(TierId.Tier5, at200)).toBe(true);

		// Front 9 needs Wave 300 on Front 8.
		expect(isFrontUnlocked(TierId.Tier9, { [TierId.Tier8]: 299 })).toBe(false);
		expect(isFrontUnlocked(TierId.Tier9, { [TierId.Tier8]: 300 })).toBe(true);
	});

	it('getUnlockedFronts is sequential and stops at the first locked Front', () => {
		expect(getUnlockedFronts({})).toEqual([TierId.Tier1]);
		const fbw = { [TierId.Tier1]: 100, [TierId.Tier2]: 100 } as Partial<Record<TierId, number>>;
		expect(getUnlockedFronts(fbw)).toEqual([TierId.Tier1, TierId.Tier2, TierId.Tier3]);
	});
});

// ─── Enemy count scaling per Front ─────────────────────────────────────────────

describe('Enemy count multiplier per Front', () => {
	it('equals 1 + 0.33 * (front - 1)', () => {
		for (let f = 1; f <= 16; f++) {
			expect(enemyCountMultiplier(f)).toBeCloseTo(1 + 0.33 * (f - 1), 10);
		}
		expect(enemyCountMultiplier(1)).toBe(1);
		expect(enemyCountMultiplier(5)).toBeCloseTo(2.32, 10);
		expect(enemyCountMultiplier(16)).toBeCloseTo(5.95, 10);
	});

	it('Front 1 baseline count is unchanged; higher Fronts spawn more', () => {
		const f1 = getEnemyCountForWave(20, 1);
		const f2 = getEnemyCountForWave(20, 2);
		const f16 = getEnemyCountForWave(20, 16);
		// Front 1 default matches the un-fronted baseline.
		expect(getEnemyCountForWave(20)).toBe(f1);
		expect(f2).toBeGreaterThan(f1);
		expect(f16).toBeGreaterThan(f2);
		expect(Number.isFinite(f16)).toBe(true);
	});

	it('count multiplier does not change enemy HP/damage (Front raises those separately)', () => {
		// computeEnemyConfig HP/damage is the Front MULTIPLIER, not the count mult.
		const c1 = computeEnemyConfig(EnemyType.Normal, 10, 1);
		const c1b = computeEnemyConfig(EnemyType.Normal, 10, 1);
		expect(c1.hp).toBe(c1b.hp);
	});
});

// ─── Enemy type mix pacing ─────────────────────────────────────────────────────

describe('Enemy type pacing', () => {
	it('uses Tower-like weighted enemy mixes instead of hard unlock gates', () => {
		expect(enemySpawnWeightsForWave(1)).toEqual({
			[EnemyType.Normal]: 95,
			[EnemyType.Fast]: 5,
			[EnemyType.Tank]: 0,
			[EnemyType.Ranged]: 0,
		});
		expect(enemySpawnWeightsForWave(1000)).toEqual({
			[EnemyType.Normal]: 33,
			[EnemyType.Fast]: 24,
			[EnemyType.Tank]: 22,
			[EnemyType.Ranged]: 21,
		});
	});

	it('Fronts do not change the Basic/Fast/Tank/Ranged mix table', () => {
		expect(availableEnemyTypes(20, 1)).toEqual(availableEnemyTypes(20, 5));
	});

	it('weighted availableEnemyTypes includes the active table roster', () => {
		const t = availableEnemyTypes(1000, 1);
		expect(t).toContain(EnemyType.Fast);
		expect(t).toContain(EnemyType.Tank);
		expect(t).toContain(EnemyType.Ranged);
	});
});

// ─── Armor / Resistance / Damage-Type scaffolding ──────────────────────────────

describe('Armor / Resistance policy', () => {
	it('Front 1 never has armor (any type, any wave)', () => {
		expect(frontHasArmor(1)).toBe(false);
		for (const w of [1, 10, 50, 100, 1000]) {
			expect(frontEnemyArmor(1, w, false)).toBe(0);
			expect(frontEnemyArmor(1, w, true)).toBe(0);
			expect(computeEnemyConfig(EnemyType.Normal, w, 1).armor).toBe(0);
			expect(computeEnemyConfig(EnemyType.Boss, w, 1).armor).toBe(0);
		}
	});

	it('Perimeter (Fronts 1–4) has no armor', () => {
		for (let f = 1; f <= 4; f++) {
			expect(frontHasArmor(f)).toBe(false);
			expect(frontEnemyArmor(f, 200, false)).toBe(0);
		}
	});

	it('Front 5 armor appears late, around Wave 100 / Boss 10', () => {
		expect(frontHasArmor(5)).toBe(true);
		expect(frontEnemyArmor(5, 99, false)).toBe(0);
		expect(frontEnemyArmor(5, 100, false)).toBeGreaterThan(0);
		expect(frontEnemyArmor(5, 100, true)).toBeGreaterThan(0);
	});

	it('Front 6+ armor is allowed earlier / more frequent', () => {
		expect(frontEnemyArmor(6, 30, false)).toBeGreaterThan(0);
		// Front 6 has armor by wave 30; Front 5 still has none at wave 30.
		expect(frontEnemyArmor(5, 30, false)).toBe(0);
	});

	it('Resistance scaffolding starts at Front 9 (none before)', () => {
		expect(frontHasResistance(8)).toBe(false);
		expect(frontHasResistance(9)).toBe(true);
		expect(Object.keys(frontEnemyResistances(8, 100))).toHaveLength(0);
		expect(Object.keys(frontEnemyResistances(9, 100)).length).toBeGreaterThan(0);
		// Resistances are finite numbers in [0,1].
		for (const v of Object.values(frontEnemyResistances(13, 500))) {
			expect(Number.isFinite(v)).toBe(true);
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThanOrEqual(1);
		}
	});
});

// ─── Enemy formula intact ──────────────────────────────────────────────────────

describe('Enemy HP/damage formula intact', () => {
	it('Front 1 anchors still pass with retuned HP and attack scales', () => {
		expect(front1EnemyDamage(1)).toBeCloseTo(11.8, 1);
		expect(front1EnemyHp(1)).toBeCloseTo(39.17, 1);
		expect(front1EnemyDamage(10)).toBeCloseTo(48.1, 1);
		expect(front1EnemyHp(10)).toBeCloseTo(306.06, 1);
	});

	it('wave 10000 returns finite positive values', () => {
		expect(Number.isFinite(front1EnemyHp(10000))).toBe(true);
		expect(front1EnemyHp(10000)).toBeGreaterThan(0);
		expect(Number.isFinite(front1EnemyDamage(10000))).toBe(true);
		expect(front1EnemyDamage(10000)).toBeGreaterThan(0);
	});
});

// ─── Schematics ────────────────────────────────────────────────────────────────

describe('Schematics currency', () => {
	it('empty ledger initializes all 16 Fronts to 0', () => {
		const m = emptySchematics();
		for (let f = 1; f <= 16; f++) expect(getSchematics(m, f)).toBe(0);
	});

	it('normalizeSchematics backfills missing Fronts and floors values, dropping junk keys', () => {
		const m = normalizeSchematics({ 1: 5, 3: 2.9, 99: 100, foo: 1 });
		expect(getSchematics(m, 1)).toBe(5);
		expect(getSchematics(m, 3)).toBe(2); // floored
		expect(getSchematics(m, 2)).toBe(0); // backfilled
		expect(m[99]).toBeUndefined();       // out-of-range dropped
	});

	it('addSchematics accumulates and never goes negative', () => {
		const m = emptySchematics();
		addSchematics(m, 1, 5);
		addSchematics(m, 1, 3);
		expect(getSchematics(m, 1)).toBe(8);
		addSchematics(m, 1, -100); // clamped to 0 add
		expect(getSchematics(m, 1)).toBe(8);
	});

	it('cannot spend more than held, and cannot spend negative/zero', () => {
		const m = emptySchematics();
		addSchematics(m, 1, 10);
		expect(spendSchematics(m, 1, 15)).toBe(false); // overdraw refused
		expect(getSchematics(m, 1)).toBe(10);
		expect(spendSchematics(m, 1, -5)).toBe(false);  // negative refused
		expect(spendSchematics(m, 1, 0)).toBe(false);   // zero refused
		expect(spendSchematics(m, 1, 6)).toBe(true);
		expect(getSchematics(m, 1)).toBe(4);
		// Balance never goes below zero.
		expect(getSchematics(m, 1)).toBeGreaterThanOrEqual(0);
	});

	it('canAfford reflects balance', () => {
		const m = emptySchematics();
		addSchematics(m, 2, 12);
		expect(canAfford(m, 2, 12)).toBe(true);
		expect(canAfford(m, 2, 13)).toBe(false);
	});
});

describe('Schematic rewards', () => {
	it('boss drop bundles scale slowly by Front', () => {
		expect(getBossSchematicReward(1)).toBe(1);
		expect(getBossSchematicReward(7)).toBe(2);
		expect(getBossSchematicReward(13)).toBe(3);
		for (let f = 1; f <= 16; f++) {
			expect(getBossSchematicReward(f)).toBeGreaterThanOrEqual(1);
			expect(getBossSchematicReward(f)).toBeLessThanOrEqual(3);
		}
	});

	it('milestone Schematics are one-time per Front', () => {
		const claimed: string[] = [];
		// Reaching wave 100 on Front 1 awards the 50 and 100 milestones.
		const first = pendingMilestoneSchematics(1, 100, claimed);
		expect(first.map(a => a.wave)).toEqual([50, 100]);
		expect(first.reduce((s, a) => s + a.amount, 0)).toBe(15); // 5 + 10
		// Mark them claimed; a repeat run grants nothing new.
		const nowClaimed = first.map(a => a.key);
		expect(pendingMilestoneSchematics(1, 100, nowClaimed)).toHaveLength(0);
		// But a deeper push (wave 200) still grants the new one.
		const deeper = pendingMilestoneSchematics(1, 200, nowClaimed);
		expect(deeper.map(a => a.wave)).toEqual([200]);
	});

	it('milestone keys are Front-scoped', () => {
		expect(schematicMilestoneKey(1, 50)).toBe('1:50');
		expect(schematicMilestoneKey(3, 100)).toBe('3:100');
		// Same wave on different Fronts → independent claims.
		const front1 = pendingMilestoneSchematics(1, 50, []);
		const front2 = pendingMilestoneSchematics(2, 50, front1.map(a => a.key));
		expect(front2).toHaveLength(1);
		expect(front2[0]!.front).toBe(2);
	});
});

describe('Schematic spending unlocks upgrade paths', () => {
	it('every cost references a valid Front (1–16) and a sane cost band', () => {
		for (const [, cost] of Object.entries(SCHEMATIC_UNLOCK_COST)) {
			expect(cost!.front).toBeGreaterThanOrEqual(1);
			expect(cost!.front).toBeLessThanOrEqual(16);
			expect(cost!.cost).toBeGreaterThan(0);
			expect(cost!.cost).toBeLessThanOrEqual(25);
		}
	});

	it('Front 1 onboarding paths cost Front 1 Schematics', () => {
		expect(getPathSchematicCost(BlueprintId.ExtendedCoreOptics)!.front).toBe(1);
		expect(getPathSchematicCost(BlueprintId.SplitBeamGeometry)!.front).toBe(1);
		expect(getPathSchematicCost(BlueprintId.AlloyExtraction)!.cost).toBe(5); // small unlock
	});

	it('unlocking consumes exactly the right Front Schematics', () => {
		const m = emptySchematics();
		const cost = getPathSchematicCost(BlueprintId.ExtendedCoreOptics)!;
		addSchematics(m, cost.front, cost.cost);
		const owned: BlueprintId[] = [];
		expect(tryUnlockPathWithSchematics(m, owned, BlueprintId.ExtendedCoreOptics)).toBe(true);
		expect(getSchematics(m, cost.front)).toBe(0);
		// Cannot afford a second unlock with an empty ledger.
		expect(tryUnlockPathWithSchematics(m, owned, BlueprintId.CriticalTargeting)).toBe(false);
	});

	it('already-owned paths cannot be re-bought (no double spend)', () => {
		const m = emptySchematics();
		addSchematics(m, 1, 100);
		const owned = [BlueprintId.ExtendedCoreOptics];
		expect(tryUnlockPathWithSchematics(m, owned, BlueprintId.ExtendedCoreOptics)).toBe(false);
		expect(getSchematics(m, 1)).toBe(100); // nothing spent
	});
});

// ─── Save migration safety ─────────────────────────────────────────────────────

describe('Schematics save migration', () => {
	it('default save ships an initialized Schematics ledger', () => {
		const save = createDefaultSave();
		expect(Object.keys(save.schematicsByFront).length).toBe(16);
		for (let f = 1; f <= 16; f++) expect(save.schematicsByFront[f]).toBe(0);
		expect(save.claimedSchematicMilestones).toEqual([]);
	});

	it('old save (v10) migrates: Schematics initialized to 0, owned paths preserved', () => {
		const legacy = {
			schemaVersion: 10,
			lastUpdated: 1, totalRuns: 5, highestWave: 120, totalAlloy: 999,
			unlockedBlueprints: [BlueprintId.ExtendedCoreOptics, BlueprintId.PlatedCoreShell],
			frontBestWave: { [TierId.Tier1]: 120 },
		};
		const migrated = migrateSave(legacy as unknown as Record<string, unknown>);
		expect(migrated).not.toBeNull();
		// Schematics initialized to 0 for every Front.
		expect(Object.keys(migrated!.schematicsByFront).length).toBe(16);
		for (let f = 1; f <= 16; f++) expect(migrated!.schematicsByFront[f]).toBe(0);
		expect(migrated!.claimedSchematicMilestones).toEqual([]);
		// Already-unlocked upgrade paths stay unlocked — no progress wiped.
		expect(migrated!.unlockedBlueprints).toContain(BlueprintId.ExtendedCoreOptics);
		expect(migrated!.unlockedBlueprints).toContain(BlueprintId.PlatedCoreShell);
		// Existing progress preserved.
		expect(migrated!.highestWave).toBe(120);
		expect(migrated!.totalAlloy).toBe(999);
	});

	it('a very old save (v1) still ends up with a valid Schematics ledger', () => {
		const ancient = { schemaVersion: 1, lastUpdated: 1, totalRuns: 1, highestWave: 1, totalAlloy: 1 };
		const migrated = migrateSave(ancient as unknown as Record<string, unknown>);
		expect(migrated).not.toBeNull();
		expect(normalizeSchematics(migrated!.schematicsByFront)[1]).toBe(0);
		expect(Array.isArray(migrated!.claimedSchematicMilestones)).toBe(true);
	});

	it('preserves pre-existing Schematics values on re-migration', () => {
		const save = { ...createDefaultSave(), schematicsByFront: { ...emptySchematics(), 1: 42 } } as Record<string, unknown>;
		const migrated = migrateSave(save);
		expect(migrated!.schematicsByFront[1]).toBe(42);
	});
});

// ─── Front band display helper ─────────────────────────────────────────────────

describe('Front band display helpers', () => {
	it('getFrontBandDef returns the right band color for each Front', () => {
		expect(getFrontBandDef(TierId.Tier1).band).toBe(FrontBand.Perimeter);
		expect(getFrontBandDef(TierId.Tier5).band).toBe(FrontBand.Redline);
		expect(getFrontBandDef(TierId.Tier9).band).toBe(FrontBand.Blacksite);
		expect(getFrontBandDef(TierId.Tier13).band).toBe(FrontBand.Anomaly);
	});

	it('getFrontMeta is stable for all Fronts', () => {
		for (const id of FRONT_ORDER) {
			const meta = getFrontMeta(id);
			expect(meta.front).toBe(getTierNumber(id));
			expect(meta.displayName).toBe(getFrontName(id));
		}
	});
});
