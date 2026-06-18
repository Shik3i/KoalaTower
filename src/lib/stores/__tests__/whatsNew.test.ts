import { afterEach, describe, expect, it, vi } from 'vitest';
import { shouldShowWhatsNew } from '../whatsNew';

afterEach(() => {
	vi.unstubAllGlobals();
	vi.resetModules();
});

describe('shouldShowWhatsNew', () => {
	it('shows when nothing has been stored yet', () => {
		expect(shouldShowWhatsNew('v0.3.0', null)).toBe(true);
	});

	it('shows when the stored version differs from current', () => {
		expect(shouldShowWhatsNew('v0.3.0', 'v0.2.0')).toBe(true);
	});

	it('does not show when the stored version matches (already dismissed)', () => {
		expect(shouldShowWhatsNew('v0.3.0', 'v0.3.0')).toBe(false);
	});

	it('never shows for an empty/unknown current version', () => {
		expect(shouldShowWhatsNew('', null)).toBe(false);
	});
});

describe('whatsNew storage guards', () => {
	it('readSeenVersion returns null during SSR (no localStorage)', async () => {
		vi.stubGlobal('localStorage', undefined);
		const { readSeenVersion } = await import('../whatsNew');
		expect(readSeenVersion()).toBe(null);
	});

	it('writeSeenVersion does not throw during SSR', async () => {
		vi.stubGlobal('localStorage', undefined);
		const { writeSeenVersion } = await import('../whatsNew');
		expect(() => writeSeenVersion('v0.3.0')).not.toThrow();
	});

	it('round-trips the seen version through localStorage', async () => {
		const backing: Record<string, string> = {};
		vi.stubGlobal('localStorage', {
			getItem: (k: string) => (k in backing ? backing[k] : null),
			setItem: (k: string, v: string) => { backing[k] = v; },
			removeItem: (k: string) => { delete backing[k]; },
		});
		const { readSeenVersion, writeSeenVersion } = await import('../whatsNew');
		expect(readSeenVersion()).toBe(null);
		writeSeenVersion('v0.3.0');
		expect(readSeenVersion()).toBe('v0.3.0');
	});

	it('swallows storage errors on write', async () => {
		vi.stubGlobal('localStorage', {
			getItem: () => null,
			setItem: () => { throw new Error('quota'); },
			removeItem: () => {},
		});
		const { writeSeenVersion } = await import('../whatsNew');
		expect(() => writeSeenVersion('v0.3.0')).not.toThrow();
	});
});
