import { ChallengeId, type ChallengeDef } from '../engine/gameTypes';

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
		description: 'Tower has 1 HP. Enemies are 50% weaker but double coin rewards. Command calls this "risk-reward optimization." The shapes call it "target practice."',
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
