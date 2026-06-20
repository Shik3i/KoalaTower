/**
 * waveSystem.ts — Wave lifecycle management.
 *
 * Handles: starting waves, spawning enemies over time, sub-wave pacing,
 * boss spawning, wave-completion gold bonus.
 */

import { ChallengeId, EnemyType, type GameState } from '../engine/gameTypes';
import {
	createEnemy,
	getEnemyCountForWave,
	resetEnemyIdCounter,
} from '../balance/enemies';
import {
	SPAWN_TICK_SECONDS,
	MAX_ACTIVE_ENEMIES,
	expectedEnemiesPerWave,
	availableEnemyTypes,
} from '../balance/balanceMath';
import { getWaveCompletionBonus, getWaveCoinReward } from './economySystem';
import { BETWEEN_WAVE_TIME } from '../engine/gameConfig';

export function startNewWave(state: GameState): void {
	// Snapshot the wave we are leaving before the counters reset, so the
	// inter-wave announce can show a "Last wave recap" row. The first call
	// (currentWave 0 → 1) snapshots an empty object — no recap shown.
	state.wave.lastWaveKillsByType = state.wave.killsByTypeThisWave ?? {};
	state.wave.killsByTypeThisWave = {};

	state.wave.currentWave++;
	resetEnemyIdCounter();

	const challenge = state.activeChallenge;
	const front = state.tier ?? 1;

	const totalEnemies = getEnemyCountForWave(state.wave.currentWave, front);

	state.wave.enemiesInWave = totalEnemies;
	state.wave.enemiesSpawned = 0;
	state.wave.enemiesKilled = 0;

	state.wave.spawnTimer = 0;
	state.wave.spawnInterval = SPAWN_TICK_SECONDS;
	state.wave.waveActive = true;
	state.wave.betweenWaveTimer = 0;

	// Spawn-tick model properties
	state.wave.currentTickIndex = 0;
	state.wave.spawnBacklog = 0;
	state.wave.bossPending = false;

	// Sub-wave fallback properties to ensure backward compatibility
	state.wave.currentSubWave = 0;
	state.wave.enemiesInSubWave = totalEnemies;
	state.wave.enemiesSpawnedInSubWave = 0;
	state.wave.subWavePauseTimer = 0;
	state.wave.subWaveActive = true;
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

	const isBossWave = wave.currentWave % 10 === 0 || state.activeChallenge === ChallengeId.BossRush;
	const front = state.tier ?? 1;
	const N = expectedEnemiesPerWave(wave.currentWave, front);

	// Tick scheduled spawning
	if (wave.currentTickIndex !== undefined && wave.currentTickIndex < 240) {
		wave.spawnTimer += dt;
		while (wave.spawnTimer >= SPAWN_TICK_SECONDS && wave.currentTickIndex < 240) {
			wave.spawnTimer -= SPAWN_TICK_SECONDS;

			// Even distribution scheduled spawns for this tick
			const t = wave.currentTickIndex;
			const tickSpawns = Math.floor((t + 1) * N / 240) - Math.floor(t * N / 240);
			wave.spawnBacklog = (wave.spawnBacklog ?? 0) + tickSpawns;

			wave.currentTickIndex++;

			// Spawn the boss at the end of the spawn window (tick 240)
			if (wave.currentTickIndex === 240 && isBossWave) {
				wave.bossPending = true;
			}
		}
	}

	// Attempt to spawn backlogged normal enemies
	while ((wave.spawnBacklog ?? 0) > 0 && state.enemies.length < MAX_ACTIVE_ENEMIES) {
		spawnEnemy(state, false);
		wave.spawnBacklog = (wave.spawnBacklog ?? 0) - 1;
	}

	// Try to spawn pending boss when active cap allows
	if (wave.bossPending && state.enemies.length < MAX_ACTIVE_ENEMIES) {
		spawnEnemy(state, true);
		wave.bossPending = false;
	}

	// Wave completion check
	const completedSpawning = wave.currentTickIndex !== undefined && wave.currentTickIndex >= 240;
	const backlogEmpty = (wave.spawnBacklog ?? 0) === 0;
	const bossDone = !wave.bossPending;
	const allKilled = wave.enemiesKilled >= wave.enemiesInWave && state.enemies.length === 0;

	if (completedSpawning && backlogEmpty && bossDone && allKilled) {
		wave.waveActive = false;
		wave.subWaveActive = false;
		wave.betweenWaveTimer = 0;

		// Award wave completion energy
		const energyBonus = getWaveCompletionBonus(state, wave.currentWave);
		state.cash += energyBonus;
		state.totalEnergyEarned += energyBonus;
		// Award wave completion alloy (primary alloy source), doubled for relevant challenges
		const alloyMult = (state.activeChallenge === ChallengeId.GlassTower || state.activeChallenge === ChallengeId.BossRush) ? 2 : 1;
		state.coins += Math.floor(getWaveCoinReward(state, wave.currentWave) * alloyMult);

		// Wave completion healing: healAfterWave = max(30, round(maxHp * 0.25)), capped at max HP
		const healAfterWave = Math.max(30, Math.round(state.tower.maxHp * 0.25));
		state.tower.hp = Math.min(state.tower.hp + healAfterWave, state.tower.maxHp);
	}
}

function spawnEnemy(state: GameState, forceBoss: boolean): void {
	const challenge = state.activeChallenge;
	let type: EnemyType;

	const front = state.tier ?? 1;
	const waveNum = state.wave.currentWave;

	if (forceBoss) {
		type = EnemyType.Boss;
	} else {
		const types = availableEnemyTypes(waveNum, front);
		// FastSwarm: force all non-boss spawns to Fast type
		type = (challenge === ChallengeId.FastSwarm)
			? EnemyType.Fast
			: (types.length === 1 ? types[0]! : types[Math.floor(Math.random() * types.length)]!);
	}

	const isBoss = type === EnemyType.Boss;
	const isShiny = !isBoss && Math.random() < 0.05;

	const { x, y } = getSpawnPosition(state);
	const enemy = createEnemy(type, waveNum, x, y, state.tier ?? 1, isShiny);

	// Apply challenge modifiers
	if (challenge === ChallengeId.FastSwarm) {
		enemy.speed *= 2;
	} else if (challenge === ChallengeId.GlassTower) {
		enemy.hp = Math.max(1, Math.floor(enemy.hp * 0.5));
		enemy.maxHp = Math.max(1, Math.floor(enemy.maxHp * 0.5));
		enemy.coinReward = Math.floor(enemy.coinReward * 2);
	} else if (challenge === ChallengeId.BossRush && isBoss) {
		enemy.reward = Math.floor(enemy.reward * 3);
		enemy.coinReward = Math.floor(enemy.coinReward * 3);
	}

	state.enemies.push(enemy);
	state.wave.enemiesSpawned++;
	state.wave.enemiesSpawnedInSubWave++;
}

function getSpawnPosition(state: GameState): { x: number; y: number } {
	const w = state.viewWidth || 800;
	const h = state.viewHeight || 800;
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
