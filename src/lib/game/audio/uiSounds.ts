/**
 * uiSounds.ts — maps app notification kinds to subtle UI stings.
 *
 * Kept separate from AudioManager (and pure) so the mapping is unit-testable
 * and the store layer stays audio-free. `playForNotification` is a thin wrapper
 * that delegates to the AudioManager, which already:
 *   - no-ops when SFX are disabled,
 *   - no-ops before the audio context is unlocked (browser autoplay policy),
 *   - no-ops when Web Audio is unavailable.
 * So callers don't need their own guards.
 */
import { audio, type SoundName } from './AudioManager';
import type { NotificationKind } from '$lib/stores/notificationStore';

/**
 * The sting for a notification kind, or null for kinds that should stay silent.
 * Deliberately sparse — only meaningful, infrequent events make a sound, and
 * none of them repeat in quick succession.
 */
export function soundForNotification(kind: NotificationKind): SoundName | null {
	switch (kind) {
		case 'achievement':
			return 'milestone';
		case 'bestWave':
			return 'milestone';
		case 'frontUnlock':
			return 'milestone';
		case 'boss':
			return 'bossWarning';
		case 'blackMarket':
			return 'signal';
		case 'shipment':
		case 'pickup':
			return 'upgrade';
		case 'research':
			return 'upgrade';
		case 'warning':
			return 'error';
		case 'info':
			return null;
	}
}

/** Play the mapped sting for a notification kind, if any. Safe to call always. */
export function playForNotification(kind: NotificationKind): void {
	const name = soundForNotification(kind);
	if (name) audio.play(name);
}
