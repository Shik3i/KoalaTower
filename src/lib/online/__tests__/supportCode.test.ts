import { describe, expect, it } from 'vitest';
import { createSupportCode } from '../../server/supportCode';
import { accountStore } from '../accountClient';
import { getSupportCode } from '../supportCode';

const KNOWN_UUID = '11111111-1111-4111-8111-111111111111';
const KNOWN_IDENTITY = { localPlayerId: KNOWN_UUID, displayName: 'Tester', updatedAt: '2026-06-19T00:00:00.000Z' };

describe('client support code', () => {
	it('matches the server code for a local identity', async () => {
		accountStore.clear();
		const { code, ownerType } = await getSupportCode(KNOWN_IDENTITY);
		expect(ownerType).toBe('local_identity');
		expect(code).toBe(createSupportCode('local_identity', KNOWN_UUID));
	});

	it('matches the server code for an account and prefers it when logged in', async () => {
		accountStore.set({ id: 'acc-xyz', username: 'cmd', displayName: 'Cmd' });
		const { code, ownerType } = await getSupportCode(KNOWN_IDENTITY);
		expect(ownerType).toBe('account');
		expect(code).toBe(createSupportCode('account', 'acc-xyz'));
	});

	it('always starts with the FLTD- prefix', async () => {
		accountStore.clear();
		const { code } = await getSupportCode(KNOWN_IDENTITY);
		expect(code.startsWith('FLTD-')).toBe(true);
	});
});

