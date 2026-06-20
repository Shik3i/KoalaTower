import { createHash } from 'node:crypto';
import type { Db } from './db';

export type SupportCodeOwner = {
	ownerType: 'local_identity' | 'account';
	ownerId: string;
};

export function createSupportCode(ownerType: 'local_identity' | 'account', ownerId: string): string {
	const digest = createHash('sha256').update(`${ownerType}:${ownerId}`).digest('base64url');
	return `FLTD-${digest.slice(0, 10).toUpperCase()}`;
}

export function findSupportCode(text: string | null | undefined): string | null {
	if (!text) return null;
	const match = text.toUpperCase().match(/\bFLTD-[A-Z0-9_-]{6,24}\b/);
	return match?.[0] ?? null;
}

/**
 * Resolve a support code back to the local identity or account it was derived
 * from, if any. Used by the Ko-fi webhook to attribute a donation to a known
 * owner. Returns null when the code matches nothing — attribution is optional
 * and never blocks the community buff.
 */
export function findSupportCodeOwner(db: Db, supportCode: string | null): SupportCodeOwner | null {
	if (!supportCode) return null;
	const localRows = db.prepare('SELECT local_player_id FROM player_identities').all() as { local_player_id: string }[];
	for (const row of localRows) {
		if (createSupportCode('local_identity', row.local_player_id) === supportCode) {
			return { ownerType: 'local_identity', ownerId: row.local_player_id };
		}
	}

	const accountRows = db.prepare('SELECT id FROM accounts').all() as { id: string }[];
	for (const row of accountRows) {
		if (createSupportCode('account', row.id) === supportCode) {
			return { ownerType: 'account', ownerId: row.id };
		}
	}

	return null;
}
