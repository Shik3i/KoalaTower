import { WAVE_CONFIG } from '../engine/gameConfig';
import { WorkshopUpgradeId, type GameState } from '../engine/gameTypes';
import { getWorkshopUpgradeEffect } from '../balance/workshopUpgrades';

/** Gold earned per kill — variable, based on wave difficulty and enemy base reward. Used for battle upgrades (run-only). */
export function calculateGoldFromKill(state: GameState, baseReward: number): number {
	const cashBonusLevel = state.workshopUpgrades[WorkshopUpgradeId.CashBonus] ?? 0;
	const cashMultiplier = 1 + getWorkshopUpgradeEffect(WorkshopUpgradeId.CashBonus, cashBonusLevel);
	return Math.floor(baseReward * (1 + state.wave.currentWave * 0.02) * cashMultiplier);
}

/** KoalaCoins earned per kill — base 1 + workshop bonus. Permanent currency for workshop + lab. */
export function getKoalaCoinPerKill(state: GameState): number {
	const bonusLevel = state.workshopUpgrades[WorkshopUpgradeId.CoinBonus] ?? 0;
	const bonus = getWorkshopUpgradeEffect(WorkshopUpgradeId.CoinBonus, bonusLevel);
	return 1 + Math.floor(bonus);
}

export function getStartingGold(state: GameState): number {
	const startingCashLevel = state.workshopUpgrades[WorkshopUpgradeId.StartingCash] ?? 0;
	return 50 + getWorkshopUpgradeEffect(WorkshopUpgradeId.StartingCash, startingCashLevel);
}
