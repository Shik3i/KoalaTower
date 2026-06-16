import { WAVE_CONFIG } from '../engine/gameConfig';
import { WorkshopUpgradeId, type GameState } from '../engine/gameTypes';
import { getWorkshopUpgradeEffect, WORKSHOP_UPGRADES } from '../balance/workshopUpgrades';

export function calculateRunCoins(state: GameState): number {
	const waveBonus = state.wave.currentWave * 5;
	const killBonus = state.killCount * 2;
	const base = waveBonus + killBonus;
	const coinBonusLevel = state.workshopUpgrades[WorkshopUpgradeId.CoinBonus] ?? 0;
	const coinMultiplier = 1 + getWorkshopUpgradeEffect(WorkshopUpgradeId.CoinBonus, coinBonusLevel);
	return Math.floor(base * coinMultiplier);
}

export function calculateCashFromKill(state: GameState, baseReward: number): number {
	const cashBonusLevel = state.workshopUpgrades[WorkshopUpgradeId.CashBonus] ?? 0;
	const cashMultiplier = 1 + getWorkshopUpgradeEffect(WorkshopUpgradeId.CashBonus, cashBonusLevel);
	return Math.floor(baseReward * (1 + state.wave.currentWave * 0.02) * cashMultiplier);
}

export function getStartingCash(state: GameState): number {
	const startingCashLevel = state.workshopUpgrades[WorkshopUpgradeId.StartingCash] ?? 0;
	return 50 + getWorkshopUpgradeEffect(WorkshopUpgradeId.StartingCash, startingCashLevel);
}
