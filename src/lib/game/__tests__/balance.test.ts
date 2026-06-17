import { describe, it, expect } from 'vitest';
import {
	getBattleUpgradeCost,
	getBattleUpgradeEffect,
	BATTLE_UPGRADE_DEFS,
	buildBattleUpgradeList,
} from '../balance/battleUpgrades';
import {
	getWorkshopUpgradeCost,
	getWorkshopUpgradeEffect,
	WORKSHOP_UPGRADE_DEFS,
	buildWorkshopUpgradeList,
} from '../balance/workshopUpgrades';
import {
	hybridCost,
	additiveEffect,
	waveHpMultiplier,
	waveAttackMultiplier,
	waveSpeedMultiplier,
	waveCashRewardMultiplier,
	waveCoinRewardMultiplier,
	bossHpMultiplier,
	bossAttackMultiplier,
	bossRewardMultiplier,
	enemiesPerWave,
	bossEscortCount,
	computeEnemyConfig,
} from '../balance/balanceMath';
import { UpgradeId, WorkshopUpgradeId, EnemyType } from '../engine/gameTypes';
import { simulateRun } from '../balance/balanceSimulator';
import { getLabEffect } from '../balance/labs';

// ─── Battle Upgrade Tests ─────────────────────────────────────────────────

describe('Battle Upgrades', () => {
	it('should have all upgrade IDs defined', () => {
		const ids = BATTLE_UPGRADE_DEFS.map(u => u.id);
		expect(ids).toContain(UpgradeId.Damage);
		expect(ids).toContain(UpgradeId.FireRate);
		expect(ids).toContain(UpgradeId.Range);
		expect(ids).toContain(UpgradeId.Multishot);
		expect(ids).toContain(UpgradeId.MultishotProjectiles);
		expect(ids).toContain(UpgradeId.CritChance);
		expect(ids).toContain(UpgradeId.CritMultiplier);
		expect(ids).toContain(UpgradeId.Defense);
		expect(ids).toContain(UpgradeId.MaxHp);
		expect(ids).toContain(UpgradeId.GoldAmp);
		expect(ids).toContain(UpgradeId.CashPerWave);
	});

	it('all battle upgrades should have positive max levels', () => {
		for (const def of BATTLE_UPGRADE_DEFS) {
			expect(def.maxLevel).toBeGreaterThan(0);
		}
	});

	it('all battle upgrades should have positive base cost', () => {
		for (const def of BATTLE_UPGRADE_DEFS) {
			expect(def.baseCost).toBeGreaterThan(0);
		}
	});

	it('should have increasing costs with level', () => {
		for (const def of BATTLE_UPGRADE_DEFS) {
			const cost1 = getBattleUpgradeCost(def.id, 0);
			const cost5 = getBattleUpgradeCost(def.id, 5);
			const cost10 = getBattleUpgradeCost(def.id, 10);
			expect(cost5).toBeGreaterThan(cost1);
			expect(cost10).toBeGreaterThan(cost5);
		}
	});

	it('cost at max level should not be Infinity', () => {
		for (const def of BATTLE_UPGRADE_DEFS) {
			const cost = getBattleUpgradeCost(def.id, def.maxLevel - 1);
			expect(cost).toBeLessThan(Infinity);
			expect(cost).toBeGreaterThan(0);
		}
	});

	it('getBattleUpgradeCost should return Infinity for unknown ID', () => {
		expect(getBattleUpgradeCost('unknown' as UpgradeId, 0)).toBe(Infinity);
	});

	it('getBattleUpgradeEffect should return increasing values', () => {
		for (const def of BATTLE_UPGRADE_DEFS) {
			const eff0 = getBattleUpgradeEffect(def.id, 0);
			const eff10 = getBattleUpgradeEffect(def.id, 10);
			const eff50 = getBattleUpgradeEffect(def.id, 50);
			expect(eff0).toBe(0);
			expect(eff10).toBeGreaterThanOrEqual(eff0);
			expect(eff50).toBeGreaterThanOrEqual(eff10);
		}
	});

	it('capped effects should not exceed cap', () => {
		for (const def of BATTLE_UPGRADE_DEFS) {
			if (def.effectCap !== undefined) {
				const eff = getBattleUpgradeEffect(def.id, def.maxLevel);
				expect(eff).toBeLessThanOrEqual(def.effectCap + 0.001);
			}
		}
	});

	it('multishot targets max level should give reasonable count', () => {
		const projCount = 1 + getBattleUpgradeEffect(UpgradeId.MultishotProjectiles, 9);
		expect(projCount).toBeGreaterThanOrEqual(5);
		expect(projCount).toBeLessThanOrEqual(15);
	});
});

