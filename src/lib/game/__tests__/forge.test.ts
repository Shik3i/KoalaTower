/**
 * forge.test.ts — Forge/Field shared-level model (v15 correction).
 *
 * The Forge stores permanent STARTING LEVELS of the same Field upgrade curve.
 * A run seeds battleUpgrades from forgeUpgrades, so Forge level N must equal
 * N in-run Field purchases — same value AND same next-cost.
 */

import { describe, it, expect } from 'vitest';
import { GameEngine } from '../engine/GameEngine';
import { UpgradeId, LabId, BlueprintId } from '../engine/gameTypes';
import { getBattleUpgradeCost } from '../balance/battleUpgrades';
import { migrateSave } from '../save/migrations';
import { WorkshopUpgradeId } from '../engine/gameTypes';

function engineWithForge(forge: Partial<Record<UpgradeId, number>>, blueprints: BlueprintId[] = [], labLevels: Partial<Record<LabId, number>> = {}) {
	const e = new GameEngine();
	// startRun(workshop, forge, labLevels, startingCoins, blueprints, tier, …)
	e.startRun({}, forge, labLevels, 1000, blueprints, 1);
	return e;
}

function engineFresh(blueprints: BlueprintId[] = [], labLevels: Partial<Record<LabId, number>> = {}) {
	const e = new GameEngine();
	e.startRun({}, {}, labLevels, 1000, blueprints, 1);
	return e;
}

describe('Forge sets the starting level of the shared Field curve', () => {
	it('Max HP: Forge level 1 == one in-run Max HP purchase', () => {
		const forge = engineWithForge({ [UpgradeId.MaxHp]: 1 });
		expect(forge.state.tower.maxHp).toBe(200);

		const run = engineFresh();
		expect(run.state.tower.maxHp).toBe(100);
		run.buyBattleUpgrade(UpgradeId.MaxHp);
		expect(run.state.tower.maxHp).toBe(forge.state.tower.maxHp);
	});

	it('Damage: Forge level 1 == one in-run Damage purchase', () => {
		const forge = engineWithForge({ [UpgradeId.Damage]: 1 });
		expect(forge.state.tower.stats.damage).toBeCloseTo(75, 5);

		const run = engineFresh();
		expect(run.state.tower.stats.damage).toBeCloseTo(50, 5);
		run.buyBattleUpgrade(UpgradeId.Damage);
		expect(run.state.tower.stats.damage).toBeCloseTo(forge.state.tower.stats.damage, 5);
	});

	it('Attack Speed: Forge level 1 == one in-run Attack Speed purchase', () => {
		const forge = engineWithForge({ [UpgradeId.FireRate]: 1 });
		expect(forge.state.tower.stats.fireRate).toBeCloseTo(1.1, 5);

		const run = engineFresh();
		run.buyBattleUpgrade(UpgradeId.FireRate);
		expect(run.state.tower.stats.fireRate).toBeCloseTo(forge.state.tower.stats.fireRate, 5);
	});

	it('Range: Forge level 1 == one in-run Range purchase', () => {
		const forge = engineWithForge({ [UpgradeId.Range]: 1 }, [BlueprintId.ExtendedCoreOptics]);
		expect(forge.state.tower.stats.range).toBeCloseTo(182, 5);

		const run = engineFresh([BlueprintId.ExtendedCoreOptics]);
		expect(run.state.tower.stats.range).toBeCloseTo(180, 5);
		run.buyBattleUpgrade(UpgradeId.Range);
		expect(run.state.tower.stats.range).toBeCloseTo(forge.state.tower.stats.range, 5);
	});

	it('Crit Multiplier: Forge level 0 starts at ×1.30', () => {
		const run = engineFresh();
		expect(run.state.tower.stats.critMultiplier).toBeCloseTo(1.30, 5);
	});

	it('Crit Multiplier: Forge level 1 == one in-run Crit Multiplier purchase', () => {
		const forge = engineWithForge({ [UpgradeId.CritMultiplier]: 1 });
		expect(forge.state.tower.stats.critMultiplier).toBeCloseTo(1.40, 5);

		const run = engineFresh();
		run.buyBattleUpgrade(UpgradeId.CritMultiplier);
		expect(run.state.tower.stats.critMultiplier).toBeCloseTo(forge.state.tower.stats.critMultiplier, 5);
	});

	it('Crit Chance: Forge level 1 == one in-run Crit Chance purchase', () => {
		const forge = engineWithForge({ [UpgradeId.CritChance]: 1 });
		const run = engineFresh();
		run.buyBattleUpgrade(UpgradeId.CritChance);
		expect(run.state.tower.stats.critChance).toBeCloseTo(forge.state.tower.stats.critChance, 5);
	});
});

