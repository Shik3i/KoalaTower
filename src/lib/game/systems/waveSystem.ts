import { GAME_CONFIG, WAVE_CONFIG } from '../engine/gameConfig';
import { EnemyType, type Enemy, type GameState } from '../engine/gameTypes';
import { createEnemy, getEnemyTypeForWave, getEnemyCountForWave, getSpawnIntervalForWave, resetEnemyIdCounter } from '../balance/enemies';

export function startNewWave(state: GameState): void {
	state.wave.currentWave++;
	state.wave.enemiesInWave = getEnemyCountForWave(state.wave.currentWave);
	state.wave.enemiesSpawned = 0;
	state.wave.enemiesKilled = 0;
	state.wave.spawnTimer = 0;
	state.wave.spawnInterval = getSpawnIntervalForWave(state.wave.currentWave);
	state.wave.waveActive = true;
	state.wave.betweenWaveTimer = 0;
}

export function updateWaveSystem(state: GameState, dt: number): void {
	if (!state.runActive || state.gameOver || state.paused) return;

	const wave = state.wave;

	if (!wave.waveActive) {
		wave.betweenWaveTimer += dt;
		if (wave.betweenWaveTimer >= WAVE_CONFIG.BETWEEN_WAVE_TIME) {
			startNewWave(state);
		}
		return;
	}

	wave.spawnTimer += dt;
	if (wave.spawnTimer >= wave.spawnInterval && wave.enemiesSpawned < wave.enemiesInWave) {
		wave.spawnTimer = 0;
		spawnEnemy(state);
	}

	if (wave.enemiesKilled >= wave.enemiesInWave && state.enemies.length === 0) {
		wave.waveActive = false;
		wave.betweenWaveTimer = 0;
		state.cash += WAVE_CONFIG.BONUS_CASH_PER_WAVE * wave.currentWave;
	}
}

function spawnEnemy(state: GameState): void {
	const types = getEnemyTypeForWave(state.wave.currentWave);
	const type = types.length === 1
		? types[0]!
		: types[Math.floor(Math.random() * types.length)]!;

	const { x, y } = getSpawnPosition(state);
	const enemy = createEnemy(type, state.wave.currentWave, x, y);
	state.enemies.push(enemy);
	state.wave.enemiesSpawned++;
}

function getSpawnPosition(state: GameState): { x: number; y: number } {
	const margin = GAME_CONFIG.ENEMY_SPAWN_MARGIN;
	const w = GAME_CONFIG.VIEW_WIDTH;
	const h = GAME_CONFIG.VIEW_HEIGHT;
	const side = Math.floor(Math.random() * 4);

	switch (side) {
		case 0: return { x: Math.random() * w, y: -margin };
		case 1: return { x: w + margin, y: Math.random() * h };
		case 2: return { x: Math.random() * w, y: h + margin };
		case 3: return { x: -margin, y: Math.random() * h };
		default: return { x: -margin, y: -margin };
	}
}

export function removeDeadEnemies(state: GameState): void {
	state.enemies = state.enemies.filter(e => e.alive);
}
