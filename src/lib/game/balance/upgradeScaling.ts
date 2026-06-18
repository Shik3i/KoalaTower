/**
 * upgradeScaling.ts — Shared helpers for upgrade cost and effect display.
 */

import { UpgradeId } from '../engine/gameTypes';
import { hybridCost, additiveEffect, roundedCost } from './balanceMath';
export { hybridCost, additiveEffect, roundedCost };

/**
 * Format the CURRENT effective stat value for UI display.
 * Returns the live stat (base + upgrade effect), NOT the next delta.
 */
export function formatBattleEffect(id: UpgradeId, value: number): string {
	switch (id) {
		case UpgradeId.Damage: return (50 + value).toFixed(1) + ' DMG';
		case UpgradeId.FireRate: return (1.0 + value).toFixed(3) + ' /s';
		case UpgradeId.Range: return 'Range ' + (180 + value).toFixed(0);
		case UpgradeId.Multishot: return (value * 100).toFixed(1) + '%';
		case UpgradeId.MultishotProjectiles: return (1 + value) + ' proj';
		case UpgradeId.CritChance: return ((0.01 + value) * 100).toFixed(1) + '%';
		case UpgradeId.CritMultiplier: return '×' + (1.30 + value).toFixed(2);
		case UpgradeId.Defense: return '-' + value.toFixed(0) + ' dmg';
		case UpgradeId.DefensePercent: return '-' + (value * 100).toFixed(0) + '%';
		case UpgradeId.MaxHp: return (100 + value).toFixed(0) + ' HP';
		case UpgradeId.Regen: return (value).toFixed(1) + ' HP/s';
		case UpgradeId.Lifesteal: return (value * 100).toFixed(1) + '%';
		case UpgradeId.Thorns: return value.toFixed(0) + ' dmg';
		case UpgradeId.EnergyAmp: return (value * 100).toFixed(1) + '%';
		case UpgradeId.CashPerWave: return value.toFixed(0) + ' /wave';
		default: return String(value);
	}
}

/**
 * Format the next-level delta as secondary info (small/muted, NOT primary).
 */
export function formatBattleEffectNext(id: UpgradeId, value: number): string {
	switch (id) {
		case UpgradeId.Damage: return '+' + value.toFixed(1) + ' DMG';
		case UpgradeId.FireRate: return '+' + value.toFixed(3) + ' /s';
		case UpgradeId.Range: return '+' + value.toFixed(0) + ' range';
		case UpgradeId.Multishot: return '+' + (value * 100).toFixed(1) + '%';
		case UpgradeId.MultishotProjectiles: return '+' + value + ' proj';
		case UpgradeId.CritChance: return '+' + (value * 100).toFixed(1) + '%';
		case UpgradeId.CritMultiplier: return '+' + value.toFixed(2) + '×';
		case UpgradeId.Defense: return '-' + value.toFixed(0) + ' dmg';
		case UpgradeId.DefensePercent: return '-' + (value * 100).toFixed(0) + '%';
		case UpgradeId.MaxHp: return '+' + value.toFixed(0) + ' HP';
		case UpgradeId.Regen: return '+' + value.toFixed(1) + ' HP/s';
		case UpgradeId.Lifesteal: return '+' + (value * 100).toFixed(1) + '%';
		case UpgradeId.Thorns: return '+' + value.toFixed(0) + ' dmg';
		case UpgradeId.EnergyAmp: return '+' + (value * 100).toFixed(1) + '%';
		case UpgradeId.CashPerWave: return '+' + value.toFixed(0) + ' /wave';
		default: return '+' + String(value);
	}
}