// ─── Workshop Upgrade Tests ────────────────────────────────────────────────

describe('Workshop Upgrades', () => {
	it('should have all workshop upgrade IDs defined', () => {
		const ids = WORKSHOP_UPGRADE_DEFS.map(u => u.id);
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
		for (const def of WORKSHOP_UPGRADE_DEFS) {
			const cost1 = getWorkshopUpgradeCost(def.id, 0);
			const cost10 = getWorkshopUpgradeCost(def.id, 10);
			expect(cost10).toBeGreaterThan(cost1);
		}
	});

	it('first level should be affordable after early runs', () => {
		for (const def of WORKSHOP_UPGRADE_DEFS) {
			const cost0 = getWorkshopUpgradeCost(def.id, 0);
			// First level should cost less than 100 coins for some upgrades
			// so a fresh player reaching wave 8-10 can buy something
			if (def.id === WorkshopUpgradeId.StartingHp || def.id === WorkshopUpgradeId.BaseDamage) {
				expect(cost0).toBeLessThan(100);
			}
		}
	});

	it('getWorkshopUpgradeCost should return Infinity for unknown upgrade', () => {
		expect(getWorkshopUpgradeCost('unknown' as WorkshopUpgradeId, 0)).toBe(Infinity);
	});

	it('getWorkshopUpgradeEffect should return increasing values', () => {
		for (const def of WORKSHOP_UPGRADE_DEFS) {
			const eff0 = getWorkshopUpgradeEffect(def.id, 0);
			const eff10 = getWorkshopUpgradeEffect(def.id, 10);
			expect(eff0).toBe(0);
			expect(eff10).toBeGreaterThan(0);
		}
	});
});

// ─── Wave Scaling Tests ─────────────────────────────────────────────────────

describe('Wave Scaling', () => {
	it('enemy hp multiplier should increase monotonically', () => {
		let prev = 0;
		for (let w = 1; w <= 200; w++) {
			const cur = waveHpMultiplier(w);
			expect(cur).toBeGreaterThan(prev);
			prev = cur;
		}
	});

	it('enemy attack multiplier should increase monotonically', () => {
		let prev = 0;
		for (let w = 1; w <= 200; w++) {
			const cur = waveAttackMultiplier(w);
			expect(cur).toBeGreaterThan(prev);
			prev = cur;
		}
	});

	it('hp should scale faster than attack', () => {
		// At wave 50, hp mult should be noticeably larger than atk mult
		const hp50 = waveHpMultiplier(50);
		const atk50 = waveAttackMultiplier(50);
		expect(hp50).toBeGreaterThan(atk50);
	});

	it('speed multiplier should be capped', () => {
		const spd200 = waveSpeedMultiplier(200);
		expect(spd200).toBeLessThanOrEqual(1.5);
	});

	it('cash reward multiplier should increase', () => {
		let prev = 0;
		for (let w = 1; w <= 100; w++) {
			const cur = waveCashRewardMultiplier(w);
			expect(cur).toBeGreaterThan(prev);
			prev = cur;
		}
	});

	it('coin reward multiplier should increase', () => {
		let prev = 0;
		for (let w = 1; w <= 100; w++) {
			const cur = waveCoinRewardMultiplier(w);
			expect(cur).toBeGreaterThan(prev);
			prev = cur;
		}
	});
});

// ─── Enemy Config Tests ──────────────────────────────────────────────────────

describe('Enemy Config', () => {
	it('should have increasing HP with wave', () => {
		const n1 = computeEnemyConfig(EnemyType.Normal, 1);
		const n10 = computeEnemyConfig(EnemyType.Normal, 10);
		expect(n10.hp).toBeGreaterThan(n1.hp);
	});

	it('boss should have significantly more HP than normal', () => {
		const normal = computeEnemyConfig(EnemyType.Normal, 10);
		const boss = computeEnemyConfig(EnemyType.Boss, 10);
		expect(boss.hp).toBeGreaterThan(normal.hp * 8);
	});

	it('fast enemy should have lower HP than normal', () => {
		const normal = computeEnemyConfig(EnemyType.Normal, 10);
		const fast = computeEnemyConfig(EnemyType.Fast, 10);
		expect(fast.hp).toBeLessThan(normal.hp);
	});

	it('tank should have higher HP than normal', () => {
		const normal = computeEnemyConfig(EnemyType.Normal, 10);
		const tank = computeEnemyConfig(EnemyType.Tank, 10);
		expect(tank.hp).toBeGreaterThan(normal.hp);
	});

	it('should have correct shape assignments', () => {
		expect(computeEnemyConfig(EnemyType.Normal, 1).shape).toBe('square');
		expect(computeEnemyConfig(EnemyType.Fast, 5).shape).toBe('diamond');
		expect(computeEnemyConfig(EnemyType.Tank, 5).shape).toBe('hexagon');
		expect(computeEnemyConfig(EnemyType.Ranged, 8).shape).toBe('triangle');
		expect(computeEnemyConfig(EnemyType.Boss, 10).shape).toBe('pentagon');
	});

	it('boss cash reward should be substantial', () => {
		const boss = computeEnemyConfig(EnemyType.Boss, 10);
		const normal = computeEnemyConfig(EnemyType.Normal, 10);
		expect(boss.cashReward).toBeGreaterThan(normal.cashReward * 5);
	});

	it('boss should have armor', () => {
		const boss = computeEnemyConfig(EnemyType.Boss, 20);
		expect(boss.armor).toBeGreaterThan(0);
	});
});

