export type SparkVector = {
	x: number;
	y: number;
	d: number;
};

export type ShardVector = {
	tx: number;
	ty: number;
	r: number;
	d: number;
	s: number;
};

export const TIER_WORDS = [
	'STREAK!',
	'RAMPAGE!',
	'DOMINATING!',
	'UNSTOPPABLE!',
	'GODLIKE!',
	'LEGENDARY!',
	'INFERNO!',
	'ANNIHILATION!',
	'TRANSCENDENT!',
] as const;

// Replayed inside every digit column whose character changes.
export const KILL_SPARKS: SparkVector[] = [
	{ x: 8, y: -14, d: 0 },
	{ x: 16, y: -4, d: 14 },
	{ x: 14, y: 8, d: 6 },
	{ x: 2, y: 16, d: 20 },
	{ x: -10, y: 12, d: 10 },
	{ x: 18, y: 2, d: 24 },
];

// Outro debris: fixed radial vectors so the shatter reads consistently.
export const SHATTER_SHARDS: ShardVector[] = [
	{ tx: -46, ty: -34, r: -220, d: 0, s: 1.15 },
	{ tx: -18, ty: -52, r: 180, d: 18, s: 0.85 },
	{ tx: 20, ty: -50, r: 260, d: 6, s: 1.0 },
	{ tx: 52, ty: -30, r: -180, d: 24, s: 0.9 },
	{ tx: 64, ty: 4, r: 300, d: 12, s: 1.1 },
	{ tx: 50, ty: 36, r: -260, d: 30, s: 0.8 },
	{ tx: 16, ty: 54, r: 200, d: 8, s: 1.05 },
	{ tx: -22, ty: 52, r: -300, d: 22, s: 0.9 },
	{ tx: -54, ty: 30, r: 240, d: 14, s: 1.0 },
	{ tx: -64, ty: -4, r: -200, d: 4, s: 0.85 },
	{ tx: 0, ty: -64, r: 160, d: 28, s: 0.7 },
	{ tx: 0, ty: 64, r: -160, d: 16, s: 0.7 },
];