describe('In-run cost continues from the Forge level', () => {
	it('after Forge Damage level 3, the next in-run buy costs the total level-3 price', () => {
		const e = engineWithForge({ [UpgradeId.Damage]: 3 });
		expect(e.state.battleUpgrades[UpgradeId.Damage]).toBe(3);
		const expectedCost = getBattleUpgradeCost(UpgradeId.Damage, 3);
		const cashBefore = e.state.cash;
		const ok = e.buyBattleUpgrade(UpgradeId.Damage);
		expect(ok).toBe(true);
		expect(cashBefore - e.state.cash).toBe(expectedCost);
		expect(e.state.battleUpgrades[UpgradeId.Damage]).toBe(4);
	});

	it('a fresh run pays the level-0 price (Forge level 0)', () => {
		const e = engineFresh();
		const expectedCost = getBattleUpgradeCost(UpgradeId.Damage, 0);
		const cashBefore = e.state.cash;
		e.buyBattleUpgrade(UpgradeId.Damage);
		expect(cashBefore - e.state.cash).toBe(expectedCost);
	});
});

describe('Research/Lab modifiers apply on top of the shared Forge/Field level', () => {
	it('lab Health Research multiplies the Forge-seeded HP, and Forge still equals in-run', () => {
		const noLab = engineWithForge({ [UpgradeId.MaxHp]: 1 });
		const withLab = engineWithForge({ [UpgradeId.MaxHp]: 1 }, [], { [LabId.HealthResearch]: 3 });
		// Research stacks on top — does not replace the level scaling.
		expect(withLab.state.tower.maxHp).toBeGreaterThan(noLab.state.tower.maxHp);

		const run = engineFresh([], { [LabId.HealthResearch]: 3 });
		run.buyBattleUpgrade(UpgradeId.MaxHp);
		expect(run.state.tower.maxHp).toBe(withLab.state.tower.maxHp);
	});
});

describe('v14→v15 migration wipes combat Forge, keeps economy, no crash', () => {
	it('strips legacy combat workshop levels and initializes empty forgeUpgrades', () => {
		const legacy: Record<string, unknown> = {
			schemaVersion: 14,
			lastUpdated: Date.now(),
			totalRuns: 1,
			highestWave: 30,
			totalCoins: 500,
			workshopUpgrades: {
				baseDamage: 10,        // legacy combat — should be stripped
				startingHp: 25,        // legacy combat — should be stripped
				coinBonus: 7,          // economy — should be kept
				energyBonus: 3,        // economy — should be kept
				startingEnergy: 4,     // economy — should be kept
			},
			labLevels: {},
		};
		const migrated = migrateSave(legacy);
		expect(migrated).not.toBeNull();
		expect(migrated!.schemaVersion).toBe(15);
		// Combat Forge investment wiped (no refund), forgeUpgrades empty.
		expect(migrated!.forgeUpgrades).toEqual({});
		// Economy Forge upgrades preserved.
		expect(migrated!.workshopUpgrades[WorkshopUpgradeId.CoinBonus]).toBe(7);
		expect(migrated!.workshopUpgrades[WorkshopUpgradeId.EnergyBonus]).toBe(3);
		expect(migrated!.workshopUpgrades[WorkshopUpgradeId.StartingEnergy]).toBe(4);
		// Legacy combat keys gone.
		expect((migrated!.workshopUpgrades as Record<string, number>).baseDamage).toBeUndefined();
		expect((migrated!.workshopUpgrades as Record<string, number>).startingHp).toBeUndefined();
	});
});
