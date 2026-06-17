import { describe, it, expect } from 'vitest';
import { BlueprintId, TierId } from '../engine/gameTypes';
import { meetsRequirement, describeRequirement, type ProgressSnapshot } from '../progression/requirements';
import { rollBlueprintDiscovery, getBlueprintStatus } from '../progression/blueprintDiscovery';
import {
	BLUEPRINT_DEFS,
	STARTER_FIELD_UPGRADES,
	isFieldUpgradeUnlocked,
	getFieldUpgradesUnlockedBy,
	describeBlueprintDiscovery,
} from '../balance/blueprints';
import { UpgradeId } from '../engine/gameTypes';
import { getUnlockedFronts, isFrontUnlocked, FRONT_UNLOCK_WAVE } from '../balance/tiers';
import { getFrontAlloyMultiplier } from '../balance/balanceMath';

const baseProgress = (over: Partial<ProgressSnapshot> = {}): ProgressSnapshot => ({
	highestWave: 0,
	bossesDefeated: 0,
	ownedBlueprints: [],
	unlockedFronts: [TierId.Tier1],
	...over,
});

describe('requirements', () => {
	it('passes when all scalar conditions met (AND)', () => {
		expect(meetsRequirement({ minWave: 25 }, baseProgress({ highestWave: 25 }))).toBe(true);
		expect(meetsRequirement({ minWave: 25 }, baseProgress({ highestWave: 24 }))).toBe(false);
		expect(meetsRequirement({ minWave: 25, minBosses: 2 }, baseProgress({ highestWave: 30, bossesDefeated: 1 }))).toBe(false);
	});

	it('handles anyOf as logical OR', () => {
		const req = { anyOf: [{ minWave: 25 }, { minBosses: 2 }] };
		expect(meetsRequirement(req, baseProgress({ highestWave: 25, bossesDefeated: 0 }))).toBe(true);
		expect(meetsRequirement(req, baseProgress({ highestWave: 0, bossesDefeated: 2 }))).toBe(true);
		expect(meetsRequirement(req, baseProgress({ highestWave: 10, bossesDefeated: 1 }))).toBe(false);
	});

	it('checks blueprint prerequisites and fronts', () => {
		expect(meetsRequirement({ requiresBlueprint: BlueprintId.CriticalTargeting }, baseProgress())).toBe(false);
		expect(meetsRequirement({ requiresBlueprint: BlueprintId.CriticalTargeting }, baseProgress({ ownedBlueprints: [BlueprintId.CriticalTargeting] }))).toBe(true);
		expect(meetsRequirement({ requiresFront: TierId.Tier2 }, baseProgress())).toBe(false);
	});

	it('describes requirements readably', () => {
		expect(describeRequirement({ minWave: 25 })).toBe('Reach Wave 25');
		expect(describeRequirement({ anyOf: [{ minWave: 25 }, { minBosses: 2 }] })).toContain('or');
		expect(describeRequirement({})).toBe('Always available');
	});
});

