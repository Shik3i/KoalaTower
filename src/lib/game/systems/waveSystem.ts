/**
 * waveSystem.ts — Wave lifecycle management.
 *
 * Handles: starting waves, spawning enemies over time, sub-wave pacing,
 * boss spawning, wave-completion gold bonus.
 */

import { ChallengeId, EnemyType, type GameState } from '../engine/gameTypes';
import {
	createEnemy,
	resetEnemyIdCounter,
} from '../balance/enemies';
import {
	SPAWN_TICK_SECONDS,
	SPAWN_TICKS_PER_WAVE,
	MAX_ACTIVE_ENEMIES,
	baseSpawnChancePercent,
	spawnDensityMultiplier,
	availableEnemyTypes,
} from '../balance/balanceMath';
import { getChallengeSpawnMultiplier } from '../balance/challenges';
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

	state.wave.enemiesInWave = 0;
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
	state.wave.enemiesInSubWave = 0;
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

	// Tick-random spawning: every 1/8 second rolls once against the wave spawn chance.
	if (wave.currentTickIndex !== undefined && wave.currentTickIndex < SPAWN_TICKS_PER_WAVE) {
		wave.spawnTimer += dt;
		while (wave.spawnTimer >= SPAWN_TICK_SECONDS && wave.currentTickIndex < SPAWN_TICKS_PER_WAVE) {
			wave.spawnTimer -= SPAWN_TICK_SECONDS;

			const spawnCount = getSpawnCountForTick(wave.currentWave, state.tier ?? 1, state.activeChallenge);
			wave.spawnBacklog = (wave.spawnBacklog ?? 0) + spawnCount;
			wave.enemiesInWave += spawnCount;
			wave.enemiesInSubWave += spawnCount;

			wave.currentTickIndex++;

			// Spawn the boss at the end of the spawn window (tick 240)
			if (wave.currentTickIndex === SPAWN_TICKS_PER_WAVE && isBossWave) {
				wave.bossPending = true;
				if ((wave.spawnBacklog ?? 0) > 0) {
					wave.spawnBacklog = (wave.spawnBacklog ?? 0) - 1;
				} else {
					wave.enemiesInWave++;
					wave.enemiesInSubWave++;
				}
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
	const completedSpawning = wave.currentTickIndex !== undefined && wave.currentTickIndex >= SPAWN_TICKS_PER_WAVE;
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

/**
 * Roll the number of enemies scheduled by one spawn tick. Fractional expected
 * counts are Bernoulli-rounded; values above one schedule multiple enemies in
 * the same tick so high Front density does not silently disappear at the
 * eight-rolls-per-second ceiling.
 */
export function getSpawnCountForTick(
	wave: number,
	front: number,
	challenge: ChallengeId | null = null,
	random: () => number = Math.random
): number {
	const expected = (baseSpawnChancePercent(wave) / 100)
		* spawnDensityMultiplier(front)
		* getChallengeSpawnMultiplier(challenge);
	const guaranteed = Math.floor(expected);
	const fractional = expected - guaranteed;
	return guaranteed + (fractional > 0 && random() < fractional ? 1 : 0);
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
	// In-place compact: swap dead enemies with the last alive element and pop.
	// Avoids allocating a new array via filter() every frame.
	let i = state.enemies.length;
	while (i-- > 0) {
		if (!state.enemies[i]!.alive) {
			const li = state.enemies.length - 1;
			if (i !== li) state.enemies[i] = state.enemies[li]!;
			state.enemies.pop();
		}
	}
}
