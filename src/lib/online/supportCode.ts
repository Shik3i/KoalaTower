import { get } from 'svelte/store';
import { accountStore } from './accountClient';
import { loadLocalIdentity, type LocalPlayerIdentity } from './localIdentity';

export type SupportCodeOwner = 'local_identity' | 'account';

export type SupportCodeResult = {
	code: string;
	ownerType: SupportCodeOwner;
};

async function sha256Hex(input: string): Promise<string> {
	const data = new TextEncoder().encode(input);
	const hash = await crypto.subtle.digest('SHA-256', data);
	const bytes = new Uint8Array(hash);
	let hex = '';
	for (const byte of bytes) hex += byte.toString(16).padStart(2, '0');
	return hex.toUpperCase();
}

/** Format a hex digest the same way the server's createSupportCode() does. */
function formatSupportCode(digestHex: string): string {
	return `FLTD-${digestHex.slice(0, 4)}-${digestHex.slice(4, 8)}`;
}

/**
 * Derive the player's support code. Mirrors the server-side createSupportCode()
 * so a code pasted into a Ko-fi message matches the owner the server computes.
 *
 * Account-linked when logged in, otherwise derived from the anonymous local
 * identity. The community buff applies to everyone regardless of code.
 *
 * `identityOverride` exists for testability; production callers omit it.
 */
export async function getSupportCode(identityOverride?: LocalPlayerIdentity): Promise<SupportCodeResult> {
	const account = get(accountStore).account;
	if (account) {
		return {
			code: formatSupportCode(await sha256Hex(`account:${account.id}`)),
			ownerType: 'account'
		};
	}
	const identity = identityOverride ?? loadLocalIdentity();
	return {
		code: formatSupportCode(await sha256Hex(`local_identity:${identity.localPlayerId}`)),
		ownerType: 'local_identity'
	};
}