describe('blueprint discovery', () => {
	const optics = BLUEPRINT_DEFS.find(b => b.id === BlueprintId.ExtendedCoreOptics)!;

	it('drops an eligible blueprint when the roll succeeds', () => {
		const found = rollBlueprintDiscovery({
			front: optics.discovery.fronts[0]!,
			progress: baseProgress({ highestWave: 100 }),
			discovered: [],
			owned: [],
			rng: () => 0, // always under any positive chance
		});
		expect(found).toContain(BlueprintId.ExtendedCoreOptics);
	});

	it('never drops when the roll fails', () => {
		const found = rollBlueprintDiscovery({
			front: optics.discovery.fronts[0]!,
			progress: baseProgress({ highestWave: 100 }),
			discovered: [],
			owned: [],
			rng: () => 0.999,
		});
		expect(found).toEqual([]);
	});

	it('does not drop on the wrong front', () => {
		// EnergyReclaimer only drops on Tier3.
		const found = rollBlueprintDiscovery({
			front: TierId.Tier1,
			progress: baseProgress({ highestWave: 1000, unlockedFronts: [TierId.Tier1, TierId.Tier2, TierId.Tier3] }),
			discovered: [],
			owned: [],
			rng: () => 0,
		});
		expect(found).not.toContain(BlueprintId.EnergyReclaimer);
	});

	it('does not drop when the requirement is unmet', () => {
		const found = rollBlueprintDiscovery({
			front: optics.discovery.fronts[0]!,
			progress: baseProgress({ highestWave: 0 }),
			discovered: [],
			owned: [],
			rng: () => 0,
		});
		expect(found).not.toContain(BlueprintId.ExtendedCoreOptics);
	});

	it('skips already discovered or owned blueprints', () => {
		const ownedFound = rollBlueprintDiscovery({
			front: optics.discovery.fronts[0]!,
			progress: baseProgress({ highestWave: 100 }),
			discovered: [],
			owned: [BlueprintId.ExtendedCoreOptics],
			rng: () => 0,
		});
		expect(ownedFound).not.toContain(BlueprintId.ExtendedCoreOptics);

		const discoveredFound = rollBlueprintDiscovery({
			front: optics.discovery.fronts[0]!,
			progress: baseProgress({ highestWave: 100 }),
			discovered: [BlueprintId.ExtendedCoreOptics],
			owned: [],
			rng: () => 0,
		});
		expect(discoveredFound).not.toContain(BlueprintId.ExtendedCoreOptics);
	});

	it('reports lifecycle status', () => {
		expect(getBlueprintStatus(BlueprintId.CriticalTargeting, [BlueprintId.CriticalTargeting], [])).toBe('owned');
		expect(getBlueprintStatus(BlueprintId.CriticalTargeting, [], [BlueprintId.CriticalTargeting])).toBe('discovered');
		expect(getBlueprintStatus(BlueprintId.CriticalTargeting, [], [])).toBe('undiscovered');
	});
});

describe('blueprint ↔ upgrade derivation (single source of truth)', () => {
	it('derives unlocked upgrades from the upgrade defs', () => {
		expect(getFieldUpgradesUnlockedBy(BlueprintId.ExtendedCoreOptics)).toContain(UpgradeId.Range);
	});

	it('treats upgrades without a required blueprint as starters', () => {
		expect(STARTER_FIELD_UPGRADES).toContain(UpgradeId.Damage);
		expect(isFieldUpgradeUnlocked(UpgradeId.Damage, [])).toBe(true);
		expect(isFieldUpgradeUnlocked(UpgradeId.Range, [])).toBe(false);
		expect(isFieldUpgradeUnlocked(UpgradeId.Range, [BlueprintId.ExtendedCoreOptics])).toBe(true);
	});

	it('every blueprint has a readable discovery description', () => {
		for (const bp of BLUEPRINT_DEFS) {
			expect(describeBlueprintDiscovery(bp)).toContain('Find at');
		}
	});
});

describe('sequential front unlocking', () => {
	it('Front 1 is always open; later fronts gate on the previous front', () => {
		expect(isFrontUnlocked(TierId.Tier1, {})).toBe(true);
		expect(isFrontUnlocked(TierId.Tier2, {})).toBe(false);
		expect(isFrontUnlocked(TierId.Tier2, { [TierId.Tier1]: FRONT_UNLOCK_WAVE })).toBe(true);
		// Reaching wave 100 on Front 1 does NOT skip-unlock Front 3.
		expect(isFrontUnlocked(TierId.Tier3, { [TierId.Tier1]: 999 })).toBe(false);
		expect(isFrontUnlocked(TierId.Tier3, { [TierId.Tier1]: 999, [TierId.Tier2]: FRONT_UNLOCK_WAVE })).toBe(true);
	});

	it('getUnlockedFronts returns a contiguous prefix', () => {
		expect(getUnlockedFronts({})).toEqual([TierId.Tier1]);
		expect(getUnlockedFronts({ [TierId.Tier1]: 100, [TierId.Tier2]: 100 })).toEqual([TierId.Tier1, TierId.Tier2, TierId.Tier3]);
		// A gap (Front 2 not cleared) stops the chain even if a later front has data.
		expect(getUnlockedFronts({ [TierId.Tier1]: 100, [TierId.Tier3]: 100 })).toEqual([TierId.Tier1, TierId.Tier2]);
	});

	it('higher fronts pay more Alloy', () => {
		expect(getFrontAlloyMultiplier(1)).toBe(1.0);
		expect(getFrontAlloyMultiplier(2)).toBeGreaterThan(getFrontAlloyMultiplier(1));
		expect(getFrontAlloyMultiplier(5)).toBeGreaterThan(getFrontAlloyMultiplier(4));
	});
});
