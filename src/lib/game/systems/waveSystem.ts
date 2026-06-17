/**
 * waveSystem.ts — Wave lifecycle management.
 *
 * Handles: starting waves, spawning enemies over time, sub-wave pacing,
 * boss escort spawning, wave-completion gold bonus.
 */

import { EnemyType, type GameState } from '../engine/gameTypes';
import {
	createEnemy,
	getEnemyTypeForWave,
	getEnemyCountForWave,
	getSpawnIntervalForWave,
	resetEnemyIdCounter,
	hasBossEscortsRemaining,
	consumeBossEscort,
	getEscortTypeForWave,
	resetBossEscortCounter,
	setupBossEscorts,
} from '../balance/enemies';
import { getWaveCompletionBonus, getWaveCoinReward } from './economySystem';
import { SUB_WAVES, SUB_WAVE_PAUSE, BETWEEN_WAVE_TIME } from '../engine/gameConfig';

export function startNewWave(state: GameState): void {
	state.wave.currentWave++;
	resetBossEscortCounter();
	const totalEnemies = getEnemyCountForWave(state.wave.currentWave);
	state.wave.enemiesInWave = totalEnemies;
	state.wave.enemiesSpawned = 0;
	state.wave.enemiesKilled = 0;
	state.wave.spawnTimer = 0;
	state.wave.spawnInterval = getSpawnIntervalForWave(state.wave.currentWave);
	state.wave.waveActive = true;
	state.wave.betweenWaveTimer = 0;

	// Sub-wave init
	state.wave.currentSubWave = 0;
	state.wave.enemiesInSubWave = Math.ceil(totalEnemies / SUB_WAVES);
	state.wave.enemiesSpawnedInSubWave = 0;
	state.wave.subWavePauseTimer = 0;
	state.wave.subWaveActive = true;

	// If this is a boss wave, set up escort counter
	if (state.wave.currentWave % 10 === 0) {
		setupBossEscorts(state.wave.currentWave);
	}
}

export function updateWaveSystem(state: GameState, dt: number): void {
	if (!state.runActive || state.gameOver || state.paused) return;

	const wave = state.wave;

	if (!wave.waveActive) {
		wave.betweenWaveTimer += dt;
		if (wave.betweenWaveTimer >= BETWEEN_WAVE_TIME) {
			startNewWave(state);
		}
		return;
	}

	if (!wave.subWaveActive) {
		wave.subWavePauseTimer += dt;
		if (wave.subWavePauseTimer >= SUB_WAVE_PAUSE) {
			wave.currentSubWave++;
			const remaining = wave.enemiesInWave - wave.enemiesSpawned;
			wave.enemiesInSubWave = Math.min(remaining, Math.ceil(wave.enemiesInWave / SUB_WAVES));
			wave.enemiesSpawnedInSubWave = 0;
			wave.spawnTimer = 0;
			wave.subWaveActive = true;
			wave.subWavePauseTimer = 0;
		}
		return;
	}

	// Spawn enemies
	wave.spawnTimer += dt;
	const canSpawn = wave.enemiesSpawned < wave.enemiesInWave && wave.enemiesSpawnedInSubWave < wave.enemiesInSubWave;
	if (wave.spawnTimer >= wave.spawnInterval && canSpawn) {
		wave.spawnTimer = 0;
		spawnEnemy(state);
	}

	// Sub-wave complete?
	if (wave.enemiesSpawnedInSubWave >= wave.enemiesInSubWave || wave.enemiesSpawned >= wave.enemiesInWave) {
		wave.subWaveActive = false;
		wave.subWavePauseTimer = 0;
	}

		// Whole wave complete
		if (wave.enemiesKilled >= wave.enemiesInWave && state.enemies.length === 0) {
			wave.waveActive = false;
			wave.subWaveActive = false;
			wave.betweenWaveTimer = 0;
			// Award wave completion energy
			state.cash += getWaveCompletionBonus(state, state.wave.currentWave);
			// Award wave completion alloy (primary alloy source)
			state.coins += getWaveCoinReward(state, state.wave.currentWave);
		}
}

function spawnEnemy(state: GameState): void {
	const isBossWave = state.wave.currentWave % 10 === 0;
	let type: EnemyType;

	if (isBossWave && hasBossEscortsRemaining()) {
		consumeBossEscort();
		type = getEscortTypeForWave(state.wave.currentWave);
		// Escorts spawn faster
		state.wave.spawnInterval = getSpawnIntervalForWave(state.wave.currentWave) * 0.6;
	} else {
		const types = getEnemyTypeForWave(state.wave.currentWave);
		type = types.length === 1
			? types[0]!
			: types[Math.floor(Math.random() * types.length)]!;
		state.wave.spawnInterval = getSpawnIntervalForWave(state.wave.currentWave);
	}

	const isBoss = type === EnemyType.Boss;
	const isShiny = !isBoss && Math.random() < 0.05;

	const { x, y } = getSpawnPosition(state);
	const enemy = createEnemy(type, state.wave.currentWave, x, y, 1, isShiny);
	state.enemies.push(enemy);
	state.wave.enemiesSpawned++;
	state.wave.enemiesSpawnedInSubWave++;
}

function getSpawnPosition(state: GameState): { x: number; y: number } {
	const w = (state as any).__viewW || 800;
	const h = (state as any).__viewH || 800;
	const margin = 10;
	const side = Math.floor(Math.random() * 4);

	switch (side) {
		case 0: return { x: margin + Math.random() * (w - margin * 2), y: -margin };
		case 1: return { x: w + margin, y: margin + Math.random() * (h - margin * 2) };
		case 2: return { x: margin + Math.random() * (w - margin * 2), y: h + margin };
		case 3: return { x: -margin, y: margin + Math.random() * (h - margin * 2) };
		default: return { x: -margin, y: -margin };
	}
}

export function removeDeadEnemies(state: GameState): void {
	state.enemies = state.enemies.filter(e => e.alive);
}
