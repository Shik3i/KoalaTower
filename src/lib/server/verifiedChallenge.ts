import { createHash } from 'node:crypto';
import { calculateVerifiedChallengeScore, getVerifiedChallenge, VERIFIED_RULESET_VERSION, type VerifiedChallengeDefinition } from '$lib/game/balance/verifiedChallenges';
import { GAME_CONFIG } from '$lib/game/engine/gameConfig';
import { GameEngine } from '$lib/game/engine/GameEngine';

export type VerifiedReplayResult = {
	wave: number;
	kills: number;
	bosses: number;
	elapsedTime: number;
	gameOver: boolean;
	score: number;
	verificationHash: string;
};

export type VerifiedReplaySubmission = {
	wave: number;
	kills: number;
	bosses: number;
};

export function getVerifiedRulesetHash(challenge: VerifiedChallengeDefinition): string {
	return createHash('sha256')
		.update([
			VERIFIED_RULESET_VERSION,
			challenge.id,
			challenge.tier,
			challenge.seed,
			challenge.durationSeconds,
			GAME_CONFIG.VIEW_WIDTH,
			GAME_CONFIG.VIEW_HEIGHT,
			GAME_CONFIG.VERIFIED_STEP_SECONDS,
			'fixed-loadout',
		].join('|'))
		.digest('hex');
}

/**
 * Replays the exact ranked contract in Node. GameEngine is intentionally a
 * pure simulation dependency here; no Pixi renderer or browser state is used.
 */
export function simulateVerifiedChallenge(challenge: VerifiedChallengeDefinition): VerifiedReplayResult {
	const engine = new GameEngine();
	engine.startRun(
		{},
		{},
		{},
		0,
		[],
		challenge.tier,
		challenge.id,
		{},
		'classic',
		'void',
		challenge.seed,
		true
	);
	engine.setSpeed(1);

	const maxSteps = Math.ceil(challenge.durationSeconds / GAME_CONFIG.VERIFIED_STEP_SECONDS);
	for (let step = 0; step < maxSteps && engine.state.runActive && !engine.state.gameOver; step++) {
		engine.update(GAME_CONFIG.VERIFIED_STEP_SECONDS);
	}

	const result = {
		wave: engine.state.wave.currentWave,
		kills: engine.state.killCount,
		bosses: engine.state.bossesDefeated,
		elapsedTime: engine.state.elapsedTime,
		gameOver: engine.state.gameOver,
	};
	return {
		...result,
		score: calculateVerifiedChallengeScore(result),
		verificationHash: createHash('sha256')
			.update(`${getVerifiedRulesetHash(challenge)}|${result.wave}|${result.kills}|${result.bosses}|${Math.round(result.elapsedTime * 1000)}`)
			.digest('hex'),
	};
}

export function validateVerifiedReplay(
	challengeId: string,
	submission: VerifiedReplaySubmission
): { ok: true; challenge: VerifiedChallengeDefinition; result: VerifiedReplayResult } | { ok: false; message: string } {
	const challenge = getVerifiedChallenge(challengeId);
	if (!challenge) return { ok: false, message: 'Unknown verified challenge' };

	const result = simulateVerifiedChallenge(challenge);
	const replayCompleted = result.gameOver || result.elapsedTime >= challenge.durationSeconds;
	if (!replayCompleted) return { ok: false, message: 'Verified challenge replay did not complete' };
	if (submission.wave !== result.wave || submission.kills !== result.kills || submission.bosses !== result.bosses) {
		return { ok: false, message: 'Replay result does not match the server simulation' };
	}
	return { ok: true, challenge, result };
}
