import { ChallengeId, type ChallengeDef } from '../engine/gameTypes';

export const CHALLENGES: ChallengeDef[] = [
	{
		id: ChallengeId.FastSwarm,
		name: 'Fast Swarm',
		description: 'All enemies are Fast type. Double speed. Triple spawn rate.',
		icon: '🌪️',
		locked: true,
		highScore: 0,
		modifiers: ['allFast', 'doubleSpeed', 'tripleSpawn'],
	},
	{
		id: ChallengeId.GlassTower,
		name: 'Glass Tower',
		description: 'Tower has 1 HP. Enemies are 50% weaker. Double coin rewards.',
		icon: '🔮',
		locked: true,
		highScore: 0,
		modifiers: ['glassTower', 'weakEnemies', 'doubleCoins'],
	},
	{
		id: ChallengeId.BossRush,
		name: 'Boss Rush',
		description: 'Every wave is a boss wave. Increased boss rewards.',
		icon: '👑',
		locked: true,
		highScore: 0,
		modifiers: ['bossEveryWave', 'increasedBossRewards'],
	},
];
