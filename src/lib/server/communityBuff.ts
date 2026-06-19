import { randomUUID } from 'node:crypto';
import type { Db } from './db';

export const COMMUNITY_BUFF_CAP_PERCENT = 100;
export const COMMUNITY_BUFF_DAYS = 7;

export type CommunityBuffSummary = {
	activePercent: number;
	capPercent: number;
	activeUntil: string | null;
	activeEvents: number;
	sourceSummary: string;
};

type BuffRow = {
	percent: number;
	expires_at: string;
};

export function calculateCommunityBuff(events: BuffRow[], now = new Date()): CommunityBuffSummary {
	const active = events.filter((event) => {
		const expires = Date.parse(event.expires_at);
		return Number.isFinite(expires) && expires > now.getTime() && event.percent > 0;
	});
	const total = active.reduce((sum, event) => sum + event.percent, 0);
	// Preserve fractional EUR amounts (e.g. a 3.5 EUR support = 3.5%). Round to
	// two decimals to shed float noise, then clamp to the global cap.
	const rounded = Math.round((total + Number.EPSILON) * 100) / 100;
	const activePercent = Math.min(COMMUNITY_BUFF_CAP_PERCENT, Math.max(0, rounded));
	const activeUntil = active
		.map((event) => event.expires_at)
		.sort()
		.at(-1) ?? null;
	return {
		activePercent,
		capPercent: COMMUNITY_BUFF_CAP_PERCENT,
		activeUntil,
		activeEvents: active.length,
		sourceSummary: active.length > 0 ? 'Community Ko-fi Alloy signal' : 'No active community buff'
	};
}

export function getCommunityBuff(db: Db, now = new Date()): CommunityBuffSummary {
	const rows = db.prepare(`
SELECT percent, expires_at
FROM community_buff_events
WHERE starts_at <= ? AND expires_at > ?
`).all(now.toISOString(), now.toISOString()) as BuffRow[];
	return calculateCommunityBuff(rows, now);
}

export function insertCommunityBuffEvent(db: Db, source: string, sourceRef: string, percent: number, startsAt = new Date()): void {
	const expiresAt = new Date(startsAt.getTime() + COMMUNITY_BUFF_DAYS * 24 * 60 * 60 * 1000);
	db.prepare(`
INSERT INTO community_buff_events (id, source, source_ref, percent, starts_at, expires_at, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(randomUUID(), source, sourceRef, percent, startsAt.toISOString(), expiresAt.toISOString(), startsAt.toISOString());
}
