/**
 * Fun/community score only. This value is intentionally not used for
 * progression or official ranking; the client can still alter it.
 */
export function calculateUnverifiedScore(input: {
	front: number;
	wave: number;
	kills: number;
	bosses: number;
}): number {
	const front = Math.max(1, Math.floor(Number.isFinite(input.front) ? input.front : 1));
	const wave = Math.max(0, Math.floor(Number.isFinite(input.wave) ? input.wave : 0));
	const kills = Math.max(0, Math.floor(Number.isFinite(input.kills) ? input.kills : 0));
	const bosses = Math.max(0, Math.floor(Number.isFinite(input.bosses) ? input.bosses : 0));
	return front * 100 + wave * 1_000 + kills * 10 + bosses * 2_500;
}
