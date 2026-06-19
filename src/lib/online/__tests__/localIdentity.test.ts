import { describe, expect, it } from 'vitest';
import { loadLocalIdentity, LOCAL_PLAYER_IDENTITY_KEY, saveLocalDisplayName } from '../localIdentity';

function memoryStorage() {
	const values = new Map<string, string>();
	return {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => values.set(key, value)
	};
}

describe('local player identity', () => {
	it('creates a stable UUID identity in local storage', () => {
		const storage = memoryStorage();
		const first = loadLocalIdentity(storage);
		const second = loadLocalIdentity(storage);
		expect(first.localPlayerId).toMatch(/^[0-9a-f-]{36}$/i);
		expect(second.localPlayerId).toBe(first.localPlayerId);
		expect(storage.getItem(LOCAL_PLAYER_IDENTITY_KEY)).toContain(first.localPlayerId);
	});

	it('updates the local display name without changing identity', () => {
		const storage = memoryStorage();
		const first = loadLocalIdentity(storage);
		const updated = saveLocalDisplayName('  Orbit Commander  ', storage);
		expect(updated.localPlayerId).toBe(first.localPlayerId);
		expect(updated.displayName).toBe('Orbit Commander');
	});
});
