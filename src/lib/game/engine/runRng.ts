/**
 * Deterministic pseudo-random stream for one gameplay run.
 *
 * This is not a security primitive. The seed is intentionally observable so
 * a future server-side verifier/replay can reproduce the same run.
 */
export interface RunRngState {
	seed: number;
	state: number;
	calls: number;
}

export function normalizeSeed(seed: number): number {
	const integer = Number.isFinite(seed) ? Math.trunc(seed) : 0;
	return integer >>> 0;
}

export function createRandomSeed(): number {
	if (typeof globalThis.crypto?.getRandomValues === 'function') {
		const values = new Uint32Array(1);
		globalThis.crypto.getRandomValues(values);
		return values[0] ?? 0;
	}

	const timestamp = Date.now() >>> 0;
	const performanceTime = typeof performance === 'undefined'
		? 0
		: Math.floor(performance.now() * 1000) >>> 0;
	return (timestamp ^ performanceTime ^ Math.floor(Math.random() * 0x1_0000_0000)) >>> 0;
}

export function createRunRng(seed?: number): RunRngState {
	const normalizedSeed = normalizeSeed(seed ?? createRandomSeed());
	return {
		seed: normalizedSeed,
		state: normalizedSeed,
		calls: 0,
	};
}

/** Return the next value in [0, 1) and advance the run stream. */
export function nextRunRandom(rng?: RunRngState): number {
	// Raw GameState fixtures and isolated balance helpers may not have a run
	// stream yet. Keep those callers backwards-compatible; a live GameEngine
	// always initializes rngState in startRun().
	if (!rng) return Math.random();

	let value = (rng.state + 0x6D2B79F5) >>> 0;
	rng.state = value;
	value = Math.imul(value ^ (value >>> 15), value | 1);
	value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
	rng.calls++;
	return ((value ^ (value >>> 14)) >>> 0) / 0x1_0000_0000;
}