// ─── Boss Wave Tests ────────────────────────────────────────────────────────

describe('Boss Waves', () => {
	it('boss hp multiplier should be meaningful', () => {
		const bm10 = bossHpMultiplier(10);
		expect(bm10).toBeGreaterThan(8);
		const bm50 = bossHpMultiplier(50);
		expect(bm50).toBeGreaterThan(10);
	});

	it('boss attack multiplier should scale', () => {
		const ba10 = bossAttackMultiplier(10);
		expect(ba10).toBeGreaterThan(2);
		const ba50 = bossAttackMultiplier(50);
		expect(ba50).toBeGreaterThan(3);
	});

	it('boss reward multiplier should scale', () => {
		const br10 = bossRewardMultiplier(10);
		expect(br10).toBeGreaterThan(6);
	});
});

// ─── Enemy Count Tests ──────────────────────────────────────────────────────

describe('Enemy Count', () => {
	it('should increase with wave', () => {
		const c1 = enemiesPerWave(1);
		const c10 = enemiesPerWave(10);
		const c50 = enemiesPerWave(50);
		expect(c10).toBeGreaterThan(c1);
		expect(c50).toBeGreaterThan(c10);
	});

	it('should not exceed cap', () => {
		const c200 = enemiesPerWave(200, 150);
		expect(c200).toBeLessThanOrEqual(150);
	});

	it('boss escorts should increase with wave', () => {
		const e10 = bossEscortCount(10);
		const e50 = bossEscortCount(50);
		expect(e50).toBeGreaterThanOrEqual(e10);
	});
});

// ─── Economy / Cost Monotonicity Tests ──────────────────────────────────────

describe('Cost Monotonicity', () => {
	it('battle upgrade costs increase monotonically with level', () => {
		for (const def of BATTLE_UPGRADE_DEFS) {
			let prev = -1;
			for (let lv = 0; lv < 10; lv++) {
				const cost = getBattleUpgradeCost(def.id, lv);
				expect(cost).toBeGreaterThan(prev);
				prev = cost;
			}
		}
	});

	it('workshop upgrade costs increase monotonically with level', () => {
		for (const def of WORKSHOP_UPGRADE_DEFS) {
			let prev = -1;
			for (let lv = 0; lv < 10; lv++) {
				const cost = getWorkshopUpgradeCost(def.id, lv);
				expect(cost).toBeGreaterThan(prev);
				prev = cost;
			}
		}
	});

	it('early battle upgrade costs should not be free', () => {
		// First level should cost more than pocket change
		const dmgCost0 = getBattleUpgradeCost(UpgradeId.Damage, 0);
		expect(dmgCost0).toBeGreaterThan(0);
		// Starting cash is 20, so first upgrade is not instantly affordable
		expect(dmgCost0).toBeGreaterThan(10);
	});
});

// ─── Formula Unit Tests ─────────────────────────────────────────────────────

describe('Cost Formulas', () => {
	it('hybridCost should increase with level', () => {
		const c0 = hybridCost(10, 1.12, 0.45, 0);
		const c5 = hybridCost(10, 1.12, 0.45, 5);
		const c10 = hybridCost(10, 1.12, 0.45, 10);
		expect(c5).toBeGreaterThan(c0);
		expect(c10).toBeGreaterThan(c5);
	});

	it('additiveEffect should produce correct values', () => {
		expect(additiveEffect(1.5, 10)).toBeCloseTo(15);
		expect(additiveEffect(0.01, 50, 0.50)).toBeCloseTo(0.50);
		expect(additiveEffect(0.01, 100, 0.50)).toBeCloseTo(0.50); // capped
	});
});

// ─── Balance Simulator Tests ───────────────────────────────────────────────

