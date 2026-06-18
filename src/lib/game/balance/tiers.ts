/**
 * tiers.ts — Front definitions (16 Fronts across 4 bands).
 *
 * Fronts are grouped into four bands of four. Within a band the Fronts escalate
 * with a 0–3 star rating; crossing into a new band is the hard wall.
 *
 *   Perimeter  (Fronts 1–4)   entry combat zone — clean military blue/cyan
 *   Redline    (Fronts 5–8)   harsher war zone — red/orange, Armor appears
 *   Blacksite  (Fronts 9–12)  classified — purple/magenta, Resistance appears
 *   Anomaly    (Fronts 13–16) unstable endgame — white/prismatic/crimson
 *
 * Unlock rules: each Front needs you to reach a wave on the PREVIOUS Front.
 * Most gates are Wave 100, but the first Front of each new band is harder:
 *   Front 5  ← Wave 200 on Front 4
 *   Front 9  ← Wave 300 on Front 8
 *   Front 13 ← Wave 400 on Front 12
 *
 * Core loop: farm an easier Front for Alloy + Schematics, push the gate on your
 * current Front, then graduate to the harder, better-paying Front.
 */

import { TierId, FrontBand, type TierDef } from '../engine/gameTypes';

/** Stable Front ordering — index+1 is the numeric Front (1–16) used by balance math. */
export const FRONT_ORDER: TierId[] = [
	TierId.Tier1, TierId.Tier2, TierId.Tier3, TierId.Tier4,
	TierId.Tier5, TierId.Tier6, TierId.Tier7, TierId.Tier8,
	TierId.Tier9, TierId.Tier10, TierId.Tier11, TierId.Tier12,
	TierId.Tier13, TierId.Tier14, TierId.Tier15, TierId.Tier16,
];

export const FRONT_COUNT = FRONT_ORDER.length;

export interface FrontBandDef {
	band: FrontBand;
	/** Display label for the band. */
	label: string;
	/** Primary band color (hex string) — drives the shared Front icon tint. */
	color: string;
	/** Secondary accent for gradients / stars. */
	accent: string;
	/** One-line band identity used in tooltips and the Fronts archive. */
	identity: string;
}

export const FRONT_BANDS: Record<FrontBand, FrontBandDef> = {
	[FrontBand.Perimeter]: {
		band: FrontBand.Perimeter, label: 'Perimeter', color: '#00d8ff', accent: '#3b82f6',
		identity: 'Entry combat zone. The shapes here are curious, not coordinated.',
	},
	[FrontBand.Redline]: {
		band: FrontBand.Redline, label: 'Redline', color: '#ff5a3c', accent: '#ff9e2c',
		identity: 'Harsher war zone. Armor enters the field. Things start hitting back.',
	},
	[FrontBand.Blacksite]: {
		band: FrontBand.Blacksite, label: 'Blacksite', color: '#b15cff', accent: '#ff3ce0',
		identity: 'Classified geometry. Resistance and Front modifiers become the rule.',
	},
	[FrontBand.Anomaly]: {
		band: FrontBand.Anomaly, label: 'Anomaly', color: '#f5f5ff', accent: '#ff2b5e',
		identity: 'Unstable endgame. Immunities and anomaly rules. Survival is theoretical.',
	},
};

export interface FrontMeta {
	id: TierId;
	/** Numeric Front 1–16. */
	front: number;
	band: FrontBand;
	/** 0–3 stars within the band. */
	stars: number;
	/** User-facing display name, e.g. "Perimeter ★★". */
	displayName: string;
}

const STAR = '★';

function bandForFront(front: number): FrontBand {
	if (front <= 4) return FrontBand.Perimeter;
	if (front <= 8) return FrontBand.Redline;
	if (front <= 12) return FrontBand.Blacksite;
	return FrontBand.Anomaly;
}

function starsForFront(front: number): number {
	return (front - 1) % 4; // 0,1,2,3 within each band
}

/** Build the display name like "Redline ★★". */
function frontDisplayName(front: number): string {
	const band = FRONT_BANDS[bandForFront(front)].label;
	const stars = starsForFront(front);
	return stars > 0 ? `${band} ${STAR.repeat(stars)}` : band;
}

/** Per-Front metadata (band, stars, display name) keyed by Front number 1–16. */
export const FRONT_META: FrontMeta[] = FRONT_ORDER.map((id, idx) => {
	const front = idx + 1;
	return {
		id,
		front,
		band: bandForFront(front),
		stars: starsForFront(front),
		displayName: frontDisplayName(front),
	};
});

const metaById = new Map<TierId, FrontMeta>();
for (const m of FRONT_META) metaById.set(m.id, m);

export function getFrontMeta(id: TierId): FrontMeta {
	return metaById.get(id) ?? FRONT_META[0]!;
}

/** Numeric Front (1–16) for a TierId — feeds getTierMultiplier / createEnemy. */
export function getTierNumber(id: TierId): number {
	const idx = FRONT_ORDER.indexOf(id);
	return idx < 0 ? 1 : idx + 1;
}

