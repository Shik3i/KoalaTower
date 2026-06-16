import { GAME_CONFIG, TOWER_HP_BASE } from '../engine/gameConfig';
import {
	UpgradeId,
	WorkshopUpgradeId,
	type GameState,
	type TowerState,
} from '../engine/gameTypes';
import { getBattleUpgradeEffect } from '../balance/battleUpgrades';
import { getWorkshopUpgradeEffect } from '../balance/workshopUpgrades';
import { getLabItemEffect } from '../balance/labs';
import { LabId } from '../engine/gameTypes';

function getLabMultiplier(state: GameState): { dmg: number; hp: number; coin: number } {
	const lab = state.labLevels;
	return {
		dmg: 1 + getLabItemEffect(LabId.DamageResearch, lab[LabId.DamageResearch] ?? 0),
		hp: 1 + getLabItemEffect(LabId.TowerDurability, lab[LabId.TowerDurability] ?? 0) / 100,
		coin: 1 + getLabItemEffect(LabId.CoinEfficiency, lab[LabId.CoinEfficiency] ?? 0),
	};
}

export function createTowerState(state: GameState): TowerState {
	const ws = state.workshopUpgrades;
	const lab = getLabMultiplier(state);

	const baseDamage = (10 + getWorkshopUpgradeEffect(WorkshopUpgradeId.BaseDamage, ws[WorkshopUpgradeId.BaseDamage] ?? 0)) * lab.dmg;
	const baseFireRate = 1.0 + getWorkshopUpgradeEffect(WorkshopUpgradeId.BaseFireRate, ws[WorkshopUpgradeId.BaseFireRate] ?? 0);
	const baseRange = 300 + getWorkshopUpgradeEffect(WorkshopUpgradeId.BaseRange, ws[WorkshopUpgradeId.BaseRange] ?? 0);
	const startingHp = Math.floor((TOWER_HP_BASE + getWorkshopUpgradeEffect(WorkshopUpgradeId.StartingHp, ws[WorkshopUpgradeId.StartingHp] ?? 0)) * lab.hp);
	const critBonus = getWorkshopUpgradeEffect(WorkshopUpgradeId.CritBonus, ws[WorkshopUpgradeId.CritBonus] ?? 0);

	return {
		position: { x: GAME_CONFIG.VIEW_WIDTH / 2, y: GAME_CONFIG.VIEW_HEIGHT / 2 },
		hp: startingHp,
		maxHp: startingHp,
		stats: {
			damage: baseDamage,
			fireRate: baseFireRate,
			range: baseRange,
			multishot: 1,
			critChance: 0.05 + critBonus,
			critMultiplier: 2.0,
		},
		fireTimer: 0,
		alive: true,
	};
}

export function applyBattleUpgrades(state: GameState): void {
	const tower = state.tower;
	const bu = state.battleUpgrades;
	const ws = state.workshopUpgrades;
	const lab = getLabMultiplier(state);

	const baseDamage = (10 + getWorkshopUpgradeEffect(WorkshopUpgradeId.BaseDamage, ws[WorkshopUpgradeId.BaseDamage] ?? 0)) * lab.dmg;
	const baseFireRate = 1.0 + getWorkshopUpgradeEffect(WorkshopUpgradeId.BaseFireRate, ws[WorkshopUpgradeId.BaseFireRate] ?? 0);
	const baseRange = 300 + getWorkshopUpgradeEffect(WorkshopUpgradeId.BaseRange, ws[WorkshopUpgradeId.BaseRange] ?? 0);
	const critBonus = getWorkshopUpgradeEffect(WorkshopUpgradeId.CritBonus, ws[WorkshopUpgradeId.CritBonus] ?? 0);

	const dmgLevel = bu[UpgradeId.Damage] ?? 0;
	const frLevel = bu[UpgradeId.FireRate] ?? 0;
	const rangeLevel = bu[UpgradeId.Range] ?? 0;
	const multiLevel = bu[UpgradeId.Multishot] ?? 0;
	const critLevel = bu[UpgradeId.CritChance] ?? 0;
	const defLevel = bu[UpgradeId.Defense] ?? 0;
	const hpLevel = bu[UpgradeId.MaxHp] ?? 0;

	tower.stats.damage = baseDamage + getBattleUpgradeEffect(UpgradeId.Damage, dmgLevel);
	tower.stats.fireRate = baseFireRate + getBattleUpgradeEffect(UpgradeId.FireRate, frLevel);
	tower.stats.range = baseRange + getBattleUpgradeEffect(UpgradeId.Range, rangeLevel);
	tower.stats.multishot = 1 + getBattleUpgradeEffect(UpgradeId.Multishot, multiLevel);
	tower.stats.critChance = 0.05 + critBonus + getBattleUpgradeEffect(UpgradeId.CritChance, critLevel);

	tower.maxHp = Math.floor((TOWER_HP_BASE
		+ getWorkshopUpgradeEffect(WorkshopUpgradeId.StartingHp, ws[WorkshopUpgradeId.StartingHp] ?? 0)
		+ getBattleUpgradeEffect(UpgradeId.MaxHp, hpLevel)) * lab.hp);
	tower.hp = Math.min(tower.hp, tower.maxHp);

	tower.stats.critMultiplier = 2.0;
}

export function damageTower(state: GameState, damage: number): void {
	const defLevel = state.battleUpgrades[UpgradeId.Defense] ?? 0;
	const reduction = getBattleUpgradeEffect(UpgradeId.Defense, defLevel);
	const effectiveDamage = Math.max(1, damage - reduction);
	state.tower.hp -= effectiveDamage;
	if (state.tower.hp <= 0) {
		state.tower.hp = 0;
		state.tower.alive = false;
		state.gameOver = true;
		state.runActive = false;
	}
}