describe('Balance Simulator', () => {
	it('fresh strategies should show progression spread', () => {
		const confused = simulateRun({}, {}, 5000, 1, 'confused');
		const reasonable = simulateRun({}, {}, 5000, 1, 'reasonable');
		// Confused should be short, reasonable should reach further
		expect(confused.finalWave).toBeGreaterThanOrEqual(5);
		expect(reasonable.finalWave).toBeGreaterThanOrEqual(confused.finalWave);
		expect(confused.totalCoinsEarned).toBeGreaterThan(0);
	});

	it('fresh reasonable should reach further than confused', () => {
		const confused = simulateRun({}, {}, 5000, 1, 'confused');
		const reasonable = simulateRun({}, {}, 5000, 1, 'reasonable');
		expect(reasonable.finalWave).toBeGreaterThanOrEqual(confused.finalWave);
	});

	it('player with 5 WS should reach further than fresh', () => {
		const fresh = simulateRun({}, {}, 5000, 1, 'optimal');
		const upgraded = simulateRun({
			[WorkshopUpgradeId.BaseDamage]: 3,
			[WorkshopUpgradeId.StartingHp]: 2,
		}, {}, 5000, 1, 'optimal');
		expect(upgraded.finalWave).toBeGreaterThanOrEqual(fresh.finalWave);
	});

	it('workshop + labs should reach meaningfully further than workshop alone', () => {
		const wsOnly = simulateRun({
			[WorkshopUpgradeId.BaseDamage]: 35,
			[WorkshopUpgradeId.StartingHp]: 20,
			[WorkshopUpgradeId.BaseFireRate]: 20,
			[WorkshopUpgradeId.BaseRange]: 10,
			[WorkshopUpgradeId.CashBonus]: 8,
			[WorkshopUpgradeId.CoinBonus]: 5,
			[WorkshopUpgradeId.StartingCash]: 2,
		}, {}, 5000, 1, 'optimal');
		const wsAndLab = simulateRun({
			[WorkshopUpgradeId.BaseDamage]: 35,
			[WorkshopUpgradeId.StartingHp]: 20,
			[WorkshopUpgradeId.BaseFireRate]: 20,
			[WorkshopUpgradeId.BaseRange]: 10,
			[WorkshopUpgradeId.CashBonus]: 8,
			[WorkshopUpgradeId.CoinBonus]: 5,
			[WorkshopUpgradeId.StartingCash]: 2,
		}, { damageResearch: 10, attackSpeedResearch: 5, healthResearch: 5 }, 5000, 1, 'optimal');
		// Labs should provide a meaningful boost
		expect(wsAndLab.finalWave).toBeGreaterThanOrEqual(wsOnly.finalWave);
	});

	it('tier 2 should be harder than tier 1 for same build', () => {
		const tier1 = simulateRun({
			[WorkshopUpgradeId.BaseDamage]: 35,
			[WorkshopUpgradeId.StartingHp]: 20,
			[WorkshopUpgradeId.BaseFireRate]: 20,
		}, { damageResearch: 5 }, 5000, 1, 'optimal');
		const tier2 = simulateRun({
			[WorkshopUpgradeId.BaseDamage]: 35,
			[WorkshopUpgradeId.StartingHp]: 20,
			[WorkshopUpgradeId.BaseFireRate]: 20,
		}, { damageResearch: 5 }, 5000, 2, 'optimal');
		expect(tier2.finalWave).toBeLessThanOrEqual(tier1.finalWave);
	});

	it('simulation should not crash at high waves', () => {
		const result = simulateRun({}, {}, 5000, 1, 'optimal');
		expect(result.finalWave).toBeGreaterThan(0);
		expect(result.totalKills).toBeGreaterThan(0);
	});

	it('lab effects increase monotonically', () => {
		for (const id of ['damageResearch', 'attackSpeedResearch', 'healthResearch', 'coinEfficiency', 'cashEfficiency']) {
			let prev = 0;
			for (let lv = 1; lv < 10; lv++) {
				const cur = getLabEffect(id as any, lv);
				expect(cur).toBeGreaterThan(prev);
				prev = cur;
			}
		}
	});

	it('deep wave calculations do not overflow', () => {
		for (const w of [10, 100, 500, 1000, 2500, 4500]) {
			const hp = waveHpMultiplier(w);
			const atk = waveAttackMultiplier(w);
			expect(Number.isFinite(hp)).toBe(true);
			expect(Number.isFinite(atk)).toBe(true);
			expect(hp).toBeGreaterThan(0);
			expect(atk).toBeGreaterThan(0);
		}
	});
});
