import { ChallengeId } from '../engine/gameTypes';

/** Versioned contract shared by the ranked client and the server validator. */
export const VERIFIED_RULESET_VERSION = 'verified-v1';

/**
 * Ranked challenges deliberately use a fixed loadout and Front 1. Permanent
 * upgrades, Field purchases, skins, viewport size, and client-provided seeds
 * are therefore excluded from the official result.
 */
export type VerifiedChallengeDefinition = {
	id: ChallengeId;
	name: string;
	description: string;
	icon: string;
	tier: 1;
	seed: number;
	durationSeconds: 180;
};

export const VERIFIED_CHALLENGES: readonly VerifiedChallengeDefinition[] = [
	{
		id: ChallengeId.FastSwarm,
		name: 'Fast Swarm',
		description: 'Fixed Front 1 loadout. Fast enemies, double speed, triple spawn rate.',
		icon: '🌪️',
		tier: 1,
		seed: 0x4b544f31,
		durationSeconds: 180,
	},
	{
		id: ChallengeId.GlassTower,
		name: 'Glass Tower',
		description: 'Fixed Front 1 loadout. One HP, weaker enemies, doubled Alloy rewards.',
		icon: '🔮',
		tier: 1,
		seed: 0x4b544f32,
		durationSeconds: 180,
	},
	{
		id: ChallengeId.BossRush,
		name: 'Boss Rush',
		description: 'Fixed Front 1 loadout. Every wave contains a boss.',
		icon: '👑',
		tier: 1,
		seed: 0x4b544f33,
		durationSeconds: 180,
	},
];

export function getVerifiedChallenge(id: string | ChallengeId): VerifiedChallengeDefinition | null {
	return VERIFIED_CHALLENGES.find((challenge) => challenge.id === id) ?? null;
}

/** Official score formula. The server recalculates it after replay validation. */
export function calculateVerifiedChallengeScore(input: { wave: number; kills: number; bosses: number }): number {
	return Math.max(0, input.wave) * 1000 + Math.max(0, input.kills) * 10 + Math.max(0, input.bosses) * 2500;
}
