/**
 * AudioManager.ts — Procedural Web Audio sound engine.
 *
 * Lightweight wrapper that lazily loads AudioSynthService.ts in the browser
 * to reduce the initial bundle size, keeping zero external audio assets.
 */

export type SoundName =
	| 'shoot'
	| 'hit'
	| 'kill'
	| 'bossKill'
	| 'shiny'
	| 'upgrade'
	| 'waveStart'
	| 'bossWarning'
	| 'gameOver'
	| 'milestone'
	| 'uiClick'
	| 'error'
	| 'signal';

class AudioManagerImpl {
	private sfxEnabled = true;
	private musicEnabled = false;
	private musicActive = false;
	private unlocked = false;
	private lastError: string | null = null;

	private synthInstance: any = null;
	private synthPromise: Promise<any> | null = null;
	private queuedPlays: SoundName[] = [];

	constructor() {
		if (typeof window !== 'undefined') {
			this.preloadSynth();
		}
	}

	private preloadSynth(): Promise<any> {
		if (this.synthPromise) return this.synthPromise;
		this.synthPromise = import('./AudioSynthService')
			.then((m) => {
				this.synthInstance = new m.AudioSynthService();
				this.synthInstance.setSfxEnabled(this.sfxEnabled);
				this.synthInstance.setMusicEnabled(this.musicEnabled);
				this.synthInstance.setMusicActive(this.musicActive);
				if (this.unlocked) {
					this.synthInstance.unlock();
				}
				for (const name of this.queuedPlays) {
					this.synthInstance.play(name);
				}
				this.queuedPlays = [];
				return this.synthInstance;
			})
			.catch((err) => {
				this.lastError = 'Failed to load audio service.';
				console.error('[AudioManager] Failed to load synth service:', err);
				throw err;
			});
		return this.synthPromise;
	}

	unlock(): boolean {
		this.unlocked = true;
		if (typeof window === 'undefined') return false;
		this.preloadSynth().then((synth) => {
			synth.unlock();
		}).catch(() => {});
		return true;
	}

	setSfxEnabled(on: boolean): void {
		this.sfxEnabled = on;
		if (this.synthInstance) {
			this.synthInstance.setSfxEnabled(on);
		}
	}

	setMusicEnabled(on: boolean): void {
		this.musicEnabled = on;
		if (this.synthInstance) {
			this.synthInstance.setMusicEnabled(on);
		} else if (on && typeof window !== 'undefined') {
			this.preloadSynth().then((synth) => {
				synth.setMusicEnabled(on);
			}).catch(() => {});
		}
	}

	/** Couple music playback to the run lifecycle: true on run start, false on
	 *  game-over / leaving the run. Independent of the `music` user setting. */
	setMusicActive(on: boolean): void {
		this.musicActive = on;
		if (this.synthInstance) {
			this.synthInstance.setMusicActive(on);
		} else if (on && typeof window !== 'undefined') {
			this.preloadSynth().then((synth) => {
				synth.setMusicActive(on);
			}).catch(() => {});
		}
	}

	isSfxEnabled(): boolean {
		return this.sfxEnabled;
	}

	isMusicEnabled(): boolean {
		return this.musicEnabled;
	}

	getLastError(): string | null {
		if (this.synthInstance) {
			return this.synthInstance.getLastError();
		}
		return this.lastError;
	}

	play(name: SoundName): void {
		if (!this.sfxEnabled) return;
		if (typeof window === 'undefined') return;

		if (this.synthInstance) {
			this.synthInstance.play(name);
		} else {
			this.queuedPlays.push(name);
			if (this.queuedPlays.length > 10) {
				this.queuedPlays.shift();
			}
			this.preloadSynth().catch(() => {});
		}
	}

	tick(state: any): void {
		if (this.synthInstance) {
			this.synthInstance.tick(state);
		}
	}

	dispose(): void {
		if (this.synthInstance) {
			this.synthInstance.dispose();
			this.synthInstance = null;
		}
		this.synthPromise = null;
		this.queuedPlays = [];
		this.unlocked = false;
	}
}

export const audio = new AudioManagerImpl();
