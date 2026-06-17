import { describe, it, expect } from 'vitest';
import { audio, type SoundName } from '../audio/AudioManager';

/**
 * In the test/SSR environment there is no AudioContext, so the manager must
 * degrade to silent no-ops without throwing. These smoke tests lock that in.
 */
describe('AudioManager — graceful degradation without Web Audio', () => {
	const ALL_SOUNDS: SoundName[] = [
		'shoot', 'hit', 'kill', 'bossKill', 'shiny', 'upgrade',
		'waveStart', 'bossWarning', 'gameOver', 'milestone', 'uiClick',
	];

	it('plays every sound name without throwing', () => {
		for (const name of ALL_SOUNDS) {
			expect(() => audio.play(name)).not.toThrow();
		}
	});

	it('unlock() is safe to call repeatedly', () => {
		expect(() => { audio.unlock(); audio.unlock(); }).not.toThrow();
	});

	it('toggles reflect through the getters', () => {
		audio.setSfxEnabled(false);
		expect(audio.isSfxEnabled()).toBe(false);
		audio.setSfxEnabled(true);
		expect(audio.isSfxEnabled()).toBe(true);

		audio.setMusicEnabled(true);
		expect(audio.isMusicEnabled()).toBe(true);
		audio.setMusicEnabled(false);
		expect(audio.isMusicEnabled()).toBe(false);
	});

	it('dispose() is safe even when nothing was ever initialised', () => {
		expect(() => audio.dispose()).not.toThrow();
	});
});
