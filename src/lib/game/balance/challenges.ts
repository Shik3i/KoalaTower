import { ChallengeId, TierId, type ChallengeDef } from '../engine/gameTypes';

type FrontBestWave = Partial<Record<TierId, number>>;

interface ChallengeUnlockReq {
	front: TierId;
	wave: number;
	label: string;
}

export const CHALLENGE_UNLOCK_REQS: Record<ChallengeId, ChallengeUnlockReq> = {
	[ChallengeId.FastSwarm]: { front: TierId.Tier2, wave: 100, label: 'Reach Wave 100 on Tier 2' },
	[ChallengeId.GlassTower]: { front: TierId.Tier3, wave: 50,  label: 'Reach Wave 50 on Tier 3' },
	[ChallengeId.BossRush]:   { front: TierId.Tier3, wave: 100, label: 'Reach Wave 100 on Tier 3' },
};

export function isChallengeUnlocked(id: ChallengeId, frontBestWave: FrontBestWave): boolean {
	const req = CHALLENGE_UNLOCK_REQS[id];
	return (frontBestWave[req.front] ?? 0) >= req.wave;
}

/** Runtime spawn multiplier for challenges that change wave pressure. */
export function getChallengeSpawnMultiplier(id: ChallengeId | null): number {
	return id === ChallengeId.FastSwarm ? 3 : 1;
}

export const CHALLENGES: ChallengeDef[] = [
	{
		id: ChallengeId.FastSwarm,
		name: 'Fast Swarm',
		description: 'All hostiles are Fast-type with double speed and triple spawn rate. Orbital Command classifies this as "agility assessment." The shapes classify it as "lunch."',
		icon: '🌪️',
		locked: true,
		highScore: 0,
		modifiers: ['allFast', 'doubleSpeed', 'tripleSpawn'],
	},
	{
		id: ChallengeId.GlassTower,
		name: 'Glass Tower',
		description: 'Tower has 1 HP. Enemies are 50% weaker but double Alloy rewards. Command calls this "risk-reward optimization." The shapes call it "target practice."',
		icon: '🔮',
		locked: true,
		highScore: 0,
		modifiers: ['glassTower', 'weakEnemies', 'doubleCoins'],
	},
	{
		id: ChallengeId.BossRush,
		name: 'Boss Rush',
		description: 'Every wave is a boss wave with increased rewards. Orbital Command\'s official stance: "We meant to do this." Morale-safety classification: Yellow/Questionable.',
		icon: '👑',
		locked: true,
		highScore: 0,
		modifiers: ['bossEveryWave', 'increasedBossRewards'],
	},
];
