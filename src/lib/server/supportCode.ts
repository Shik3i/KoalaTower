import { createHash } from 'node:crypto';

export function createSupportCode(ownerType: 'local_identity' | 'account', ownerId: string): string {
	const digest = createHash('sha256').update(`${ownerType}:${ownerId}`).digest('base64url');
	return `FLTD-${digest.slice(0, 10).toUpperCase()}`;
}

export function findSupportCode(text: string | null | undefined): string | null {
	if (!text) return null;
	const match = text.toUpperCase().match(/\bFLTD-[A-Z0-9_-]{6,24}\b/);
	return match?.[0] ?? null;
}
