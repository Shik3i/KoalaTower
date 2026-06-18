import { describe, expect, it } from 'vitest';
import { GameEngine } from '../engine/GameEngine';
import { UpgradeId } from '../engine/gameTypes';
import { getMaxUnlockedSpeed, hasBlackMarketUnlock } from '../balance/blackMarket';
import { getEnemyCountForWave } from '../balance/enemies';
import { computeEnemyConfig } from '../balance/balanceMath';
import { EnemyType } from '../engine/gameTypes';

describe('Prompt C integration audit', () => {
	it('fresh run starts playable, can buy field upgrades, and ends naturally', () => {
		const engine = new GameEngine();
		let gameOver: { coins: number; wave: number } | null = null;
		engine.setCallbacks({
			onGameOver: (coins, wave) => {
				gameOver = { coins, wave };
			},
		});

		engine.startRun({}, {}, {}, 0, [], 1);
		expect(engine.state.cash).toBe(100);
		expect(engine.buyBattleUpgrade(UpgradeId.Damage)).toBe(true);
		expect(engine.state.battleUpgrades[UpgradeId.Damage]).toBe(1);

		for (let i = 0; i < 20_000 && !gameOver; i++) {
			if (i % 50 === 0) {
				engine.buyBattleUpgrade(UpgradeId.Damage);
				engine.buyBattleUpgrade(UpgradeId.FireRate);
				engine.buyBattleUpgrade(UpgradeId.MaxHp);
			}
			engine.update(0.1);
		}

		expect(gameOver).not.toBeNull();
		expect(gameOver!.wave).toBeGreaterThan(0);
		expect(gameOver!.coins).toBeGreaterThanOrEqual(0);
		expect(engine.state.killCount).toBeGreaterThan(0);
	});

	it('speed gates are safe with no persisted speed setting', () => {
		expect(getMaxUnlockedSpeed({})).toBe(2);
		expect(getMaxUnlockedSpeed({ gameSpeed3: true })).toBe(3);
		expect(getMaxUnlockedSpeed({ gameSpeed3: true, gameSpeed5: true })).toBe(5);
	});

	it('outsourced lab scaffold is visible in data but not treated as functional unlock by default', () => {
		expect(hasBlackMarketUnlock({}, 'outsourcedResearchLab')).toBe(false);
	});

	it('front 16 enemy count and stats remain finite', () => {
		const count = getEnemyCountForWave(100, 16);
		const normal = computeEnemyConfig(EnemyType.Normal, 100, 16);
		const boss = computeEnemyConfig(EnemyType.Boss, 100, 16);
		expect(Number.isFinite(count)).toBe(true);
		expect(Number.isFinite(normal.hp)).toBe(true);
		expect(Number.isFinite(normal.damage)).toBe(true);
		expect(Number.isFinite(boss.hp)).toBe(true);
		expect(Number.isFinite(boss.damage)).toBe(true);
	});
});
