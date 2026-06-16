import { UpgradeId, type BattleUpgrade } from '../engine/gameTypes';
import { UPGRADE_CONFIGS, buildBattleUpgrades, computeCappedEffect, getUpgradeConfig, computeCost } from './upgradeScaling';

export const BATTLE_UPGRADES: BattleUpgrade[] = buildBattleUpgrades();

export function getBattleUpgradeCost(id: UpgradeId, level: number): number {
	const cfg = getUpgradeConfig(id);
	if (!cfg) return Infinity;
	return computeCost(cfg.scaling, level);
}

export function getBattleUpgradeEffect(id: UpgradeId, level: number): number {
	const cfg = getUpgradeConfig(id);
	if (!cfg) return 0;
	return computeCappedEffect(cfg.scaling, level);
}