/** TierId for a numeric Front (1–16); clamps out-of-range to Front 1. */
export function frontToTierId(front: number): TierId {
	return FRONT_ORDER[Math.max(0, Math.min(FRONT_ORDER.length - 1, front - 1))]!;
}

/** User-facing Front name, e.g. "Perimeter ★★". */
export function getFrontName(id: TierId): string {
	return getFrontMeta(id).displayName;
}

export function getFrontBandDef(id: TierId): FrontBandDef {
	return FRONT_BANDS[getFrontMeta(id).band];
}

export function getTierDef(id: TierId): TierDef | undefined {
	return TIERS.find(t => t.id === id);
}

/** Legacy default gate (most Fronts). Band-transition Fronts override this. */
export const FRONT_UNLOCK_WAVE = 100;

/**
 * Wave that must be reached on the PREVIOUS Front to unlock Front `front`.
 * Front 1 is always open (returns 0). Band transitions are harder.
 */
export function getFrontUnlockWave(front: number): number {
	if (front <= 1) return 0;
	if (front === 5) return 200;   // → Redline
	if (front === 9) return 300;   // → Blacksite
	if (front === 13) return 400;  // → Anomaly
	return FRONT_UNLOCK_WAVE;
}

/** The Front immediately before `id`, or null for Front 1. */
export function getPreviousFront(id: TierId): TierId | null {
	const idx = FRONT_ORDER.indexOf(id);
	return idx > 0 ? FRONT_ORDER[idx - 1]! : null;
}

type FrontBestWave = Partial<Record<TierId, number>>;

/**
 * Fronts unlock SEQUENTIALLY: Front 1 is always open; every later Front
 * requires reaching getFrontUnlockWave(front) on the Front directly before it.
 */
export function isFrontUnlocked(id: TierId, frontBestWave: FrontBestWave): boolean {
	const prev = getPreviousFront(id);
	if (prev === null) return true; // Front 1
	const front = getTierNumber(id);
	return (frontBestWave[prev] ?? 0) >= getFrontUnlockWave(front);
}

/** All Fronts currently unlocked given per-Front best waves. */
export function getUnlockedFronts(frontBestWave: FrontBestWave): TierId[] {
	const unlocked: TierId[] = [];
	for (const id of FRONT_ORDER) {
		if (isFrontUnlocked(id, frontBestWave)) unlocked.push(id);
		else break; // sequential — stop at the first locked Front
	}
	return unlocked;
}

/** Human-readable unlock requirement for a locked Front. */
export function describeFrontUnlock(id: TierId): string {
	const prev = getPreviousFront(id);
	if (prev === null) return 'Always available';
	const front = getTierNumber(id);
	return `Reach Wave ${getFrontUnlockWave(front)} on ${getFrontName(prev)}`;
}

// ─── Front flavor copy ───────────────────────────────────────────────────────
// One line per Front. Earlier Fronts keep their original voice; later Fronts are
// scaffolded with band-appropriate dry menace.

const FRONT_FLAVOR: Record<number, string> = {
	1: 'The shapes here are curious, not coordinated. Orbital Command considers this the tutorial. The shapes consider it an appetizer.',
	2: 'The shapes have started reading our deployment patterns. Orbital Command has started reading their resignation letters.',
	3: 'The geometry here has a formal complaint department. You are its only case.',
	4: 'The last clean stretch of the Perimeter. Past here the maps stop being polite.',
	5: 'Redline. The air tastes like ablative plating. Armor is now a problem you own.',
	6: 'Armored geometry, more of it, angrier. Command calls this "expected attrition."',
	7: 'The shapes have hired a strategist. The strategist has hired the shapes.',
	8: 'End of the Redline. Whatever opens next was redacted from your briefing.',
	9: 'Blacksite. Nothing here is supposed to exist, including the resistance values.',
	10: 'Damage types start to matter. So does reading the fine print.',
	11: 'The geometry resists. Specifically: you.',
	12: 'Last Blacksite Front. The next door is labeled only with a warning.',
	13: 'Anomaly. The rules are written in a hand that was already dead.',
	14: 'Immunities. Modifiers. Things that should not have corners do.',
	15: 'Orbital Command describes this as "theoretically survivable."',
	16: 'The end of the map. The shapes describe it as "finally, a challenge."',
};

/**
 * The 16 Front definitions, generated from band/star metadata. `name` is the
 * user-facing display name; `description` carries band identity + flavor.
 * `waveRequirement` is the gate on the PREVIOUS Front.
 */
export const TIERS: TierDef[] = FRONT_META.map((m) => {
	const band = FRONT_BANDS[m.band];
	const front = m.front;
	const reqWave = getFrontUnlockWave(front);
	const alloyMult = 1.0 + (front - 1) * 0.2;
	return {
		id: m.id,
		name: m.displayName,
		description: `${band.identity} ${FRONT_FLAVOR[front] ?? ''}`.trim(),
		waveRequirement: reqWave,
		unlocked: front === 1,
		rewards: [
			`×${alloyMult.toFixed(1)} Alloy`,
			`${m.displayName} Schematics`,
			front === 1 ? 'Baseline difficulty' : `Front ${front} difficulty`,
		],
	};
});
