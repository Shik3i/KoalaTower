/**
 * AudioManager.ts — Procedural Web Audio sound engine.
 *
 * All sounds are synthesized at runtime (oscillators + noise + envelopes),
 * so the game ships ZERO audio asset files — consistent with the project's
 * "no external assets" philosophy.
 *
 * The AudioContext is created lazily and resumed on the first user gesture
 * (browsers block audio until then). Everything is wrapped defensively: if
 * Web Audio is unavailable the manager silently no-ops.
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
	| 'uiClick';

class AudioManagerImpl {
	private ctx: AudioContext | null = null;
	private master: GainNode | null = null;
	private sfxBus: GainNode | null = null;
	private musicBus: GainNode | null = null;

	private sfxEnabled = true;
	private musicEnabled = false;
	private unlocked = false;

	private lastShoot = 0;          // ctx time of last shoot blip (throttle)
	private musicNodes: AudioScheduledSourceNode[] = [];
	private musicTimer: ReturnType<typeof setInterval> | null = null;

	/** Lazily create the context. Safe to call repeatedly. */
	private ensureCtx(): AudioContext | null {
		if (this.ctx) return this.ctx;
		if (typeof window === 'undefined') return null;
		const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
		if (!Ctor) return null;
		try {
			this.ctx = new Ctor();
			this.master = this.ctx.createGain();
			this.master.gain.value = 0.5;
			this.master.connect(this.ctx.destination);

			this.sfxBus = this.ctx.createGain();
			this.sfxBus.gain.value = 1;
			this.sfxBus.connect(this.master);

			this.musicBus = this.ctx.createGain();
			this.musicBus.gain.value = 0.35;
			this.musicBus.connect(this.master);
		} catch {
			this.ctx = null;
		}
		return this.ctx;
	}

	/** Call from a user gesture (click/keydown) to satisfy autoplay policies. */
	unlock(): void {
		const ctx = this.ensureCtx();
		if (!ctx) return;
		if (ctx.state === 'suspended') ctx.resume().catch(() => {});
		this.unlocked = true;
		if (this.musicEnabled) this.startMusic();
	}

	setSfxEnabled(on: boolean): void {
		this.sfxEnabled = on;
	}

	setMusicEnabled(on: boolean): void {
		this.musicEnabled = on;
		if (on) {
			if (this.unlocked) this.startMusic();
		} else {
			this.stopMusic();
		}
	}

	isSfxEnabled(): boolean { return this.sfxEnabled; }
	isMusicEnabled(): boolean { return this.musicEnabled; }

	// ─── Synthesis helpers ──────────────────────────────────────────────────

	private tone(freq: number, dur: number, type: OscillatorType, gain: number, opts?: { sweepTo?: number; delay?: number }): void {
		const ctx = this.ctx, bus = this.sfxBus;
		if (!ctx || !bus) return;
		const t0 = ctx.currentTime + (opts?.delay ?? 0);
		const osc = ctx.createOscillator();
		const g = ctx.createGain();
		osc.type = type;
		osc.frequency.setValueAtTime(freq, t0);
		if (opts?.sweepTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.sweepTo), t0 + dur);
		g.gain.setValueAtTime(0.0001, t0);
		g.gain.exponentialRampToValueAtTime(gain, t0 + 0.005);
		g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
		osc.connect(g).connect(bus);
		osc.start(t0);
		osc.stop(t0 + dur + 0.02);
	}

	private noise(dur: number, gain: number, filterFreq: number): void {
		const ctx = this.ctx, bus = this.sfxBus;
		if (!ctx || !bus) return;
		const t0 = ctx.currentTime;
		const frames = Math.floor(ctx.sampleRate * dur);
		const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
		const src = ctx.createBufferSource();
		src.buffer = buffer;
		const filter = ctx.createBiquadFilter();
		filter.type = 'bandpass';
		filter.frequency.value = filterFreq;
		const g = ctx.createGain();
		g.gain.setValueAtTime(gain, t0);
		g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
		src.connect(filter).connect(g).connect(bus);
		src.start(t0);
		src.stop(t0 + dur + 0.02);
	}

	// ─── Public API ─────────────────────────────────────────────────────────

	play(name: SoundName): void {
		if (!this.sfxEnabled) return;
		const ctx = this.ensureCtx();
		if (!ctx || ctx.state !== 'running') return;

		switch (name) {
			case 'shoot': {
				// Throttle dense fire so it reads as texture, not a buzzsaw.
				if (ctx.currentTime - this.lastShoot < 0.045) return;
				this.lastShoot = ctx.currentTime;
				this.tone(880, 0.07, 'triangle', 0.08, { sweepTo: 320 });
				break;
			}
			case 'hit':
				this.noise(0.05, 0.06, 1600);
				break;
			case 'kill':
				this.tone(440, 0.12, 'square', 0.10, { sweepTo: 160 });
				this.noise(0.08, 0.05, 900);
				break;
			case 'bossKill':
				this.tone(180, 0.5, 'sawtooth', 0.18, { sweepTo: 40 });
				this.tone(90, 0.6, 'sine', 0.16, { sweepTo: 30 });
				this.noise(0.4, 0.12, 500);
				this.tone(660, 0.3, 'triangle', 0.10, { sweepTo: 220, delay: 0.05 });
				break;
			case 'shiny':
				this.tone(1320, 0.10, 'triangle', 0.10);
				this.tone(1760, 0.10, 'triangle', 0.09, { delay: 0.06 });
				this.tone(2640, 0.14, 'sine', 0.08, { delay: 0.12 });
				break;
			case 'upgrade':
				this.tone(520, 0.10, 'square', 0.12, { sweepTo: 660 });
				this.tone(780, 0.14, 'square', 0.10, { sweepTo: 990, delay: 0.07 });
				break;
			case 'waveStart':
				this.tone(330, 0.25, 'sine', 0.10, { sweepTo: 495 });
				break;
			case 'bossWarning':
				this.tone(140, 0.3, 'sawtooth', 0.14, { sweepTo: 110 });
				this.tone(140, 0.3, 'sawtooth', 0.12, { sweepTo: 110, delay: 0.35 });
				break;
			case 'gameOver':
				this.tone(440, 0.5, 'sawtooth', 0.16, { sweepTo: 110 });
				this.tone(330, 0.7, 'sine', 0.14, { sweepTo: 80, delay: 0.18 });
				break;
			case 'milestone':
				this.tone(523, 0.16, 'triangle', 0.12);
				this.tone(659, 0.16, 'triangle', 0.12, { delay: 0.10 });
				this.tone(784, 0.22, 'triangle', 0.12, { delay: 0.20 });
				break;
			case 'uiClick':
				this.tone(660, 0.04, 'square', 0.06);
				break;
		}
	}

	// ─── Ambient music — a slow detuned drone pad ─────────────────────────────

	private startMusic(): void {
		const ctx = this.ensureCtx();
		if (!ctx || !this.musicBus || this.musicNodes.length) return;
		// Two detuned saws through a slow lowpass = an evolving ambient bed.
		const baseFreqs = [55, 82.5]; // A1 + E2
		for (const f of baseFreqs) {
			const osc = ctx.createOscillator();
			const g = ctx.createGain();
			const filter = ctx.createBiquadFilter();
			filter.type = 'lowpass';
			filter.frequency.value = 400;
			osc.type = 'sawtooth';
			osc.frequency.value = f;
			osc.detune.value = (Math.random() - 0.5) * 12;
			g.gain.value = 0.18;
			osc.connect(filter).connect(g).connect(this.musicBus);
			osc.start();
			this.musicNodes.push(osc);
		}
		// Gentle filter wobble via periodic ramps (avoids needing an LFO graph).
		let phase = 0;
		this.musicTimer = setInterval(() => {
			if (!this.ctx || !this.musicBus) return;
			phase += 0.5;
			const v = 0.28 + Math.sin(phase) * 0.12;
			this.musicBus.gain.setTargetAtTime(this.musicEnabled ? v : 0, this.ctx.currentTime, 1.5);
		}, 2000);
	}

	private stopMusic(): void {
		if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
		for (const n of this.musicNodes) {
			try { n.stop(); } catch { /* already stopped */ }
		}
		this.musicNodes = [];
	}

	dispose(): void {
		this.stopMusic();
		if (this.ctx) { this.ctx.close().catch(() => {}); this.ctx = null; }
		this.master = this.sfxBus = this.musicBus = null;
		this.unlocked = false;
	}
}

/** Singleton — one audio context for the whole app. */
export const audio = new AudioManagerImpl();
