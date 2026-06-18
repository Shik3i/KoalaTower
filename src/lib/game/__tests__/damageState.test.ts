import { describe, it, expect } from 'vitest';
import { getEnemyDamageTier } from '../render/EnemyRenderer';

describe('getEnemyDamageTier — HP-ratio damage state (no HP bars)', () => {
	it('reports tier 0 (healthy) for full or near-full HP', () => {
		expect(getEnemyDamageTier(100, 100)).toBe(0);
		expect(getEnemyDamageTier(95, 100)).toBe(0);
		expect(getEnemyDamageTier(51, 100)).toBe(0);
	});

	it('reports tier 1 (damaged) at exactly 50% and below', () => {
		expect(getEnemyDamageTier(50, 100)).toBe(1);
		expect(getEnemyDamageTier(40, 100)).toBe(1);
		expect(getEnemyDamageTier(26, 100)).toBe(1);
	});

	it('reports tier 2 (critical) at 25% and below', () => {
		expect(getEnemyDamageTier(25, 100)).toBe(2);
		expect(getEnemyDamageTier(10, 100)).toBe(2);
		expect(getEnemyDamageTier(1, 100)).toBe(2);
		expect(getEnemyDamageTier(0, 100)).toBe(2);
	});

	it('always reports tier 0 for bosses — boss body has its own HP bar', () => {
		expect(getEnemyDamageTier(5000, 10000, true)).toBe(0);
		expect(getEnemyDamageTier(1, 10000, true)).toBe(0);
	});

	it('does not crash for missing / non-finite / zero-max HP edge cases', () => {
		expect(getEnemyDamageTier(0, 0)).toBe(0);
		expect(getEnemyDamageTier(NaN, 100)).toBe(0);
		expect(getEnemyDamageTier(100, NaN)).toBe(0);
		expect(getEnemyDamageTier(Infinity, 100)).toBe(0);
		expect(getEnemyDamageTier(50, -50)).toBe(0);
	});
});
