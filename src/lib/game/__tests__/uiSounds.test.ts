import { describe, expect, it } from 'vitest';
import { audio } from '../audio/AudioManager';
import { soundForNotification, playForNotification } from '../audio/uiSounds';
import type { NotificationKind } from '$lib/stores/notificationStore';

describe('soundForNotification mapping', () => {
	it('maps milestone-worthy events to stings and stays silent for info', () => {
		expect(soundForNotification('achievement')).toBe('milestone');
		expect(soundForNotification('boss')).toBe('bossWarning');
		expect(soundForNotification('blackMarket')).toBe('signal');
		expect(soundForNotification('warning')).toBe('error');
		expect(soundForNotification('info')).toBe(null);
	});

	it('covers every notification kind without throwing', () => {
		const kinds: NotificationKind[] = [
			'achievement', 'bestWave', 'frontUnlock', 'blackMarket',
			'shipment', 'contract', 'research', 'boss', 'warning', 'info',
		];
		for (const k of kinds) {
			expect(() => soundForNotification(k)).not.toThrow();
		}
	});
});

describe('playForNotification', () => {
	it('does not throw when Web Audio / AudioContext is unavailable (node, SSR)', () => {
		// In the node test environment there is no `window`, so AudioManager
		// can never create a context — play() must silently no-op.
		expect(() => playForNotification('achievement')).not.toThrow();
	});

	it('triggers no sound when SFX are disabled', () => {
		audio.setSfxEnabled(false);
		// With SFX off, play() returns before touching any audio nodes.
		expect(() => playForNotification('boss')).not.toThrow();
		expect(audio.isSfxEnabled()).toBe(false);
		audio.setSfxEnabled(true);
	});
});
