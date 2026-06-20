import type { Enemy, Projectile } from '../engine/gameTypes';
import { calculateEffectiveDamage } from '../balance/balanceMath';

export type DamageSourceKind = 'projectile' | 'thorns' | 'effect';

export interface DamageContext {
	kind: DamageSourceKind;
	baseDamage: number;
	isCrit?: boolean;
	armorPierce?: number;
	masteryBonus?: number;
	distance?: number;
	maxDistance?: number;
	distanceFalloff?: number;
	multiplier?: number;
	minDamage?: number;
	tags?: readonly string[];
}

export interface DamageResult {
	rawDamage: number;
	armor: number;
	armorAfterPierce: number;
	masteryMultiplier: number;
	distanceMultiplier: number;
	finalDamage: number;
	isCrit: boolean;
	tags: readonly string[];
}

export function createProjectileDamageContext(
	projectile: Projectile,
	target: Enemy,
	masteryBonus = 0,
	distance = 0
): DamageContext {
	return {
		kind: 'projectile',
		baseDamage: projectile.damage,
		isCrit: projectile.isCrit,
		armorPierce: projectile.armorPierce ?? 0,
		masteryBonus,
		distance,
		maxDistance: projectile.maxDistance,
		distanceFalloff: projectile.distanceFalloff,
		multiplier: projectile.damageMultiplier ?? 1,
		minDamage: 1,
		tags: projectile.tags ?? [target.type],
	};
}

export function calculateEnemyDamage(target: Enemy, context: DamageContext): DamageResult {
	const armorPierce = Math.max(0, context.armorPierce ?? 0);
	const armorAfterPierce = Math.max(0, target.armor - armorPierce);
	const masteryMultiplier = 1 + (context.masteryBonus ?? 0);
	const distanceMultiplier = getDistanceMultiplier(context);
	const rawDamage = context.baseDamage * (context.multiplier ?? 1);
	const finalDamage = calculateEffectiveDamage(
		rawDamage,
		target.armor,
		armorPierce,
		context.masteryBonus ?? 0,
		distanceMultiplier,
		context.minDamage ?? 1
	);

	return {
		rawDamage,
		armor: target.armor,
		armorAfterPierce,
		masteryMultiplier,
		distanceMultiplier,
		finalDamage,
		isCrit: !!context.isCrit,
		tags: context.tags ?? [],
	};
}

function getDistanceMultiplier(context: DamageContext): number {
	if (!context.maxDistance || !context.distanceFalloff || context.maxDistance <= 0) return 1;
	const pct = Math.min(1, Math.max(0, (context.distance ?? 0) / context.maxDistance));
	return Math.max(0, 1 - pct * context.distanceFalloff);
}
