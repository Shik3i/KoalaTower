import { safeApiJson } from './apiClient';

export const LOCAL_PLAYER_IDENTITY_KEY = 'flatland-td-player-identity';
export const DEFAULT_LOCAL_DISPLAY_NAME = 'Flatland Player';

export type LocalPlayerIdentity = {
	localPlayerId: string;
	displayName: string;
	updatedAt: string;
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function getCrypto(): Crypto | undefined {
	return globalThis.crypto;
}

function createUuid(): string {
	const cryptoApi = getCrypto();
	if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
	const bytes = new Uint8Array(16);
	cryptoApi?.getRandomValues(bytes);
	bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
	bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
	const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function cleanDisplayName(displayName: string): string {
	const cleaned = displayName.trim().replace(/\s+/g, ' ').slice(0, 32);
	return cleaned || DEFAULT_LOCAL_DISPLAY_NAME;
}

export function loadLocalIdentity(storage: StorageLike | undefined = typeof localStorage === 'undefined' ? undefined : localStorage): LocalPlayerIdentity {
	const now = new Date().toISOString();
	if (!storage) {
		return { localPlayerId: createUuid(), displayName: DEFAULT_LOCAL_DISPLAY_NAME, updatedAt: now };
	}
	const existing = storage.getItem(LOCAL_PLAYER_IDENTITY_KEY);
	if (existing) {
		try {
			const parsed = JSON.parse(existing) as Partial<LocalPlayerIdentity>;
			if (parsed.localPlayerId && parsed.displayName) {
				return {
					localPlayerId: parsed.localPlayerId,
					displayName: cleanDisplayName(parsed.displayName),
					updatedAt: parsed.updatedAt || now
				};
			}
		} catch {
			// Replace malformed local profile data with a fresh anonymous identity.
		}
	}
	const identity = { localPlayerId: createUuid(), displayName: DEFAULT_LOCAL_DISPLAY_NAME, updatedAt: now };
	storage.setItem(LOCAL_PLAYER_IDENTITY_KEY, JSON.stringify(identity));
	return identity;
}

export function saveLocalDisplayName(displayName: string, storage: StorageLike | undefined = typeof localStorage === 'undefined' ? undefined : localStorage): LocalPlayerIdentity {
	const identity = loadLocalIdentity(storage);
	const updated = { ...identity, displayName: cleanDisplayName(displayName), updatedAt: new Date().toISOString() };
	storage?.setItem(LOCAL_PLAYER_IDENTITY_KEY, JSON.stringify(updated));
	return updated;
}

export async function syncLocalIdentity(identity: LocalPlayerIdentity): Promise<'synced' | 'offline' | 'rejected'> {
	const result = await safeApiJson('/api/player/identity', {
		method: 'POST',
		body: JSON.stringify({
			localPlayerId: identity.localPlayerId,
			displayName: identity.displayName
		})
	});
	if (result.ok) return 'synced';
	return result.offline ? 'offline' : 'rejected';
}
