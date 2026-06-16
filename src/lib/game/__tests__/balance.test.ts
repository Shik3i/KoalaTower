import { describe, it, expect } from 'vitest';
import { BATTLE_UPGRADES, getBattleUpgradeCost, getBattleUpgradeEffect } from '../balance/battleUpgrades';
import { WORKSHOP_UPGRADES, getWorkshopUpgradeCost, getWorkshopUpgradeEffect } from '../balance/workshopUpgrades';
import { UpgradeId, WorkshopUpgradeId } from '../engine/gameTypes';

describe('Battle Upgrades', () => {
	it('should have all upgrade IDs defined', () => {
		const ids = BATTLE_UPGRADES.map(u => u.id);
		expect(ids).toContain(UpgradeId.Damage);
		expect(ids).toContain(UpgradeId.FireRate);
		expect(ids).toContain(UpgradeId.Range);
		expect(ids).toContain(UpgradeId.Multishot);
		expect(ids).toContain(UpgradeId.CritChance);
		expect(ids).toContain(UpgradeId.Defense);
		expect(ids).toContain(UpgradeId.MaxHp);
	});

	it('should have increasing costs with level', () => {
		for (const upgrade of BATTLE_UPGRADES) {
			const cost1 = upgrade.cost(0);
			const cost5 = upgrade.cost(5);
			const cost10 = upgrade.cost(10);
			expect(cost5).toBeGreaterThan(cost1);
			expect(cost10).toBeGreaterThan(cost5);
		}
	});

	it('getBattleUpgradeCost should match upgrade cost function', () => {
		const cost = getBattleUpgradeCost(UpgradeId.Damage, 5);
		const upgrade = BATTLE_UPGRADES.find(u => u.id === UpgradeId.Damage);
		expect(cost).toBe(upgrade!.cost(5));
	});

	it('getBattleUpgradeEffect should return correct values', () => {
		expect(getBattleUpgradeEffect(UpgradeId.Damage, 10)).toBe(50);
		expect(getBattleUpgradeEffect(UpgradeId.CritChance, 5)).toBeCloseTo(0.1);
		expect(getBattleUpgradeEffect(UpgradeId.Multishot, 3)).toBe(3);
	});
});

describe('Workshop Upgrades', () => {
	it('should have all workshop upgrade IDs defined', () => {
		const ids = WORKSHOP_UPGRADES.map(u => u.id);
		expect(ids).toContain(WorkshopUpgradeId.BaseDamage);
		expect(ids).toContain(WorkshopUpgradeId.BaseFireRate);
		expect(ids).toContain(WorkshopUpgradeId.BaseRange);
		expect(ids).toContain(WorkshopUpgradeId.StartingHp);
		expect(ids).toContain(WorkshopUpgradeId.CoinBonus);
		expect(ids).toContain(WorkshopUpgradeId.CashBonus);
		expect(ids).toContain(WorkshopUpgradeId.CritBonus);
		expect(ids).toContain(WorkshopUpgradeId.StartingCash);
	});

	it('should have increasing costs with level', () => {
		for (const upgrade of WORKSHOP_UPGRADES) {
			const cost1 = upgrade.cost(0);
			const cost10 = upgrade.cost(10);
			expect(cost10).toBeGreaterThan(cost1);
		}
	});

	it('getWorkshopUpgradeCost should return Infinity for unknown upgrade', () => {
		expect(getWorkshopUpgradeCost('unknown' as WorkshopUpgradeId, 0)).toBe(Infinity);
	});
});

describe('Economy Scaling', () => {
	it('workshop costs should scale exponentially', () => {
		const upgrade = WORKSHOP_UPGRADES[0]!;
		const ratios: number[] = [];
		for (let i = 1; i < 10; i++) {
			ratios.push(upgrade.cost(i) / upgrade.cost(i - 1));
		}
		const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
		expect(avgRatio).toBeGreaterThan(1.2);
		expect(avgRatio).toBeLessThan(2.0);
	});

	it('battle upgrade costs should scale exponentially', () => {
		const upgrade = BATTLE_UPGRADES[0]!;
		const ratios: number[] = [];
		for (let i = 1; i < 10; i++) {
			ratios.push(upgrade.cost(i) / upgrade.cost(i - 1));
		}
		const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
		expect(avgRatio).toBeGreaterThan(1.15);
		expect(avgRatio).toBeLessThan(2.0);
	});
});
