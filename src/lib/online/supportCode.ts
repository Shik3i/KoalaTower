import { get } from 'svelte/store';
import { accountStore } from './accountClient';
import { loadLocalIdentity, type LocalPlayerIdentity } from './localIdentity';

export type SupportCodeOwner = 'local_identity' | 'account';

export type SupportCodeResult = {
	code: string;
	ownerType: SupportCodeOwner;
};

async function sha256Base64Url(input: string): Promise<string> {
	const data = new TextEncoder().encode(input);
	const hash = await crypto.subtle.digest('SHA-256', data);
	const bytes = new Uint8Array(hash);
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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
			code: 'FLTD-' + (await sha256Base64Url(`account:${account.id}`)).slice(0, 10).toUpperCase(),
			ownerType: 'account'
		};
	}
	const identity = identityOverride ?? loadLocalIdentity();
	return {
		code: 'FLTD-' + (await sha256Base64Url(`local_identity:${identity.localPlayerId}`)).slice(0, 10).toUpperCase(),
		ownerType: 'local_identity'
	};
}

