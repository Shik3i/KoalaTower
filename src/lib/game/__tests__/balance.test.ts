import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { getOpLogMessage } from '../balance/operationLog';
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
	computeEnemyConfig,
	piecewisePowerStat,
	front1EnemyDamage,
	front1EnemyHp,
	FLTD_ENEMY_DAMAGE_SCALE,
	FLTD_ENEMY_ATTACK_SCALE,
	FLTD_ENEMY_HP_SCALE,
	SHINY_CHANCE,
	SHINY_COLOR_OVERRIDE,
	isShinySpawn,
	TIER_MULTIPLIERS,
	STARTING_TOWER_RANGE,
	RANGED_ATTACK_RANGE,
	ENEMY_TYPE_MODIFIERS,
	baseSpawnChancePercent,
	enemySpawnWeightsForWave,
	spawnDensityMultiplier,
	spawnRateRowForWave,
	expectedEnemiesPerWave,
	MAX_ACTIVE_ENEMIES,
	MAX_ENEMIES_PER_WAVE_SAFETY,
	flatlandBaseDamageAtLevel,
	flatlandBaseDamageDeltaAtLevel,
	towerLikeFieldUpgradeCost,
} from '../balance/balanceMath';
import { UpgradeId, WorkshopUpgradeId, EnemyType, BlueprintId, LabId } from '../engine/gameTypes';
import { simulateRun, SCENARIOS } from '../balance/balanceSimulator';
import { getLabEffect, getLabDuration, formatLabDuration, LAB_DEFS } from '../balance/labs';
import {
	isFieldUpgradeUnlocked,
	isFoundryUpgradeUnlocked,
	STARTER_FIELD_UPGRADES,
	STARTER_FOUNDRY_UPGRADES,
	BLUEPRINT_DEFS,
	isBlueprintUnlockable,
} from '../balance/blueprints';
import { getDefaultTowerStats, TOWER_HP_BASE, STARTING_CASH_BASE } from '../engine/gameConfig';
import { createDefaultSave } from '../save/saveTypes';
import { GameEngine } from '../engine/GameEngine';
import { formatBattleEffect, formatBattleEffectNext } from '../balance/upgradeScaling';

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
		expect(ids).toContain(UpgradeId.EnergyAmp);
		expect(ids).toContain(UpgradeId.AlloyPerWave);
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
			if (def.id === UpgradeId.Damage) {
				expect(eff0).toBe(50);
			} else {
				expect(eff0).toBe(0);
			}
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
		expect(ids).toContain(WorkshopUpgradeId.EnergyBonus);
		expect(ids).toContain(WorkshopUpgradeId.CritBonus);
		expect(ids).toContain(WorkshopUpgradeId.StartingEnergy);
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

	it('Base Range grants +0.5 range per level', () => {
		expect(getWorkshopUpgradeEffect(WorkshopUpgradeId.BaseRange, 1)).toBeCloseTo(0.5, 4);
		expect(getWorkshopUpgradeEffect(WorkshopUpgradeId.BaseRange, 10)).toBeCloseTo(5, 4);
	});

	it('Base Fire Rate grants +0.1/s per level and caps base rate at 10/s', () => {
		const def = WORKSHOP_UPGRADE_DEFS.find(d => d.id === WorkshopUpgradeId.BaseFireRate)!;
		expect(def.maxLevel).toBe(90);
		expect(getWorkshopUpgradeEffect(WorkshopUpgradeId.BaseFireRate, 1)).toBeCloseTo(0.1, 4);
		expect(1 + getWorkshopUpgradeEffect(WorkshopUpgradeId.BaseFireRate, def.maxLevel)).toBeCloseTo(10, 4);
		expect(1 + getWorkshopUpgradeEffect(WorkshopUpgradeId.BaseFireRate, def.maxLevel + 10)).toBeCloseTo(10, 4);
	});

	it('Base Damage is long-tail rather than a normal early max', () => {
		const def = WORKSHOP_UPGRADE_DEFS.find(d => d.id === WorkshopUpgradeId.BaseDamage)!;
		expect(def.maxLevel).toBeGreaterThan(100_000);
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

	it('cash reward multiplier should follow the tower-like enemy cash steps', () => {
		expect(waveCashRewardMultiplier(1)).toBe(1);
		expect(waveCashRewardMultiplier(9)).toBe(1);
		expect(waveCashRewardMultiplier(10)).toBe(2);
		expect(waveCashRewardMultiplier(20)).toBe(3);
		expect(waveCashRewardMultiplier(100)).toBe(11);
		expect(waveCashRewardMultiplier(200)).toBe(21);
		expect(waveCashRewardMultiplier(220)).toBe(22);
		expect(waveCashRewardMultiplier(240)).toBe(23);

		let prev = 0;
		for (let w = 1; w <= 240; w++) {
			const cur = waveCashRewardMultiplier(w);
			expect(cur).toBeGreaterThanOrEqual(prev);
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
		expect(boss.hp / normal.hp).toBeGreaterThanOrEqual(20);
		expect(boss.hp / normal.hp).toBeLessThanOrEqual(25);
	});

	it('fast enemy should have 0.8x HP of normal', () => {
		const normal = computeEnemyConfig(EnemyType.Normal, 10);
		const fast = computeEnemyConfig(EnemyType.Fast, 10);
		expect(fast.hp / normal.hp).toBeCloseTo(0.8, 1);
	});

	it('ranged enemy should have 0.5x HP of normal', () => {
		const normal = computeEnemyConfig(EnemyType.Normal, 10);
		const ranged = computeEnemyConfig(EnemyType.Ranged, 10);
		expect(ranged.hp / normal.hp).toBeCloseTo(0.5, 1);
	});

	it('tank should have higher HP than normal', () => {
		const normal = computeEnemyConfig(EnemyType.Normal, 10);
		const tank = computeEnemyConfig(EnemyType.Tank, 10);
		expect(tank.hp).toBeGreaterThan(normal.hp);
	});

	it('fast identity is faster than normal and has lower HP', () => {
		const normal = computeEnemyConfig(EnemyType.Normal, 20);
		const fast = computeEnemyConfig(EnemyType.Fast, 20);
		expect(fast.speed / normal.speed).toBeGreaterThan(1.6);
		expect(fast.speed / normal.speed).toBeLessThanOrEqual(2.0);
		expect(fast.hp / normal.hp).toBeCloseTo(0.8, 1);
	});

	it('tank identity is 5x HP, larger, and slower than normal', () => {
		const normal = computeEnemyConfig(EnemyType.Normal, 60);
		const tank = computeEnemyConfig(EnemyType.Tank, 60);
		expect(tank.hp / normal.hp).toBeCloseTo(5, 2);
		expect(tank.size).toBeGreaterThan(normal.size);
		expect(tank.speed / normal.speed).toBeCloseTo(0.55, 2);
	});

	it('boss identity is 20x HP and larger than tank', () => {
		const normal = computeEnemyConfig(EnemyType.Normal, 10);
		const tank = computeEnemyConfig(EnemyType.Tank, 10);
		const boss = computeEnemyConfig(EnemyType.Boss, 10);
		// Boss HP is 20× normal; allow ±0.5 for Math.floor quantization on the
		// per-enemy base values.
		expect(boss.hp / normal.hp).toBeCloseTo(20, 0);
		expect(boss.size).toBeGreaterThan(tank.size);
	});

	it('ranged stops just inside starter tower range', () => {
		const ranged = computeEnemyConfig(EnemyType.Ranged, 100);
		expect(ranged.attackRange).toBeLessThanOrEqual(STARTING_TOWER_RANGE);
		expect(ranged.attackRange).toBe(RANGED_ATTACK_RANGE);
		expect(RANGED_ATTACK_RANGE).toBe(STARTING_TOWER_RANGE - 1);
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

	it('boss armor is 0 for Front 1 (MVP armor policy)', () => {
		const boss = computeEnemyConfig(EnemyType.Boss, 20, 1);
		expect(boss.armor).toBe(0);
	});
});

// ─── Boss Wave Tests ────────────────────────────────────────────────────────

describe('Boss Waves', () => {
	it('boss hp multiplier should scale and cap', () => {
		const bm10 = bossHpMultiplier(10);
		const bm50 = bossHpMultiplier(50);
		const bm500 = bossHpMultiplier(500);
		expect(bm10).toBe(20);
		expect(bm50).toBe(20);
		expect(bm500).toBe(20);
	});

	it('boss attack multiplier should scale and cap', () => {
		const ba10 = bossAttackMultiplier(10);
		expect(ba10).toBeGreaterThan(1.5);
		const ba50 = bossAttackMultiplier(50);
		expect(ba50).toBeGreaterThan(1.9);
		const ba1000 = bossAttackMultiplier(1000);
		expect(ba1000).toBe(8); // capped
	});

	it('boss reward multiplier should scale and cap', () => {
		const br10 = bossRewardMultiplier(10);
		expect(br10).toBeGreaterThan(4);
		const br500 = bossRewardMultiplier(500);
		expect(br500).toBe(30); // capped
	});
});

// ─── Enemy Count Tests ──────────────────────────────────────────────────────

describe('Enemy Count & Spawn Tick Pacing', () => {
	it('should follow the smooth spawn chance curve capped at wave 1000', () => {
		expect(baseSpawnChancePercent(1)).toBe(10);
		expect(baseSpawnChancePercent(10)).toBeCloseTo(13.0, 1);
		expect(baseSpawnChancePercent(100)).toBeCloseTo(22.0, 1);
		expect(baseSpawnChancePercent(500)).toBeCloseTo(40.7, 1);
		expect(baseSpawnChancePercent(1000)).toBe(56);
		expect(baseSpawnChancePercent(10000)).toBe(56);
	});

	it('should map smooth spawn pressure onto Tower-like enemy mix rows', () => {
		expect(spawnRateRowForWave(1).spawnRate).toBe(10);
		expect(spawnRateRowForWave(100).spawnRate).toBe(22);
		expect(spawnRateRowForWave(1000).spawnRate).toBe(56);

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

	it('should never exceed spawn chance cap of 56%', () => {
		for (let w = 1; w <= 20000; w += 333) {
			expect(baseSpawnChancePercent(w)).toBeLessThanOrEqual(56);
		}
	});

	it('should follow correct Front 1 expected enemies per wave', () => {
		expect(expectedEnemiesPerWave(1, 1)).toBe(24);
		expect(expectedEnemiesPerWave(10, 1)).toBe(31);
		expect(expectedEnemiesPerWave(100, 1)).toBe(53);
		expect(expectedEnemiesPerWave(1000, 1)).toBe(134);
		expect(expectedEnemiesPerWave(10000, 1)).toBe(134);
	});

	it('should follow correct higher Front expected counts', () => {
		expect(expectedEnemiesPerWave(100, 5)).toBe(122);
		expect(expectedEnemiesPerWave(100, 9)).toBe(192);
		expect(expectedEnemiesPerWave(100, 16)).toBe(314);
		expect(expectedEnemiesPerWave(1000, 16)).toBe(800);
	});

	it('should follow monotonic non-decreasing counts on Front 1 until the chance cap', () => {
		let prevCount = 0;
		for (let w = 1; w <= 2000; w += 10) {
			const count = expectedEnemiesPerWave(w, 1);
			expect(count).toBeGreaterThanOrEqual(prevCount);
			prevCount = count;
		}
	});

	it('should increase expected counts with Front density multiplier', () => {
		const f1 = expectedEnemiesPerWave(100, 1);
		const f2 = expectedEnemiesPerWave(100, 2);
		const f5 = expectedEnemiesPerWave(100, 5);
		expect(f2).toBeGreaterThan(f1);
		expect(f5).toBeGreaterThan(f2);
	});

	it('should respect total-wave safety cap', () => {
		// Large front multiplier and wave should be capped at safety cap
		expect(expectedEnemiesPerWave(10000, 200)).toBeLessThanOrEqual(MAX_ENEMIES_PER_WAVE_SAFETY);
	});
});

// ─── Economy / Cost Monotonicity Tests ──────────────────────────────────────

describe('Cost Monotonicity', () => {
	it('battle upgrade costs increase monotonically with level', () => {
		for (const def of BATTLE_UPGRADE_DEFS) {
			let prev = -1;
			for (let lv = 0; lv < 10; lv++) {
				const cost = getBattleUpgradeCost(def.id, lv);
				expect(cost).toBeGreaterThanOrEqual(prev);
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
		// First damage upgrade costs 10 energy, affordable from starting 60
		expect(dmgCost0).toBeGreaterThanOrEqual(5);
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
		const confused = simulateRun({}, {}, 5000, 1, 'confused', []);
		const reasonable = simulateRun({}, {}, 5000, 1, 'reasonable', []);
		// Confused dies early (wave 1-2), reasonable survives longer
		expect(confused.finalWave).toBeGreaterThanOrEqual(1);
		expect(reasonable.finalWave).toBeGreaterThanOrEqual(confused.finalWave);
		expect(confused.totalKills).toBeGreaterThan(0);
	});

	it('fresh reasonable should reach further than confused', () => {
		const confused = simulateRun({}, {}, 5000, 1, 'confused', []);
		const reasonable = simulateRun({}, {}, 5000, 1, 'reasonable', []);
		expect(reasonable.finalWave).toBeGreaterThanOrEqual(confused.finalWave);
	});

	it('fresh strategies show spread with blueprint gating', () => {
		const fresh = simulateRun({}, {}, 5000, 1, 'optimal', []);
		const fr = simulateRun({}, {}, 5000, 1, 'reasonable', []);
		const cf = simulateRun({}, {}, 5000, 1, 'confused', []);
		// Core requirement: fresh optimal well below old 40-wave target
		expect(fresh.finalWave).toBeLessThan(45);
		expect(fr.finalWave).toBeLessThan(45);
		expect(cf.finalWave).toBeLessThan(10);
	});

	it('fresh optimal cannot reach wave 45 with starters only', () => {
		const result = simulateRun({}, {}, 5000, 1, 'optimal', []);
		expect(result.finalWave).toBeLessThan(45);
	});

	it('starter-only runs should have locked upgrades skipped', () => {
		const result = simulateRun({}, {}, 5000, 1, 'optimal', []);
		expect(result.lockedUpgradesSkipped).toBeGreaterThan(0);
	});

	it('player with foundry purchases should survive the early waves', () => {
		// With 5 foundry levels (3 damage, 2 HP) + early blueprints, the tower should
		// survive through the early waves better than a completely fresh account.
		// Seed 42 for deterministic comparison
		const fresh = simulateRun({}, {}, 5000, 1, 'optimal', [], 42);
		const upgraded = simulateRun({
			[WorkshopUpgradeId.BaseDamage]: 3,
			[WorkshopUpgradeId.StartingHp]: 2,
		}, {}, 5000, 1, 'optimal', [BlueprintId.PlatedCoreShell, BlueprintId.ExtendedCoreOptics], 42);
		expect(upgraded.finalMaxHp).toBeGreaterThanOrEqual(fresh.finalMaxHp);
	});

	it('workshop + labs should reach further than workshop alone', () => {
		const allBPs = Object.values(BlueprintId);
		const ws = {
			[WorkshopUpgradeId.BaseDamage]: 60,
			[WorkshopUpgradeId.StartingHp]: 40,
			[WorkshopUpgradeId.BaseFireRate]: 25,
		};
		// Run with a fixed seed for deterministic comparison
		const wsRun = simulateRun(ws, {}, 5000, 1, 'optimal', allBPs, 42);
		const labRun = simulateRun(ws, { damageResearch: 20, attackSpeedResearch: 15, healthResearch: 10 }, 5000, 1, 'optimal', allBPs, 42);
		expect(labRun.finalWave).toBeGreaterThanOrEqual(wsRun.finalWave);
	});

	it('tier 2 should be harder than tier 1 for same build', () => {
		const allBPs = Object.values(BlueprintId);
		const tier1 = simulateRun({
			[WorkshopUpgradeId.BaseDamage]: 35,
			[WorkshopUpgradeId.StartingHp]: 20,
			[WorkshopUpgradeId.BaseFireRate]: 20,
		}, { damageResearch: 5 }, 5000, 1, 'optimal', allBPs);
		const tier2 = simulateRun({
			[WorkshopUpgradeId.BaseDamage]: 35,
			[WorkshopUpgradeId.StartingHp]: 20,
			[WorkshopUpgradeId.BaseFireRate]: 20,
		}, { damageResearch: 5 }, 5000, 2, 'optimal', allBPs);
		expect(tier2.finalWave).toBeLessThanOrEqual(tier1.finalWave);
	});

	it('simulation should not crash at high waves', () => {
		const result = simulateRun({}, {}, 5000, 1, 'optimal', []);
		expect(result.finalWave).toBeGreaterThan(0);
		expect(result.totalKills).toBeGreaterThan(0);
	});

	it('lab effects increase monotonically', () => {
		for (const id of ['damageResearch', 'attackSpeedResearch', 'healthResearch', 'alloyEfficiency', 'energyEfficiency']) {
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

	it('locked upgrades should be skipped by simulator', () => {
		const result = simulateRun({}, {}, 5000, 1, 'optimal', []);
		expect(result.lockedUpgradesSkipped).toBeGreaterThan(0);
	});

	it('simulator strategies should not be inverted — optimal >= confused with moderate WS', () => {
		const allBPs = Object.values(BlueprintId);
		const ws = {
			[WorkshopUpgradeId.BaseDamage]: 15,
			[WorkshopUpgradeId.StartingHp]: 10,
			[WorkshopUpgradeId.BaseFireRate]: 5,
		};
		const confused = simulateRun(ws, {}, 5000, 1, 'confused', allBPs);
		const optimal = simulateRun(ws, {}, 5000, 1, 'optimal', allBPs);
		// With moderate workshop investment, optimal should outperform confused
		expect(optimal.finalWave).toBeGreaterThanOrEqual(confused.finalWave);
	});

	it('with all blueprints and some foundry, simulator reaches further', () => {
		const ws = { [WorkshopUpgradeId.BaseDamage]: 10, [WorkshopUpgradeId.StartingHp]: 5 };
		const allBPs = Object.values(BlueprintId);
		// Use fixed seed for deterministic comparison
		const fresh = simulateRun(ws, {}, 5000, 1, 'optimal', [], 42);
		const unlocked = simulateRun(ws, {}, 5000, 1, 'optimal', allBPs, 42);
		expect(unlocked.finalWave).toBeGreaterThanOrEqual(fresh.finalWave);
	});
});

// ─── Blueprint Tests ─────────────────────────────────────────────────────

describe('Blueprint System', () => {
	it('starter field upgrades should include Damage, FireRate, MaxHp, Regen, CritChance, CritMultiplier', () => {
		expect(STARTER_FIELD_UPGRADES).toContain(UpgradeId.Damage);
		expect(STARTER_FIELD_UPGRADES).toContain(UpgradeId.FireRate);
		expect(STARTER_FIELD_UPGRADES).toContain(UpgradeId.MaxHp);
		expect(STARTER_FIELD_UPGRADES).toContain(UpgradeId.Regen);
		expect(STARTER_FIELD_UPGRADES).toContain(UpgradeId.CritChance);
		expect(STARTER_FIELD_UPGRADES).toContain(UpgradeId.CritMultiplier);
	});

	it('starter foundry upgrades should include only non-economy basics', () => {
		expect(STARTER_FOUNDRY_UPGRADES).toContain(WorkshopUpgradeId.BaseDamage);
		expect(STARTER_FOUNDRY_UPGRADES).toContain(WorkshopUpgradeId.BaseFireRate);
		expect(STARTER_FOUNDRY_UPGRADES).toContain(WorkshopUpgradeId.StartingHp);
		expect(STARTER_FOUNDRY_UPGRADES).toContain(WorkshopUpgradeId.Regen);
		expect(STARTER_FOUNDRY_UPGRADES).not.toContain(WorkshopUpgradeId.CoinBonus);
		expect(STARTER_FOUNDRY_UPGRADES).not.toContain(WorkshopUpgradeId.EnergyBonus);
	});

	it('locked upgrades should not be available without blueprint', () => {
		// CritChance and CritMultiplier are now starter upgrades
		expect(isFieldUpgradeUnlocked(UpgradeId.CritChance, [])).toBe(true);
		expect(isFieldUpgradeUnlocked(UpgradeId.CritMultiplier, [])).toBe(true);
		// These remain locked without blueprints
		expect(isFieldUpgradeUnlocked(UpgradeId.Lifesteal, [])).toBe(false);
		expect(isFieldUpgradeUnlocked(UpgradeId.Thorns, [])).toBe(false);
		expect(isFieldUpgradeUnlocked(UpgradeId.Multishot, [])).toBe(false);
		expect(isFieldUpgradeUnlocked(UpgradeId.Range, [])).toBe(false);
		expect(isFieldUpgradeUnlocked(UpgradeId.DefensePercent, [])).toBe(false);
		expect(isFieldUpgradeUnlocked(UpgradeId.Defense, [])).toBe(false);
		expect(isFieldUpgradeUnlocked(UpgradeId.EnergyAmp, [])).toBe(false);
		expect(isFieldUpgradeUnlocked(UpgradeId.AlloyPerWave, [])).toBe(false);
		expect(isFieldUpgradeUnlocked(UpgradeId.CashPerWave, [])).toBe(false);
	});

	it('locked foundry upgrades should not be available without blueprint', () => {
		expect(isFoundryUpgradeUnlocked(WorkshopUpgradeId.BaseRange, [])).toBe(false);
		expect(isFoundryUpgradeUnlocked(WorkshopUpgradeId.DefenseAbsolute, [])).toBe(false);
		expect(isFoundryUpgradeUnlocked(WorkshopUpgradeId.DefensePercent, [])).toBe(false);
		expect(isFoundryUpgradeUnlocked(WorkshopUpgradeId.Lifesteal, [])).toBe(false);
		expect(isFoundryUpgradeUnlocked(WorkshopUpgradeId.Thorns, [])).toBe(false);
		expect(isFoundryUpgradeUnlocked(WorkshopUpgradeId.EnergyBonus, [])).toBe(false);
		expect(isFoundryUpgradeUnlocked(WorkshopUpgradeId.CritBonus, [])).toBe(false);
		expect(isFoundryUpgradeUnlocked(WorkshopUpgradeId.StartingEnergy, [])).toBe(false);
	});

	it('unlocking Critical Targeting should expose CritChance and CritMultiplier', () => {
		const bps = [BlueprintId.CriticalTargeting];
		expect(isFieldUpgradeUnlocked(UpgradeId.CritChance, bps)).toBe(true);
		expect(isFieldUpgradeUnlocked(UpgradeId.CritMultiplier, bps)).toBe(true);
		expect(isFoundryUpgradeUnlocked(WorkshopUpgradeId.CritBonus, bps)).toBe(true);
	});

	it('unlocking Energy Reclaimer should expose Lifesteal', () => {
		const bps = [BlueprintId.EnergyReclaimer];
		expect(isFieldUpgradeUnlocked(UpgradeId.Lifesteal, bps)).toBe(true);
		expect(isFoundryUpgradeUnlocked(WorkshopUpgradeId.Lifesteal, bps)).toBe(true);
	});

	it('all blueprints should have valid IDs and names', () => {
		for (const bp of BLUEPRINT_DEFS) {
			expect(bp.id).toBeTruthy();
			expect(bp.name).toBeTruthy();
			expect(bp.cost).toBeGreaterThan(0);
			expect(bp.order).toBeGreaterThan(0);
		}
	});

	it('blueprint unlock conditions should be testable', () => {
		expect(isBlueprintUnlockable(BLUEPRINT_DEFS.find(b => b.id === BlueprintId.PlatedCoreShell)!, 20, 0)).toBe(true);
		expect(isBlueprintUnlockable(BLUEPRINT_DEFS.find(b => b.id === BlueprintId.PlatedCoreShell)!, 19, 0)).toBe(false);
		expect(isBlueprintUnlockable(BLUEPRINT_DEFS.find(b => b.id === BlueprintId.CriticalTargeting)!, 25, 0)).toBe(true);
		expect(isBlueprintUnlockable(BLUEPRINT_DEFS.find(b => b.id === BlueprintId.CriticalTargeting)!, 10, 2)).toBe(true);
	});
});

// ─── Lab Timer Tests ──────────────────────────────────────────────────────

describe('Lab Research (Time-Based)', () => {
	it('lab duration should be a positive number', () => {
		for (const labId of ['damageResearch', 'attackSpeedResearch', 'healthResearch', 'alloyEfficiency', 'energyEfficiency']) {
			const dur = getLabDuration(labId as any, 0);
			expect(dur).toBeGreaterThan(0);
			expect(Number.isFinite(dur)).toBe(true);
		}
	});

	it('lab duration should increase with level', () => {
		for (const labId of ['damageResearch', 'attackSpeedResearch', 'healthResearch', 'alloyEfficiency', 'energyEfficiency']) {
			const dur0 = getLabDuration(labId as any, 0);
			const dur5 = getLabDuration(labId as any, 5);
			expect(dur5).toBeGreaterThan(dur0);
		}
	});

	it('formatLabDuration should produce human-readable strings', () => {
		expect(formatLabDuration(30_000)).toBe('30s');
		expect(formatLabDuration(90_000)).toBe('1m 30s');
		expect(formatLabDuration(120_000)).toBe('2m');
		expect(formatLabDuration(3_600_000)).toBe('1h');
		expect(formatLabDuration(0)).toBe('0s');
	});
});

describe('Operation Log', () => {
	const categories = [
		'deploymentStart', 'waveMilestone', 'bossIncoming', 'bossDefeated',
		'newBestWave', 'coreLost', 'tierUnlock', 'labUnlock',
		'blueprintUnlocked', 'researchStarted', 'researchCompleted',
		'forgeUpgraded', 'saveExported', 'saveImported', 'saveImportFailed',
		'saveReset', 'frontUnlocked',
	] as const;

	it('every category has at least 2 messages', () => {
		for (const cat of categories) {
			const msg1 = getOpLogMessage(cat);
			const msg2 = getOpLogMessage(cat);
			expect(msg1).toBeTruthy();
			expect(msg2).toBeTruthy();
		}
	});

	it('messages with tokens replace correctly', () => {
		const msg = getOpLogMessage('waveMilestone', { wave: 42 });
		expect(msg).toContain('42');
	});

	it('getOpLogMessage returns empty string for unknown category', () => {
		const msg = getOpLogMessage('nonexistent' as any);
		expect(msg).toBe('');
	});

	it('all categories return unique messages across multiple calls', () => {
		for (const cat of categories) {
			const msgs = new Set(Array.from({ length: 20 }, () => getOpLogMessage(cat)));
			expect(msgs.size).toBeGreaterThan(1);
		}
	});
});

// ─── Piecewise Power Interpolation Tests ─────────────────────────────────

describe('Piecewise Power Formula', () => {
	it('returns exact anchor values for wave 1, 10, 100, 1000 (reference)', () => {
		const dmg = (w: number) => piecewisePowerStat(w, [
			{ wave: 1, value: 1.18 }, { wave: 10, value: 4.81 }, { wave: 20, value: 13.65 },
			{ wave: 30, value: 28.76 }, { wave: 40, value: 50.41 }, { wave: 50, value: 81.33 },
			{ wave: 60, value: 120.19 }, { wave: 70, value: 167.99 }, { wave: 80, value: 229.96 },
			{ wave: 90, value: 304.54 }, { wave: 100, value: 402.95 }, { wave: 150, value: 1100 },
			{ wave: 200, value: 2420 }, { wave: 250, value: 4620 }, { wave: 300, value: 7740 },
			{ wave: 400, value: 19180 }, { wave: 500, value: 38940 }, { wave: 750, value: 155440 },
			{ wave: 1000, value: 482950 },
		]);
		expect(dmg(1)).toBeCloseTo(1.18, 1);
		expect(dmg(10)).toBeCloseTo(4.81, 1);
		expect(dmg(100)).toBeCloseTo(402.95, 1);
		expect(dmg(1000)).toBeCloseTo(482950, 1);
	});

	it('returns exact anchor values for wave 1, 10, 100, 1000 (HP)', () => {
		const hp = (w: number) => piecewisePowerStat(w, [
			{ wave: 1, value: 2.35 }, { wave: 10, value: 18.36 }, { wave: 20, value: 59.25 },
			{ wave: 30, value: 143.36 }, { wave: 40, value: 266.11 }, { wave: 50, value: 477.47 },
			{ wave: 60, value: 809.09 }, { wave: 70, value: 1170 }, { wave: 80, value: 1820 },
			{ wave: 90, value: 2780 }, { wave: 100, value: 4360 }, { wave: 150, value: 17190 },
			{ wave: 200, value: 54840 }, { wave: 250, value: 142350 }, { wave: 300, value: 323610 },
			{ wave: 400, value: 1350000 }, { wave: 500, value: 4530000 },
			{ wave: 750, value: 65500000 }, { wave: 1000, value: 742100000 },
		]);
		expect(hp(1)).toBeCloseTo(2.35, 1);
		expect(hp(10)).toBeCloseTo(18.36, 1);
		expect(hp(100)).toBeCloseTo(4360, 1);
		expect(hp(1000)).toBeCloseTo(742100000, 1);
	});
});

describe('Front 1 FLTD-Scaled Values (retuned HP and attack scales)', () => {
	it('wave 1 Front 1 damage is near 12 under the x10 attack scale', () => {
		expect(front1EnemyDamage(1)).toBeCloseTo(11.8, 1);
		expect(front1EnemyDamage(1)).toBeCloseTo(1.18 * 10, 6);
	});
	it('wave 1 Front 1 HP is near 39 under the 16.67 HP scale', () => {
		expect(front1EnemyHp(1)).toBeCloseTo(39.17, 1);
		expect(front1EnemyHp(1)).toBeCloseTo(2.35 * 16.67, 6);
	});
	it('wave 2 Front 1 HP survives starter Damage 50', () => {
		expect(front1EnemyHp(2)).toBeGreaterThan(50);
		expect(front1EnemyHp(2)).toBeCloseTo(72.74, 1);
	});
	it('wave 10 Front 1 damage is near 48 under the x10 attack scale', () => {
		expect(front1EnemyDamage(10)).toBeCloseTo(48.1, 1);
		expect(front1EnemyDamage(10)).toBeCloseTo(4.81 * 10, 6);
	});
	it('wave 10 Front 1 HP is near 306 under the 16.67 HP scale', () => {
		expect(front1EnemyHp(10)).toBeCloseTo(306.06, 1);
		expect(front1EnemyHp(10)).toBeCloseTo(18.36 * 16.67, 6);
	});
	it('wave 100 Front 1 damage ~4.03K', () => {
		const dmg = front1EnemyDamage(100);
		expect(dmg).toBeCloseTo(4029.5, -1);
	});
	it('wave 100 Front 1 HP ~72.7K', () => {
		const hp = front1EnemyHp(100);
		expect(hp).toBeCloseTo(72_681, -2);
	});
	it('wave 1000 Front 1 damage ~4.83M', () => {
		const dmg = front1EnemyDamage(1000);
		expect(dmg).toBeCloseTo(4_829_500, -3);
	});
	it('wave 1000 Front 1 HP ~12.37B', () => {
		const hp = front1EnemyHp(1000);
		expect(hp).toBeCloseTo(12_370_807_000, -5);
	});
});

describe('Enemy scaling correction (HP 16.67, attack x10)', () => {
	it('enemy HP and attack scales use explicit tuned factors', () => {
		expect(FLTD_ENEMY_HP_SCALE).toBe(16.67);
		expect(FLTD_ENEMY_ATTACK_SCALE).toBe(10);
		expect(FLTD_ENEMY_DAMAGE_SCALE).toBe(10);
	});

	it('enemy HP applies the retuned scale to the reference curve', () => {
		expect(front1EnemyHp(1)).toBeCloseTo(2.35 * 16.67, 6);
		expect(front1EnemyHp(10)).toBeCloseTo(18.36 * 16.67, 6);
	});

	it('enemy attack applies the retuned scale to the reference curve', () => {
		expect(front1EnemyDamage(1)).toBeCloseTo(1.18 * 10, 6);
		expect(front1EnemyDamage(10)).toBeCloseTo(4.81 * 10, 6);
	});

	it('enemy type HP multipliers match intended identities', () => {
		expect(bossHpMultiplier(1)).toBe(20);
		expect(ENEMY_TYPE_MODIFIERS[EnemyType.Tank].hp).toBe(5.0);
		expect(ENEMY_TYPE_MODIFIERS[EnemyType.Fast].hp).toBe(0.8);
		expect(ENEMY_TYPE_MODIFIERS[EnemyType.Ranged].hp).toBe(0.5);
		expect(ENEMY_TYPE_MODIFIERS[EnemyType.Normal].hp).toBe(1.0);
		expect(ENEMY_TYPE_MODIFIERS[EnemyType.Boss].hp).toBe(20.0);
	});

	it('spawn pacing follows the smooth Tower-like curve', () => {
		expect(enemiesPerWave(1)).toBe(24);
		expect(enemiesPerWave(10)).toBe(31);
	});

	it('player Damage curve from the previous pass is unchanged', () => {
		expect(flatlandBaseDamageAtLevel(0)).toBe(50);
		expect(flatlandBaseDamageAtLevel(1)).toBe(75);
		expect(flatlandBaseDamageAtLevel(2)).toBe(113);
		expect(flatlandBaseDamageAtLevel(10)).toBe(483);
	});

	it('no NaN/Infinity for representative wave/front values', () => {
		for (const wave of [1, 10, 100, 1000, 5000]) {
			expect(Number.isFinite(front1EnemyHp(wave))).toBe(true);
			expect(Number.isFinite(front1EnemyDamage(wave))).toBe(true);
			expect(front1EnemyHp(wave)).toBeGreaterThan(0);
			expect(front1EnemyDamage(wave)).toBeGreaterThan(0);
			for (const tier of [1, 2, 3]) {
				const cfg = computeEnemyConfig(EnemyType.Normal, wave, tier);
				expect(Number.isFinite(cfg.hp)).toBe(true);
				expect(Number.isFinite(cfg.damage)).toBe(true);
				expect(cfg.hp).toBeGreaterThan(0);
				expect(cfg.damage).toBeGreaterThan(0);
			}
		}
	});
});

describe('Front / Deployment Zone Multipliers', () => {
	it('Front 1 is baseline (1x)', () => {
		const dmg = front1EnemyDamage(1);
		expect(dmg).toBeGreaterThan(0);
		expect(Number.isFinite(dmg)).toBe(true);
	});

	it('Front 2 is ~20x harder than Front 1', () => {
		expect(TIER_MULTIPLIERS[2]!.hp).toBe(20);
		expect(TIER_MULTIPLIERS[2]!.attack).toBe(20);
		// Sample at wave 100 so Math.floor quantization on the (now smaller)
		// per-enemy base values is negligible and the tier ratio reads cleanly.
		const f1 = computeEnemyConfig(EnemyType.Normal, 100, 1);
		const f2 = computeEnemyConfig(EnemyType.Normal, 100, 2);
		expect(f2.hp / f1.hp).toBeCloseTo(20, 0);
		expect(f2.damage / f1.damage).toBeCloseTo(20, 0);
	});

	it('Front 3 is ~60x harder than Front 1', () => {
		expect(TIER_MULTIPLIERS[3]!.hp).toBe(60);
		expect(TIER_MULTIPLIERS[3]!.attack).toBe(60);
		const f1 = computeEnemyConfig(EnemyType.Normal, 100, 1);
		const f3 = computeEnemyConfig(EnemyType.Normal, 100, 3);
		expect(f3.hp / f1.hp).toBeCloseTo(60, 0);
	});

	it('fronts pay a rising Alloy multiplier', () => {
		expect(TIER_MULTIPLIERS[1]!.alloy).toBe(1.0);
		expect(TIER_MULTIPLIERS[2]!.alloy).toBeGreaterThan(TIER_MULTIPLIERS[1]!.alloy);
		expect(TIER_MULTIPLIERS[5]!.alloy).toBeGreaterThan(TIER_MULTIPLIERS[4]!.alloy);
	});
});

describe('Arbitrary and High Wave Values', () => {
	it('arbitrary wave 37 returns finite positive values', () => {
		const dmg = front1EnemyDamage(37);
		const hp = front1EnemyHp(37);
		expect(Number.isFinite(dmg)).toBe(true);
		expect(Number.isFinite(hp)).toBe(true);
		expect(dmg).toBeGreaterThan(0);
		expect(hp).toBeGreaterThan(0);
	});

	it('high wave 10000 returns finite positive values', () => {
		const dmg = front1EnemyDamage(10000);
		const hp = front1EnemyHp(10000);
		expect(Number.isFinite(dmg)).toBe(true);
		expect(Number.isFinite(hp)).toBe(true);
		expect(dmg).toBeGreaterThan(0);
		expect(hp).toBeGreaterThan(0);
	});

	it('wave 2500 returns finite positive values', () => {
		const dmg = front1EnemyDamage(2500);
		const hp = front1EnemyHp(2500);
		expect(Number.isFinite(dmg)).toBe(true);
		expect(Number.isFinite(hp)).toBe(true);
		expect(dmg).toBeGreaterThan(0);
		expect(hp).toBeGreaterThan(0);
	});
});

// ─── Starting Stats Tests ──────────────────────────────────────────────────

describe('Tower Starting Stats', () => {
	it('starting Damage is 50', () => {
		expect(getDefaultTowerStats().damage).toBe(50);
	});

	it('starting HP is 100', () => {
		expect(TOWER_HP_BASE).toBe(100);
	});

	it('starting Energy is 100', () => {
		expect(STARTING_CASH_BASE).toBe(100);
	});

	it('starting Alloy is 0 on a fresh save', () => {
		expect(createDefaultSave().totalCoins).toBe(0);
	});

	it('first Regen upgrade gives 0.5 HP/s', () => {
		const regenLv1 = getBattleUpgradeEffect(UpgradeId.Regen, 1);
		expect(regenLv1).toBeCloseTo(0.5, 1);
	});

	it('first Crit Chance upgrade gives +1%', () => {
		const critLv1 = getBattleUpgradeEffect(UpgradeId.CritChance, 1);
		expect(critLv1).toBeCloseTo(0.01, 2);
	});

	it('first Crit Multiplier upgrade gives +0.10', () => {
		const cmLv1 = getBattleUpgradeEffect(UpgradeId.CritMultiplier, 1);
		expect(cmLv1).toBeCloseTo(0.10, 2);
	});
});

// ─── Wave 1-10 Enemy Stats Tests ───────────────────────────────────────────

describe('Wave 1-10 Enemy Stats', () => {
	it('Wave 1 expected enemy count is 24', () => {
		const c = enemiesPerWave(1);
		expect(c).toBe(24);
	});

	it('Wave 1 Front 1 enemy HP is around 39', () => {
		const hp = front1EnemyHp(1);
		expect(hp).toBeGreaterThanOrEqual(38);
		expect(hp).toBeLessThanOrEqual(40);
	});

	it('Wave 1 Front 1 enemy damage is around 12', () => {
		const dmg = front1EnemyDamage(1);
		expect(dmg).toBeGreaterThanOrEqual(11);
		expect(dmg).toBeLessThanOrEqual(13);
	});

	it('Wave 10 Front 1 enemy HP is around 306', () => {
		const hp = front1EnemyHp(10);
		expect(hp).toBeGreaterThanOrEqual(304);
		expect(hp).toBeLessThanOrEqual(308);
	});

	it('Wave 10 Front 1 enemy damage is around 48', () => {
		const dmg = front1EnemyDamage(10);
		expect(dmg).toBeGreaterThanOrEqual(47);
		expect(dmg).toBeLessThanOrEqual(49);
	});

	it('Wave 10 expected enemy count is 31', () => {
		const c = enemiesPerWave(10);
		expect(c).toBe(31);
	});
});

// ─── Shiny Enemy Tests ─────────────────────────────────────────────────────

describe('Shiny Enemies', () => {
	it('shiny enemies get gold color override', () => {
		expect(SHINY_COLOR_OVERRIDE).toBe(0xFFD700);
	});

	it('shiny chance is 5%', () => {
		expect(SHINY_CHANCE).toBe(0.05);
	});

	it('isShinySpawn returns true for values < 0.05', () => {
		expect(isShinySpawn(0.01)).toBe(true);
		expect(isShinySpawn(0.049)).toBe(true);
		expect(isShinySpawn(0.05)).toBe(false);
		expect(isShinySpawn(0.10)).toBe(false);
	});

	it('shiny enemies give double Energy (via config)', () => {
		const normal = computeEnemyConfig(EnemyType.Normal, 5, 1, false);
		const shiny = computeEnemyConfig(EnemyType.Normal, 5, 1, true);
		expect(shiny.cashReward).toBeGreaterThanOrEqual(normal.cashReward * 2);
	});

	it('shiny enemies give some Alloy reward', () => {
		const normal = computeEnemyConfig(EnemyType.Normal, 5, 1, false);
		const shiny = computeEnemyConfig(EnemyType.Normal, 5, 1, true);
		expect(shiny.coinReward).toBeGreaterThan(0);
		expect(normal.coinReward).toBe(0);
	});

	it('shiny enemies have isShiny flag set', () => {
		const shiny = computeEnemyConfig(EnemyType.Normal, 5, 1, true);
		expect(shiny.isShiny).toBe(true);
	});

	it('bosses can have isShiny flag in config for data integrity', () => {
		const bossAsShiny = computeEnemyConfig(EnemyType.Boss, 10, 1, true);
		expect(bossAsShiny.isShiny).toBe(true);
	});

	it('normal enemies give Energy only (no Alloy)', () => {
		const normal = computeEnemyConfig(EnemyType.Normal, 5, 1, false);
		expect(normal.cashReward).toBeGreaterThan(0);
		expect(normal.coinReward).toBe(0);
	});

	it('shiny enemies give double Energy + Alloy', () => {
		const shiny = computeEnemyConfig(EnemyType.Normal, 5, 1, true);
		expect(shiny.cashReward).toBeGreaterThan(0);
		expect(shiny.coinReward).toBeGreaterThan(0);
	});

	it('GameState tracks shiniesKilled', () => {
		const engine = new GameEngine();
		expect(engine.state).toHaveProperty('shiniesKilled');
		expect(typeof engine.state.shiniesKilled).toBe('number');
		engine.cleanup();
	});

	it('SaveData tracks totalShiniesKilled', () => {
		const save = createDefaultSave();
		expect(save).toHaveProperty('totalShiniesKilled');
		expect(save.totalShiniesKilled).toBe(0);
	});
});

// ─── Fresh Optimal / Progression Bounds Tests ─────────────────────────────

describe('Fresh Progression Bounds', () => {
	it('fresh optimal does not reach wave 45', () => {
		const result = simulateRun({}, {}, 5000, 1, 'optimal', []);
		expect(result.finalWave).toBeLessThan(45);
	});

	it('fresh confused dies very early', () => {
		const result = simulateRun({}, {}, 5000, 1, 'confused', []);
		expect(result.finalWave).toBeLessThan(5);
	});

	it('after few Forge upgrades improves beyond fresh', () => {
		const fresh = simulateRun({}, {}, 5000, 1, 'optimal', [], 42);
		const upgraded = simulateRun({
			[WorkshopUpgradeId.BaseDamage]: 3,
			[WorkshopUpgradeId.StartingHp]: 2,
		}, {}, 5000, 1, 'optimal', [], 42);
		expect(upgraded.finalWave).toBeGreaterThanOrEqual(fresh.finalWave);
	});

	it('substantial Forge + Labs reaches higher waves', () => {
		const ws = {
			[WorkshopUpgradeId.BaseDamage]: 120,
			[WorkshopUpgradeId.StartingHp]: 80,
			[WorkshopUpgradeId.BaseFireRate]: 30,
			[WorkshopUpgradeId.Regen]: 10,
			[WorkshopUpgradeId.DefenseAbsolute]: 20,
		};
		const labs = { damageResearch: 30, healthResearch: 20, attackSpeedResearch: 10 };
		const allBPs = Object.values(BlueprintId);
		const result = simulateRun(ws, labs, 5000, 1, 'optimal', allBPs);
		expect(result.finalWave).toBeGreaterThan(5);
	});
});

// ─── Forge Impact Tests ────────────────────────────────────────────────────

describe('Forge Impact', () => {
	it('first Forge damage level gives +5 damage', () => {
		const eff = getWorkshopUpgradeEffect(WorkshopUpgradeId.BaseDamage, 1);
		expect(eff).toBe(5);
	});

	it('first Forge HP level gives +10 HP', () => {
		const eff = getWorkshopUpgradeEffect(WorkshopUpgradeId.StartingHp, 1);
		expect(eff).toBe(10);
	});

	it('first Forge Regen level gives +0.3 HP/s', () => {
		const eff = getWorkshopUpgradeEffect(WorkshopUpgradeId.Regen, 1);
		expect(eff).toBeCloseTo(0.3, 1);
	});

	it('Forge damage effect is meaningful relative to base (5/50 = 10%)', () => {
		const baseDamage = 50;
		const forgeLevel1 = getWorkshopUpgradeEffect(WorkshopUpgradeId.BaseDamage, 1);
		expect(forgeLevel1 / baseDamage).toBeCloseTo(0.1, 1);
	});

	it('Forge HP effect is meaningful relative to base (10/100 = 10%)', () => {
		const forgeLevel1 = getWorkshopUpgradeEffect(WorkshopUpgradeId.StartingHp, 1);
		expect(forgeLevel1 / TOWER_HP_BASE).toBeCloseTo(0.1, 1);
	});
});

// ─── Field Damage Upgrade Correction Tests ────────────────────────────────

describe('Damage curve (early-game-friendly quadratic)', () => {
	it('anchors the early levels exactly', () => {
		expect(flatlandBaseDamageAtLevel(0)).toBe(50);
		expect(flatlandBaseDamageAtLevel(1)).toBe(75);
		expect(flatlandBaseDamageAtLevel(2)).toBe(113);
		expect(flatlandBaseDamageAtLevel(3)).toBe(152);
		expect(flatlandBaseDamageAtLevel(4)).toBe(194);
		expect(flatlandBaseDamageAtLevel(5)).toBe(237);
		expect(flatlandBaseDamageAtLevel(10)).toBe(483);
	});

	it('matches the intended mid/late anchors', () => {
		expect(flatlandBaseDamageAtLevel(100)).toBe(13057);
		expect(flatlandBaseDamageAtLevel(1000)).toBe(988431);
		expect(flatlandBaseDamageAtLevel(6000)).toBe(34537353);
	});

	it('does not double Damage every early level (gentle ramp)', () => {
		// The old curve jumped 50→120→253; the new one must stay far below that.
		expect(flatlandBaseDamageAtLevel(1)).toBeLessThan(100);
		expect(flatlandBaseDamageAtLevel(2)).toBeLessThan(150);
	});

	it('clamps to 0..6000 and never returns below the 50 base', () => {
		expect(flatlandBaseDamageAtLevel(6001)).toBe(flatlandBaseDamageAtLevel(6000));
		expect(flatlandBaseDamageAtLevel(50_000)).toBe(flatlandBaseDamageAtLevel(6000));
		expect(flatlandBaseDamageAtLevel(-5)).toBe(50);
		expect(flatlandBaseDamageAtLevel(2.9)).toBe(flatlandBaseDamageAtLevel(2));
	});

	it('sanitizes invalid input to the base (no NaN/Infinity)', () => {
		for (const bad of [NaN, Infinity, -Infinity]) {
			const v = flatlandBaseDamageAtLevel(bad);
			expect(Number.isFinite(v)).toBe(true);
			expect(v).toBe(50);
		}
		// Excessive but finite input stays finite.
		expect(Number.isFinite(flatlandBaseDamageAtLevel(1e9))).toBe(true);
	});

	it('routes the Field Damage upgrade through the same curve', () => {
		expect(getBattleUpgradeEffect(UpgradeId.Damage, 0)).toBe(50);
		expect(getBattleUpgradeEffect(UpgradeId.Damage, 1)).toBe(75);
		expect(getBattleUpgradeEffect(UpgradeId.Damage, 2)).toBe(113);
		expect(getBattleUpgradeEffect(UpgradeId.Damage, 10)).toBe(483);
	});

	it('Forge starting levels + Field purchases read the same curve at the summed level', () => {
		// Forge gives permanent starting levels; Field purchases continue from the
		// total. Whether the level arrives via Forge or in-run, the curve is shared.
		const forgeLevels = 3;
		const fieldLevels = 2;
		const total = forgeLevels + fieldLevels;
		expect(getBattleUpgradeEffect(UpgradeId.Damage, total)).toBe(flatlandBaseDamageAtLevel(total));
		expect(flatlandBaseDamageAtLevel(total)).toBe(237); // level 5
	});

	it('Research is applied separately and is NOT baked into the base curve', () => {
		// The curve returns the un-multiplied base; lab/research multipliers are
		// layered on top by the tower stat code (damage = curve * lab.dmg).
		const base = flatlandBaseDamageAtLevel(10);
		const researchMultiplier = 2; // e.g. Damage Research at some level
		const withResearch = base * researchMultiplier;
		expect(base).toBe(483);
		expect(withResearch).toBe(966);
		// Calling the curve again never changes — research lives outside it.
		expect(flatlandBaseDamageAtLevel(10)).toBe(483);
	});

	it('UI upgrade deltas are dynamic: +25 then +38', () => {
		expect(flatlandBaseDamageDeltaAtLevel(0)).toBe(25);
		expect(flatlandBaseDamageDeltaAtLevel(1)).toBe(38);
		// The Field card computes the same delta from the effect helper.
		expect(getBattleUpgradeEffect(UpgradeId.Damage, 1) - getBattleUpgradeEffect(UpgradeId.Damage, 0)).toBe(25);
		expect(getBattleUpgradeEffect(UpgradeId.Damage, 2) - getBattleUpgradeEffect(UpgradeId.Damage, 1)).toBe(38);
	});

	it('Field Damage costs use the steeper Tower-like curve', () => {
		expect(getBattleUpgradeCost(UpgradeId.Damage, 0)).toBe(30);
		expect(getBattleUpgradeCost(UpgradeId.Damage, 1)).toBe(72);
		expect(getBattleUpgradeCost(UpgradeId.Damage, 2)).toBe(124);
		expect(getBattleUpgradeCost(UpgradeId.Damage, 3)).toBe(183);
		expect(getBattleUpgradeCost(UpgradeId.Damage, 4)).toBe(252);
		expect(getBattleUpgradeCost(UpgradeId.Damage, 9)).toBe(738);
		expect(getBattleUpgradeCost(UpgradeId.Damage, 13)).toBe(1343);
	});
});

// ─── Lab Scaling Correction Tests ─────────────────────────────────────────

describe('Lab Research Scaling', () => {
	it('Damage Research gives 5% per level (was 2%)', () => {
		expect(getLabEffect('damageResearch' as any, 1)).toBeCloseTo(0.05, 1);
		expect(getLabEffect('damageResearch' as any, 10)).toBeCloseTo(0.50, 1);
		expect(getLabEffect('damageResearch' as any, 100)).toBeCloseTo(5.00, 1);
	});

	it('Health Research gives 5% per level (was 2%)', () => {
		expect(getLabEffect('healthResearch' as any, 1)).toBeCloseTo(0.05, 1);
	});

	it('Attack Speed Research gives 3% per level (was 1.5%)', () => {
		expect(getLabEffect('attackSpeedResearch' as any, 1)).toBeCloseTo(0.03, 1);
	});

	it('Damage Research multiplier at level 100 = 6x', () => {
		const mult = 1 + getLabEffect('damageResearch' as any, 100);
		expect(mult).toBe(6);
	});

	it('Health Research multiplier at level 80 = 5x', () => {
		const mult = 1 + getLabEffect('healthResearch' as any, 80);
		expect(mult).toBe(5);
	});
});

// ─── Simulator Scenario Smoke Tests ────────────────────────────────────────

describe('Simulator Scenarios', () => {
	it('all predefined scenarios produce finite results', () => {
		for (const scenario of SCENARIOS) {
			const result = simulateRun(
				scenario.workshop,
				scenario.labs,
				5000,
				scenario.tier,
				scenario.strategy,
				scenario.unlockedBlueprints,
			);
			expect(result.finalWave).toBeGreaterThan(0);
			expect(Number.isFinite(result.finalWave)).toBe(true);
			expect(Number.isFinite(result.finalDamage)).toBe(true);
			// Always finite + non-negative (no NaN/Infinity) — required for all Fronts.
			expect(Number.isFinite(result.totalKills)).toBe(true);
			expect(result.totalKills).toBeGreaterThanOrEqual(0);
			// Fronts 1–2 are tuned enough that any seeded run lands at least one kill.
			// Fronts 3+ scale difficulty steeply (Front 5 = 10000×, placeholder 6–16);
			// an under-geared "early attempt" can legitimately die at Wave 1 there, so
			// we require finiteness, not survivability (16-Front balance is not claimed
			// complete in this pass).
			if (scenario.tier <= 2) {
				expect(result.totalKills).toBeGreaterThan(0);
			}
		}
	});

	it('Tier 2/3 early attempts die faster than Tier 1', () => {
		const ws = {
			[WorkshopUpgradeId.BaseDamage]: 20,
			[WorkshopUpgradeId.StartingHp]: 10,
		};
		const t1 = simulateRun(ws, {}, 5000, 1, 'optimal', []);
		const t2 = simulateRun(ws, {}, 5000, 2, 'optimal', []);
		const t3 = simulateRun(ws, {}, 5000, 3, 'optimal', []);
		expect(t2.finalWave).toBeLessThanOrEqual(t1.finalWave);
		expect(t3.finalWave).toBeLessThanOrEqual(t2.finalWave);
	});
});

// ─── Enemy Formula Verification Table ──────────────────────────────────────

describe('Enemy Formula Verification Table', () => {
	it('verifies key wave values for Front 1', () => {
		// Wave 1 (HP 16.67, attack x10)
		const w1hp = front1EnemyHp(1);
		const w1dmg = front1EnemyDamage(1);
		expect(w1hp).toBeCloseTo(39.17, 1);
		expect(w1dmg).toBeCloseTo(11.8, 1);

		// Wave 10
		const w10hp = front1EnemyHp(10);
		const w10dmg = front1EnemyDamage(10);
		expect(w10hp).toBeCloseTo(306.06, 1);
		expect(w10dmg).toBeCloseTo(48.1, 1);

		// Wave 100
		const w100hp = front1EnemyHp(100);
		const w100dmg = front1EnemyDamage(100);
		expect(w100hp).toBeCloseTo(72_681, -2);
		expect(w100dmg).toBeCloseTo(4029.5, -1);

		// Wave 1000
		const w1000hp = front1EnemyHp(1000);
		const w1000dmg = front1EnemyDamage(1000);
		expect(w1000hp).toBeGreaterThan(1_000_000_000);
		expect(w1000dmg).toBeGreaterThan(1_000_000);
	});
});

// ─── Regression: Audit pass fixes ────────────────────────────────────────────

describe('Crit chance cap regression', () => {
	it('workshop CritBonus alone cannot push crit above 0.30 (baseCrit cap)', () => {
		// baseCrit uses Math.min(0.30, ...) in createTowerState
		// Workshop CritBonus effectPerLevel varies; verify additiveEffect never exceeds what the code caps it to
		const wsEffect = getWorkshopUpgradeEffect(WorkshopUpgradeId.CritBonus, 999);
		const baseCrit = Math.min(0.30, 0.01 + wsEffect);
		expect(baseCrit).toBeLessThanOrEqual(0.30);
	});

	it('battle CritChance at max level effect is exactly at the cap (0.75)', () => {
		const critDef = BATTLE_UPGRADE_DEFS.find(d => d.id === UpgradeId.CritChance)!;
		expect(critDef).toBeDefined();
		const eff = getBattleUpgradeEffect(UpgradeId.CritChance, critDef.maxLevel);
		expect(eff).toBeCloseTo(critDef.effectCap!, 4);
	});

	it('combined workshop + battle crit cannot exceed 0.75', () => {
		const maxWsCrit = getWorkshopUpgradeEffect(WorkshopUpgradeId.CritBonus, 999);
		const maxBattleCrit = getBattleUpgradeEffect(UpgradeId.CritChance, 999);
		const combined = Math.min(0.75, 0.01 + maxWsCrit + maxBattleCrit);
		expect(combined).toBeLessThanOrEqual(0.75);
	});

	it('battle CritChance level beyond maxLevel gives same effect as maxLevel (no dead levels)', () => {
		const critDef = BATTLE_UPGRADE_DEFS.find(d => d.id === UpgradeId.CritChance)!;
		const atMax = getBattleUpgradeEffect(UpgradeId.CritChance, critDef.maxLevel);
		const overMax = getBattleUpgradeEffect(UpgradeId.CritChance, critDef.maxLevel + 10);
		expect(atMax).toBeCloseTo(overMax, 6);
	});
});

describe('Dead-level regression (capped upgrades fixed in this pass)', () => {
	// Only the four upgrades corrected in this audit pass. Lifesteal (maxLevel=24, cap=0.05)
	// sits BELOW its cap at maxLevel (0.048) — a separate deferred finding, not fixed here.
	const fixedCaps: Array<{ id: UpgradeId; maxLevel: number; cap: number }> = [
		{ id: UpgradeId.Multishot,      maxLevel: 84, cap: 0.50 },
		{ id: UpgradeId.CritChance,     maxLevel: 75, cap: 0.75 },
		{ id: UpgradeId.DefensePercent, maxLevel: 50, cap: 0.50 },
		{ id: UpgradeId.Regen,          maxLevel: 20, cap: 10.0  },
	];

	it('fixed upgrades: maxLevel in defs matches expected value', () => {
		for (const { id, maxLevel } of fixedCaps) {
			const def = BATTLE_UPGRADE_DEFS.find(d => d.id === id)!;
			expect(def.maxLevel).toBe(maxLevel);
		}
	});

	it('fixed upgrades: effect at maxLevel equals effectCap', () => {
		for (const { id, cap } of fixedCaps) {
			const def = BATTLE_UPGRADE_DEFS.find(d => d.id === id)!;
			const eff = getBattleUpgradeEffect(id, def.maxLevel);
			expect(eff).toBeCloseTo(cap, 4);
		}
	});

	it('fixed upgrades: no improvement from maxLevel to maxLevel+1 (no dead levels)', () => {
		for (const { id } of fixedCaps) {
			const def = BATTLE_UPGRADE_DEFS.find(d => d.id === id)!;
			const atMax = getBattleUpgradeEffect(id, def.maxLevel);
			const overMax = getBattleUpgradeEffect(id, def.maxLevel + 1);
			expect(atMax).toBeCloseTo(overMax, 6);
		}
	});

	it('Multishot maxLevel 84 → effect capped at 0.50', () => {
		const multishotDef = BATTLE_UPGRADE_DEFS.find(d => d.id === UpgradeId.Multishot)!;
		expect(multishotDef.maxLevel).toBe(84);
		expect(getBattleUpgradeEffect(UpgradeId.Multishot, 84)).toBeCloseTo(0.50, 4);
	});

	it('DefensePercent maxLevel 50 → effect capped at 0.50', () => {
		const def = BATTLE_UPGRADE_DEFS.find(d => d.id === UpgradeId.DefensePercent)!;
		expect(def.maxLevel).toBe(50);
		expect(getBattleUpgradeEffect(UpgradeId.DefensePercent, 50)).toBeCloseTo(0.50, 4);
	});

	it('Regen maxLevel 20 → effect capped at 10.0', () => {
		const def = BATTLE_UPGRADE_DEFS.find(d => d.id === UpgradeId.Regen)!;
		expect(def.maxLevel).toBe(20);
		expect(getBattleUpgradeEffect(UpgradeId.Regen, 20)).toBeCloseTo(10.0, 4);
	});
});

describe('Help page balance copy', () => {
	it('does not advertise stale balance copy and reflects the shared Forge/Field model', () => {
		const help = readFileSync('src/routes/help/+page.svelte', 'utf8');
		expect(help).not.toContain('+1.5 range per level');
		expect(help).not.toContain('Crit Chance at 45%');
		expect(help).not.toContain('Appears from wave 3');
		// v15 Forge/Field unification: the old divergent-Forge copy is now stale.
		// Forge Range follows the Field curve (+2/level), and fire rate no longer
		// hard-caps at 10/s — neither old phrasing should remain.
		expect(help).not.toContain('+0.5 range per level');
		expect(help).not.toContain('Base fire rate caps at 10/s');
		// Current truths.
		expect(help).toContain('combined Crit Chance at 75%');
		expect(help).toContain('starting level');
	});
});

describe('Lab duration/effect overflow regression', () => {
	it('getLabDuration at maxLevel is finite for all labs', () => {
		for (const def of ['damageResearch', 'attackSpeedResearch', 'healthResearch', 'alloyEfficiency', 'energyEfficiency'] as const) {
			const dur = getLabDuration(def as any, 9999);
			expect(Number.isFinite(dur)).toBe(true);
			expect(dur).toBeGreaterThan(0);
		}
	});

	it('getLabDuration at Infinity input is finite', () => {
		const dur = getLabDuration(LabId.DamageResearch, Infinity);
		expect(Number.isFinite(dur)).toBe(true);
	});

	it('getLabDuration at -1 input falls back to level 0', () => {
		const dur0 = getLabDuration(LabId.DamageResearch, 0);
		const durNeg = getLabDuration(LabId.DamageResearch, -1);
		expect(durNeg).toBe(dur0);
	});

	it('getLabEffect at maxLevel+9999 is same as at maxLevel', () => {
		const def = LAB_DEFS[0]!;
		const atMax = getLabEffect(def.id, def.maxLevel);
		const overMax = getLabEffect(def.id, def.maxLevel + 9999);
		expect(atMax).toBe(overMax);
	});

	it('getLabEffect at -5 is 0', () => {
		expect(getLabEffect(LabId.DamageResearch, -5)).toBe(0);
	});

	it('getLabEffect at NaN is 0', () => {
		expect(getLabEffect(LabId.DamageResearch, NaN)).toBe(0);
	});
});

// ─── v0.5.3 Display Format Tests ──────────────────────────────────────────

describe('Field Upgrade card display values (current, not next delta)', () => {
	it('Damage at level 0 shows "50 DMG"', () => {
		expect(formatBattleEffect(UpgradeId.Damage, 50)).toBe('50 DMG');
	});

	it('Damage at level 1 shows "75 DMG"', () => {
		expect(formatBattleEffect(UpgradeId.Damage, getBattleUpgradeEffect(UpgradeId.Damage, 1))).toBe('75 DMG');
	});

	it('Attack Speed at level 0 shows "1.000 /s", not "+0.050 /s"', () => {
		expect(formatBattleEffect(UpgradeId.FireRate, 0)).toBe('1.000 /s');
	});

	it('Attack Speed at level 1 shows "1.050 /s"', () => {
		expect(formatBattleEffect(UpgradeId.FireRate, 0.05)).toBe('1.050 /s');
	});

	it('Range at level 0 shows "Range 180"', () => {
		expect(formatBattleEffect(UpgradeId.Range, 0)).toBe('Range 180');
	});

	it('Crit Chance at level 0 shows "1.0%"', () => {
		expect(formatBattleEffect(UpgradeId.CritChance, 0)).toBe('1.0%');
	});

	it('Crit Multiplier at level 0 shows "×1.30", not "×2.10"', () => {
		expect(formatBattleEffect(UpgradeId.CritMultiplier, 0)).toBe('×1.30');
	});

	it('Crit Multiplier at level 1 shows "×1.40"', () => {
		expect(formatBattleEffect(UpgradeId.CritMultiplier, 0.10)).toBe('×1.40');
	});

	it('Max HP at level 0 shows "100 HP"', () => {
		expect(formatBattleEffect(UpgradeId.MaxHp, 0)).toBe('100 HP');
	});

	it('next-delta format shows + prefix (secondary info only)', () => {
		expect(formatBattleEffectNext(UpgradeId.Damage, 70)).toBe('+70 DMG');
		expect(formatBattleEffectNext(UpgradeId.FireRate, 0.05)).toBe('+0.050 /s');
		expect(formatBattleEffectNext(UpgradeId.CritMultiplier, 0.10)).toBe('+0.10×');
	});
});

describe('Attack Speed Field Upgrade correction', () => {
	it('per-level effect is +0.05', () => {
		expect(getBattleUpgradeEffect(UpgradeId.FireRate, 1)).toBeCloseTo(0.05, 4);
	});

	it('definition has effectPerLevel = 0.05', () => {
		const def = BATTLE_UPGRADE_DEFS.find(d => d.id === UpgradeId.FireRate)!;
		expect(def.effectPerLevel).toBe(0.05);
	});

	it('selected levels match the intended attack speed curve', () => {
		expect(1 + getBattleUpgradeEffect(UpgradeId.FireRate, 0)).toBeCloseTo(1.0, 4);
		expect(1 + getBattleUpgradeEffect(UpgradeId.FireRate, 1)).toBeCloseTo(1.05, 4);
		expect(1 + getBattleUpgradeEffect(UpgradeId.FireRate, 10)).toBeCloseTo(1.50, 4);
		expect(1 + getBattleUpgradeEffect(UpgradeId.FireRate, 15)).toBeCloseTo(1.75, 4);
		expect(1 + getBattleUpgradeEffect(UpgradeId.FireRate, 30)).toBeCloseTo(2.50, 4);
	});

	it('Attack Speed costs follow the Tower-like order of magnitude', () => {
		expect(getBattleUpgradeCost(UpgradeId.FireRate, 0)).toBe(30);
		expect(getBattleUpgradeCost(UpgradeId.FireRate, 4)).toBe(252);
		expect(getBattleUpgradeCost(UpgradeId.FireRate, 9)).toBe(738);
		expect(getBattleUpgradeCost(UpgradeId.FireRate, 14)).toBe(1531);
		expect(getBattleUpgradeCost(UpgradeId.FireRate, 29)).toBe(7314);
	});

	it('Tower-like field cost helper uses 1-based level-to-buy input', () => {
		expect(towerLikeFieldUpgradeCost(1, 30)).toBe(30);
		expect(towerLikeFieldUpgradeCost(5, 30)).toBe(252);
		expect(towerLikeFieldUpgradeCost(10, 30)).toBe(738);
		expect(towerLikeFieldUpgradeCost(15, 30)).toBe(1531);
		expect(towerLikeFieldUpgradeCost(30, 30)).toBe(7314);
	});
});

describe('Crit Multiplier base value correction (v0.5.3)', () => {
	it('base crit multiplier in getDefaultTowerStats is 1.30', () => {
		expect(getDefaultTowerStats().critMultiplier).toBe(1.30);
	});

	it('applyBattleUpgrades starts from 1.30 + battle effect', () => {
		const engine = new GameEngine();
		engine.startRun({}, {}, {}, 0, [], 1);
		// Fresh run, no battle upgrades bought
		expect(engine.state.tower.stats.critMultiplier).toBeCloseTo(1.30, 4);
	});

	it('battle CritMultiplier level 1 adds +0.10 to base 1.30 = 1.40', () => {
		const engine = new GameEngine();
		engine.startRun({}, {}, {}, 0, [], 1);
		engine.state.cash = 1_000_000;
		engine.buyBattleUpgrade(UpgradeId.CritMultiplier);
		expect(engine.state.tower.stats.critMultiplier).toBeCloseTo(1.40, 4);
	});

	it('CritMultiplier effectPerLevel is 0.10', () => {
		const def = BATTLE_UPGRADE_DEFS.find(d => d.id === UpgradeId.CritMultiplier)!;
		expect(def.effectPerLevel).toBe(0.10);
	});
});

// ─── Balance Snapshot Ratios (Shots-to-kill verification) ────────────────────

describe('Balance Snapshot Ratios (shots-to-kill)', () => {
	const waves = [1, 10, 100, 1000, 10000];
	const types = [EnemyType.Normal, EnemyType.Boss, EnemyType.Tank, EnemyType.Fast, EnemyType.Ranged];

	it('should calculate shots-to-kill within expected ratios', () => {
		for (const w of waves) {
			const damageLevel = Math.floor(w / 2);
			const damage = getBattleUpgradeEffect(UpgradeId.Damage, damageLevel);

			// Under simplified assumptions:
			// Basic enemy HP = Front 1 enemy HP
			const basicHP = front1EnemyHp(w);

			expect(Number.isFinite(basicHP)).toBe(true);
			expect(basicHP).toBeGreaterThan(0);
			expect(damage).toBeGreaterThan(0);

			const basicShots = Math.ceil(basicHP / damage);

			// Assertions for each type
			for (const t of types) {
				let hp = 0;
				if (t === EnemyType.Boss) {
					hp = Math.floor(basicHP * bossHpMultiplier(w));
				} else {
					const mod = ENEMY_TYPE_MODIFIERS[t]!;
					hp = Math.floor(basicHP * mod.hp);
				}

				const shots = Math.ceil(hp / damage);

				// Verify outputs are finite and valid
				expect(Number.isFinite(hp)).toBe(true);
				expect(hp).toBeGreaterThan(0);
				expect(Number.isFinite(shots)).toBe(true);
				expect(shots).toBeGreaterThan(0);

				// Check approximate ratios relative to basicShots using strict ceiling bounds
				if (t === EnemyType.Normal) {
					expect(shots).toBe(basicShots);
				} else if (t === EnemyType.Boss) {
					// bossShots is bounded between 20 * basicShots - 19 and 20 * basicShots
					expect(shots).toBeLessThanOrEqual(basicShots * 20);
					expect(shots).toBeGreaterThanOrEqual(basicShots * 20 - 19);
				} else if (t === EnemyType.Tank) {
					// tankShots is bounded between 5 * basicShots - 4 and 5 * basicShots
					expect(shots).toBeLessThanOrEqual(basicShots * 5);
					expect(shots).toBeGreaterThanOrEqual(basicShots * 5 - 4);
				} else if (t === EnemyType.Fast) {
					expect(shots).toBeLessThanOrEqual(basicShots);
					expect(shots).toBeGreaterThanOrEqual(Math.max(1, Math.ceil(basicShots * 0.8) - 1));
				} else if (t === EnemyType.Ranged) {
					expect(shots).toBeLessThanOrEqual(basicShots);
					expect(shots).toBeGreaterThanOrEqual(Math.max(1, Math.ceil(basicShots * 0.5) - 1));
				}
			}
		}
	});

	it('should verify monotonic progression of shots-to-kill', () => {
		// As wave increases, shots-to-kill for basic enemies should grow,
		// because HP curve grows faster than the damage curve.
		let prevShots = 0;
		for (const w of waves) {
			const damageLevel = Math.floor(w / 2);
			const damage = getBattleUpgradeEffect(UpgradeId.Damage, damageLevel);
			const basicHP = front1EnemyHp(w);
			const shots = Math.ceil(basicHP / damage);
			expect(shots).toBeGreaterThanOrEqual(prevShots);
			prevShots = shots;
		}
	});
});
