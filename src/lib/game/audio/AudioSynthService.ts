import type { SoundName } from './AudioManager';

export class AudioSynthService {
	private ctx: AudioContext | null = null;
	private master: GainNode | null = null;
	private sfxBus: GainNode | null = null;
	private musicBus: GainNode | null = null;

	private sfxEnabled = true;
	private musicEnabled = false;
	/** Gameplay gate: music only plays while a run is live, independent of the
	 *  `musicEnabled` user setting. Set false on game-over / leaving the run so
	 *  the ambient pad and boss drone don't linger after the tower falls. */
	private musicActive = false;
	private unlocked = false;
	private lastError: string | null = null;

	private lastShoot = 0;
	private musicNodes: AudioScheduledSourceNode[] = [];
	private musicTimer: ReturnType<typeof setInterval> | null = null;

	// Dynamic music state
	private lastFastPulse = 0;
	private lastTankPulse = 0;
	private lastRangedPulse = 0;
	private lastBossPulse = 0;
	private bossDroneNodes: AudioScheduledSourceNode[] = [];
	private activeBoss = false;

	constructor() {
		// AudioContext is created lazily via ensureCtx() when playing or unlocking.
	}

	public ensureCtx(): AudioContext | null {
		if (this.ctx) return this.ctx;
		if (typeof window === 'undefined') return null;
		const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
		if (!Ctor) {
			this.lastError = 'Web Audio is not available in this browser.';
			return null;
		}
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
			this.lastError = null;
		} catch {
			this.ctx = null;
			this.lastError = 'Audio could not be initialized. Browser or device audio policy refused the audio context.';
		}
		return this.ctx;
	}

	public unlock(): boolean {
		const ctx = this.ensureCtx();
		if (!ctx) return false;
		if (ctx.state === 'suspended') {
			ctx.resume().catch(() => {
				this.lastError = 'Audio is blocked by the browser until a user gesture is accepted.';
			});
		}
		this.unlocked = true;
		this.reconcileMusic();
		this.lastError = null;
		return true;
	}

	/** Start or stop the ambient music to match the current gates. Music plays
	 *  only when enabled (setting), active (in a run), and unlocked. */
	private reconcileMusic(): void {
		if (this.musicEnabled && this.musicActive && this.unlocked) {
			this.startMusic();
		} else {
			this.stopMusic();
		}
	}

	/** Couple music to the run lifecycle (called on run start / game-over / leave). */
	public setMusicActive(on: boolean): void {
		this.musicActive = on;
		this.reconcileMusic();
	}

	public setSfxEnabled(on: boolean): void {
		this.sfxEnabled = on;
	}

	public setMusicEnabled(on: boolean): void {
		this.musicEnabled = on;
		this.reconcileMusic();
	}

	public getLastError(): string | null {
		return this.lastError;
	}

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

		osc.onended = () => {
			osc.disconnect();
			g.disconnect();
		};
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

		src.onended = () => {
			src.disconnect();
			filter.disconnect();
			g.disconnect();
		};
	}

	public play(name: SoundName): void {
		if (!this.sfxEnabled) return;
		const ctx = this.ensureCtx();
		if (!ctx || ctx.state !== 'running') return;

		switch (name) {
			case 'shoot': {
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
			case 'error':
				this.tone(160, 0.08, 'square', 0.07, { sweepTo: 110 });
				this.tone(120, 0.10, 'sawtooth', 0.05, { sweepTo: 80, delay: 0.06 });
				break;
			case 'signal':
				this.tone(990, 0.09, 'sine', 0.07, { sweepTo: 1320 });
				this.tone(1480, 0.12, 'triangle', 0.06, { delay: 0.08 });
				break;
		}
	}

	private startMusic(): void {
		const ctx = this.ensureCtx();
		if (!ctx || !this.musicBus || this.musicNodes.length) return;

		const baseFreqs = [55, 82.5];
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

			osc.onended = () => {
				osc.disconnect();
				filter.disconnect();
				g.disconnect();
			};

			this.musicNodes.push(osc);
		}

		let phase = 0;
		this.musicTimer = setInterval(() => {
			if (!this.ctx || !this.musicBus) return;
			phase += 0.5;
			const v = 0.28 + Math.sin(phase) * 0.12;
			this.musicBus.gain.setTargetAtTime(this.musicEnabled ? v : 0, this.ctx.currentTime, 1.5);
		}, 2000);
	}

	private stopMusic(): void {
		if (this.musicTimer) {
			clearInterval(this.musicTimer);
			this.musicTimer = null;
		}
		for (const n of this.musicNodes) {
			try {
				n.stop();
			} catch {}
		}
		this.musicNodes = [];
		this.stopBossDrone();
		this.activeBoss = false;
	}

	private startBossDrone(state: any): void {
		if (!this.ctx || !this.musicBus) return;
		const waveNum = state?.wave?.currentWave ?? 10;
		const waveProgress = Math.min(waveNum / 100, 1.0);

		const baseDb = 36.7 - (waveProgress * 3.0);
		const tritoneDb = 103.8 + (waveProgress * 12.0);

		const freqs = [baseDb, tritoneDb];
		for (const f of freqs) {
			const osc = this.ctx.createOscillator();
			const g = this.ctx.createGain();
			const filter = this.ctx.createBiquadFilter();
			filter.type = 'lowpass';
			filter.frequency.value = 250 - (waveProgress * 100);
			osc.type = 'sawtooth';
			osc.frequency.value = f;
			osc.detune.value = (Math.random() - 0.5) * (20 + waveProgress * 25);
			g.gain.setValueAtTime(0.0001, this.ctx.currentTime);
			const targetGain = 0.12 + (waveProgress * 0.05);
			g.gain.linearRampToValueAtTime(targetGain, this.ctx.currentTime + 3.0);
			osc.connect(filter).connect(g).connect(this.musicBus);
			osc.start();

			osc.onended = () => {
				osc.disconnect();
				filter.disconnect();
				g.disconnect();
			};

			this.bossDroneNodes.push(osc);
		}
	}

	private stopBossDrone(): void {
		for (const n of this.bossDroneNodes) {
			try {
				n.stop();
			} catch {}
		}
		this.bossDroneNodes = [];
	}

	public tick(state: any): void {
		if (!this.ctx || !this.musicEnabled || !this.musicActive) return;
		const now = this.ctx.currentTime;

		let hasFast = false;
		let hasTank = false;
		let hasRanged = false;
		let hasBoss = false;

		if (state.enemies) {
			for (const enemy of state.enemies) {
				if (!enemy.alive) continue;
				if (enemy.type === 'fast') hasFast = true;
				else if (enemy.type === 'tank') hasTank = true;
				else if (enemy.type === 'ranged') hasRanged = true;
				else if (enemy.type === 'boss') hasBoss = true;
			}
		}

		if (hasFast && now - this.lastFastPulse > 0.6) {
			this.lastFastPulse = now;
			this.tone(1500, 0.02, 'sine', 0.015, { sweepTo: 2200 });
		}

		if (hasTank && now - this.lastTankPulse > 1.6) {
			this.lastTankPulse = now;
			this.tone(65, 0.18, 'triangle', 0.06, { sweepTo: 30 });
		}

		if (hasRanged && now - this.lastRangedPulse > 2.2) {
			this.lastRangedPulse = now;
			this.tone(880, 0.35, 'sine', 0.01, { sweepTo: 1800 });
		}

		if (hasBoss && !this.activeBoss) {
			this.activeBoss = true;
			this.startBossDrone(state);
		} else if (!hasBoss && this.activeBoss) {
			this.activeBoss = false;
			this.stopBossDrone();
		}

		if (hasBoss && now - this.lastBossPulse > 0.8) {
			this.lastBossPulse = now;
			this.tone(45, 0.25, 'sawtooth', 0.03, { sweepTo: 20 });
		}
	}

	public dispose(): void {
		this.stopMusic();
		if (this.ctx) {
			this.ctx.close().catch(() => {});
			this.ctx = null;
		}
		this.master = this.sfxBus = this.musicBus = null;
		this.unlocked = false;
	}
}
