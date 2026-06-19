import { EnemyType } from '../engine/gameTypes';
import { getMasteryLevel, MASTERY_THRESHOLDS } from './balanceMath';

export const ENEMY_TYPE_LABELS: Record<EnemyType, string> = {
	[EnemyType.Normal]: 'Square',
	[EnemyType.Fast]: 'Diamond',
	[EnemyType.Tank]: 'Hexagon',
	[EnemyType.Ranged]: 'Triangle',
	[EnemyType.Boss]: 'Pentagon',
};

export const MASTERY_REWARDS = [100, 500, 2500, 10000, 50000];

export interface MasteryReward { key: string; alloy: number; name: string; }

export function checkMasteryAchievements(
	claimed: Partial<Record<string, boolean>>,
	killsByType: Partial<Record<EnemyType, number>>
): MasteryReward[] {
	const earned: MasteryReward[] = [];
	for (const type of Object.values(EnemyType)) {
		const kills = killsByType[type] ?? 0;
		const level = getMasteryLevel(kills);
		for (let l = 1; l <= level; l++) {
			const key = `mastery_${type}_${l}`;
			if (!claimed[key]) {
				earned.push({
					key,
					alloy: MASTERY_REWARDS[l - 1] ?? 0,
					name: `${ENEMY_TYPE_LABELS[type]} Mastery ${l}`,
				});
			}
		}
	}
	return earned;
}

export function getMasteryProgress(kills: number): { level: number; next: number; pct: number } {
	const level = getMasteryLevel(kills);
	if (level >= MASTERY_THRESHOLDS.length) return { level, next: 0, pct: 100 };
	const prev = level === 0 ? 0 : MASTERY_THRESHOLDS[level - 1]!;
	const next = MASTERY_THRESHOLDS[level]!;
	const pct = Math.min(100, ((kills - prev) / (next - prev)) * 100);
	return { level, next, pct };
}
