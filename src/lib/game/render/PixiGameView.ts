import { Application, Container } from 'pixi.js';
import { AdvancedBloomFilter } from 'pixi-filters';
import { GAME_CONFIG } from '../engine/gameConfig';
import { getBackground } from '../balance/backgrounds';
import type { GameEngine } from '../engine/GameEngine';
import { createLayers, type GameLayers } from './PixiLayers';
import { BackgroundRenderer } from './BackgroundRenderer';
import { TowerRenderer } from './TowerRenderer';
import { EnemyRenderer } from './EnemyRenderer';
import { ProjectileRenderer } from './ProjectileRenderer';
import { EffectsRenderer } from './EffectsRenderer';
import { generateStars } from './renderUtils';
import { availableEnemyTypes } from '../balance/balanceMath';
import { ChallengeId, EnemyType, type GameState } from '../engine/gameTypes';

export type MuzzleFlashCallback = () => void;

export interface PixiGameViewCallbacks {
	onReady?: () => void;
	onError?: (error: Error) => void;
	onContextRestored?: () => void;
}

export class PixiGameView {
	private app!: Application;
	private domContainer: HTMLElement;
	private engine: GameEngine;

	private layers!: GameLayers;
	/** Scaled "camera" holding the gameplay layers; bg + wave banner stay fixed. */
	private world!: Container;
	private currentZoom = 1;
	/** Gap (px) kept between the range ring and the nearest viewport edge before
	 *  the camera starts zooming out instead of letting the ring grow further. */
	private static readonly RANGE_EDGE_MARGIN = 28;
	private background!: BackgroundRenderer;
	private tower!: TowerRenderer;
	private enemy!: EnemyRenderer;
	private projectile!: ProjectileRenderer;
	private effects!: EffectsRenderer;

	private animFrameId: number | null = null;
	private running = false;
	private initialized = false;
	private abortInit = false;
	private time = 0;
	private lastRange = 0;
	private loopScheduled = false;

	public muzzleFlash = 0;
	public initError: Error | null = null;
	private bloomFilter: AdvancedBloomFilter | null = null;
	private bloomActive = false;
	// Adaptive bloom quality: if the frame rate stays low for a sustained window
	// we drop bloom quality once (4 → 2) so weak GPUs keep a smooth framerate
	// instead of the player having to disable effects by hand. One-way with a long
	// window so it never flip-flops mid-fight.
	private fpsAccum = 0;
	private fpsFrames = 0;
	private bloomDowngraded = false;
	private callbacks: PixiGameViewCallbacks;
	private handleContextLost: ((event: Event) => void) | null = null;
	private handleContextRestored: (() => void) | null = null;
	private _prevPreviewKey = '';
	private _prevPreviewTypes: EnemyType[] = [];

	// ─── Wave-announce (real-time, speed-independent) ────────────────────────
	// The banner shown after a wave is cleared runs on a real-time clock so it
	// stays up for a fixed wall-clock duration at any game speed, and lingers
	// (semi-transparent) into the next wave instead of vanishing the instant the
	// next wave starts. Captured at the moment a wave clears, then faded by hand.
	private static readonly WAVE_ANNOUNCE_MS = 3000;
	private _waveAnnActive = false;
	private _waveAnnStartReal = 0;
	private _waveAnnWave = 0;
	private _waveAnnTotal = 0;
	private _waveAnnRecap: Partial<Record<EnemyType, number>> = {};
	private _waveAnnPreview: EnemyType[] = [];
	private _waveAnnIsBoss = false;
	private _prevWaveActive = false;

	constructor(domContainer: HTMLElement, engine: GameEngine, callbacks: PixiGameViewCallbacks = {}) {
		this.domContainer = domContainer;
		this.engine = engine;
		this.callbacks = callbacks;
		this.initPixi().catch(e => {
			this.initError = e instanceof Error ? e : new Error(String(e));
			this.callbacks.onError?.(this.initError);
			console.error('PixiJS init failed:', e);
		});
	}

	private async initPixi(): Promise<void> {
		this.app = new Application();

		// Read container dimensions for dynamic viewport
		const rect = this.domContainer.getBoundingClientRect();
		const vw = Math.max(400, Math.floor(rect.width));
		const vh = Math.max(400, Math.floor(rect.height));

		// Cap the render resolution at 2×. Beyond that the extra pixels cost GPU
		// time for no visible gain (a 3× DPI phone would otherwise render 9× the
		// pixels). At ≥2× the supersampling already smooths edges, so MSAA is only
		// worth enabling at 1× — on low-DPI displays where there is no oversampling.
		const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
		await this.app.init({
			width: vw,
			height: vh,
			background: GAME_CONFIG.CANVAS_BG,
			antialias: dpr < 2,
			resolution: dpr,
			autoDensity: true,
			autoStart: false,
			preference: 'webgl',
			powerPreference: 'high-performance',
			resizeTo: this.domContainer,
		});

		if (this.abortInit) { this.app.destroy({ removeView: true }, { children: true }); return; }

		const canvas = this.app.canvas;
		canvas.style.display = 'block';
		canvas.style.imageRendering = 'auto';
		this.handleContextLost = (event) => {
			event.preventDefault();
			this.engine.state.paused = true;
			const error = new Error('Renderer context lost. The run has been paused; wait for the browser to restore graphics or reload.');
			this.initError = error;
			this.callbacks.onError?.(error);
		};
		this.handleContextRestored = () => {
			this.initError = null;
			this.callbacks.onContextRestored?.();
		};
		canvas.addEventListener('webglcontextlost', this.handleContextLost);
		canvas.addEventListener('webglcontextrestored', this.handleContextRestored);

		this.domContainer.appendChild(canvas);

		// Store actual viewport size in engine state for spawn calculations
		this.engine.state.viewWidth = this.app.screen.width;
		this.engine.state.viewHeight = this.app.screen.height;
		// Update tower position in engine state to match viewport center
		if (this.engine.state.tower) {
			this.engine.state.tower.position.x = this.app.screen.width / 2;
			this.engine.state.tower.position.y = this.app.screen.height / 2;
		}

		this.buildScene();
		this.initialized = true;
		this.callbacks.onReady?.();

		if (this.running && !this.loopScheduled) {
			this.loopScheduled = true;
			this.lastTime = performance.now();
			this.animFrameId = requestAnimationFrame(this.loop);
		}
	}

	private buildScene(): void {
		const stage = this.app.stage;
		this.layers = createLayers();

		const vw = this.app.screen.width;
		const vh = this.app.screen.height;

		const bgTheme = getBackground(this.engine.state.selectedBackground);
		const starCount = Math.floor(GAME_CONFIG.BACKGROUND_STARS * (vw / 800) * bgTheme.starDensity);
		const stars = generateStars(vw, vh, starCount);
		this.background = new BackgroundRenderer(stars, vw, vh, bgTheme);
		this.tower = new TowerRenderer(vw / 2, vh / 2, this.engine.state.selectedSkin ?? 'classic');
		this.enemy = new EnemyRenderer();
		this.projectile = new ProjectileRenderer();
		this.effects = new EffectsRenderer();

		this.projectile.container.blendMode = 'add';
		this.layers.range.blendMode = 'add';

		// Background and the wave banner stay pinned to the canvas (unscaled).
		stage.addChild(this.layers.bg);
		this.layers.bg.addChild(this.background.container);

		// Everything else lives in the camera `world` so a range zoom-out scales
		// the whole battlefield uniformly around the tower.
		this.world = new Container();
		stage.addChild(this.world);

		this.world.addChild(this.layers.range);
		this.layers.range.addChild(this.tower.rangeContainer);

		this.world.addChild(this.layers.enemy);
		this.layers.enemy.addChild(this.enemy.container);
		// Death-effect proxies render directly under the enemy layer so corpses
		// fade behind any live enemies overlapping the same tile.
		this.layers.enemy.addChild(this.effects.deathContainer);

		this.world.addChild(this.layers.projectile);
		this.layers.projectile.addChild(this.projectile.container);

		this.world.addChild(this.layers.tower);
		this.layers.tower.addChild(this.tower.container);

		this.world.addChild(this.layers.particle);
		this.layers.particle.addChild(this.effects.particleContainer);
		this.layers.particle.addChild(this.effects.shockwaveContainer);

		this.world.addChild(this.layers.dmgText);
		this.layers.dmgText.addChild(this.effects.textContainer);

		stage.addChild(this.layers.waveAnnounce);
		this.layers.waveAnnounce.addChild(this.effects.waveContainer);

		this.applyCamera(this.currentZoom, true);

		// Neon bloom — tuned for bright strokes on a near-black field.
		this.bloomFilter = new AdvancedBloomFilter({
			threshold: 0.25,
			bloomScale: 1.3,
			brightness: 1.0,
			blur: 7,
			quality: 4,
		});
		// Pixi filters default to antialias:'off', which renders the whole stage
		// into a non-AA intermediate texture and reintroduces the jagged edges the
		// renderer's MSAA would otherwise smooth (most visible on rotating shapes).
		// 'inherit' makes the bloom pass follow the renderer's antialias setting.
		this.bloomFilter.antialias = 'inherit';
		this.applyBloom(this.bloomWanted());
	}

	/** Whether bloom should be on given current settings. */
	private bloomWanted(): boolean {
		const s = this.engine.state.settings;
		return s.bloom && !s.lowEffectsMode;
	}

	/** Add/remove the bloom filter from the stage. */
	private applyBloom(on: boolean): void {
		if (!this.app || !this.bloomFilter) return;
		if (on === this.bloomActive) return;
		this.app.stage.filters = on ? [this.bloomFilter] : [];
		this.bloomActive = on;
	}

	/**
	 * Watch the framerate while bloom is active and downgrade its quality once if
	 * the average stays below ~50fps for a sustained ~3s window. One-way: once
	 * downgraded it stays there for the session, so it can't oscillate.
	 */
	private adaptBloomQuality(dt: number): void {
		if (this.bloomDowngraded || !this.bloomActive || !this.bloomFilter || dt <= 0) return;
		this.fpsAccum += dt;
		this.fpsFrames++;
		if (this.fpsAccum < 3) return; // accumulate ~3s before judging
		const avgFps = this.fpsFrames / this.fpsAccum;
		this.fpsAccum = 0;
		this.fpsFrames = 0;
		if (avgFps < 50) {
			this.bloomFilter.quality = 2;
			this.bloomFilter.blur = 5;
			this.bloomDowngraded = true;
		}
	}

	public resize(): void {
		if (this.app && this.initialized) {
			// Force the renderer to read the container's new size *now* so app.screen
			// is current before we recentre — resizeTo otherwise defers this to the
			// next frame, leaving the camera one resize behind.
			this.app.resize();
			// Re-fit the canvas-pinned background (glow/vignette/grid/stars) so it
			// stays centred and fully covers the new viewport.
			this.background.resize(this.app.screen.width, this.app.screen.height);
			const range = this.engine.state.tower?.stats?.range ?? 0;
			const zoom = this.engine.state.runActive ? this.computeZoom(range) : 1;
			// force:true so the world re-centres on the new canvas dimensions even
			// when the zoom level itself is unchanged (the common case on resize).
			this.applyCamera(zoom, true);
			this.lastRange = -1;
		}
	}

	/**
	 * Camera zoom for a given tower range. Stays at 1 until the range ring would
	 * come within RANGE_EDGE_MARGIN of the nearest viewport edge; past that it
	 * returns capPx / range so the ring is pinned at the margin and the world
	 * scales down (double range ⇒ half size), à la The Tower.
	 */
	private computeZoom(range: number): number {
		const cap = Math.min(this.app.screen.width, this.app.screen.height) / 2 - PixiGameView.RANGE_EDGE_MARGIN;
		if (cap <= 0 || range <= cap) return 1;
		return cap / range;
	}

	/**
	 * Apply a camera zoom: grow the simulated world (so spawns/pathing stay at the
	 * visible edges), recentre the tower, and scale the `world` container around
	 * the tower so it stays fixed at the canvas centre.
	 */
	private applyCamera(zoom: number, force = false): void {
		if (!force && zoom === this.currentZoom) return;
		this.currentZoom = zoom;
		const cw = this.app.screen.width;
		const ch = this.app.screen.height;
		const worldW = cw / zoom;
		const worldH = ch / zoom;

		this.engine.state.viewWidth = worldW;
		this.engine.state.viewHeight = worldH;
		this.tower.x = worldW / 2;
		this.tower.y = worldH / 2;
		this.tower.container.x = worldW / 2;
		this.tower.container.y = worldH / 2;
		if (this.engine.state.tower) {
			this.engine.state.tower.position.x = worldW / 2;
			this.engine.state.tower.position.y = worldH / 2;
		}

		if (this.world) {
			this.world.pivot.set(worldW / 2, worldH / 2);
			this.world.position.set(cw / 2, ch / 2);
			this.world.scale.set(zoom);
		}

		// Parallax: nudge the distant starfield's scale opposite the world zoom.
		this.background?.setZoomParallax(zoom);
	}

	private lastTime = 0;

	private loop = (now: number): void => {
		if (!this.running || !this.initialized) return;

		const rawDt = Math.min((now - this.lastTime) / 1000, GAME_CONFIG.CLAMP_DELTA);
		this.lastTime = now;
		this.time += rawDt;

		if (this.muzzleFlash > 0) {
			this.muzzleFlash = Math.max(0, this.muzzleFlash - rawDt * 5);
		}
		this.tower.muzzleFlash = this.muzzleFlash;

		try {
			this.engine.update(rawDt);
		} catch (e) {
			console.error('[PixiGameView] Engine update crashed:', e);
			// Continue the render loop so the canvas doesn't freeze permanently
		}

		const state = this.engine.state;
		const settings = state.settings;
		const effTime = settings.reducedMotion ? 1 : this.time;
		const hpPct = state.tower.alive ? state.tower.hp / state.tower.maxHp : 0;

		this.background.update(effTime, rawDt);
		this.tower.updateVisuals(effTime, hpPct, state.tower.stats.multishotCount);

		if (state.runActive && !state.gameOver) {
			const range = state.tower.stats.range;
			// Zoom the camera out once the range ring would pass the edge margin.
			const desiredZoom = this.computeZoom(range);
			if (Math.abs(desiredZoom - this.currentZoom) > 0.0005) {
				this.applyCamera(desiredZoom);
				this.lastRange = -1; // tower recentred → redraw the ring
			}
			if (range !== this.lastRange) {
				this.lastRange = range;
				this.tower.updateRange(range, -1);
			}
			this.layers.range.visible = true;
		} else {
			this.layers.range.visible = false;
		}

		const shake = this.engine.shakeAmount;
		if (shake > 0.5 && settings.screenShake) {
			const intensity = Math.min(shake, GAME_CONFIG.MAX_SCREEN_SHAKE);
			this.app.stage.x = Math.sin(this.time * 40) * intensity * 0.5;
			this.app.stage.y = Math.cos(this.time * 37) * intensity * 0.5;
		} else {
			this.app.stage.x = 0;
			this.app.stage.y = 0;
		}

		// Toggle bloom live when the setting changes.
		this.applyBloom(this.bloomWanted());
		this.adaptBloomQuality(rawDt);

		this.enemy.sync(state.enemies, effTime, settings.reducedMotion, settings.colorblind ?? 'off');
		this.projectile.sync(state.projectiles);
		this.effects.syncParticles(this.engine.particles, settings);
		this.effects.syncShockwaves(this.engine.shockwaves, settings);
		this.effects.syncDamageNumbers(this.engine.damageNumbers, settings);
		this.effects.syncDeathEffects(this.engine.deathEffects, settings, effTime);
		// Wave-announce on a real-time clock (see field block). Trigger the banner
		// on the wave-active → gap transition (a wave was just cleared), capturing
		// the next-wave preview, then fade it over WAVE_ANNOUNCE_MS of real time
		// regardless of game speed — letting the next wave begin underneath it.
		const nextIsBoss = isNextWaveBoss(state);
		const waveActiveNow = state.wave.waveActive;
		if (this._prevWaveActive && !waveActiveNow && state.wave.currentWave > 0) {
			this._waveAnnActive = true;
			this._waveAnnStartReal = now;
			this._waveAnnWave = state.wave.currentWave;
			this._waveAnnTotal = state.wave.enemiesInWave;
			this._waveAnnRecap = state.wave.killsByTypeThisWave ?? {};
			this._waveAnnPreview = this.getPreviewWaveTypes(state, nextIsBoss);
			this._waveAnnIsBoss = nextIsBoss;
		}
		this._prevWaveActive = waveActiveNow;

		let annAlpha = 0;
		if (this._waveAnnActive) {
			const elapsed = now - this._waveAnnStartReal;
			const D = PixiGameView.WAVE_ANNOUNCE_MS;
			if (elapsed >= D) {
				this._waveAnnActive = false;
			} else {
				const fadeIn = Math.min(1, elapsed / 300);
				const fadeOut = elapsed > D - 700 ? Math.max(0, (D - elapsed) / 700) : 1;
				annAlpha = Math.min(fadeIn, fadeOut);
			}
		}
		this.effects.syncWaveAnnounce(
			this._waveAnnWave,
			this._waveAnnTotal,
			0,
			false,
			this.app.screen.width,
			this.app.screen.height,
			this._waveAnnRecap,
			this._waveAnnPreview,
			this._waveAnnIsBoss,
			annAlpha,
		);

		this.app.render();
		this.animFrameId = requestAnimationFrame(this.loop);
	};

	public start(): void {
		if (this.running) return;
		this.running = true;
		if (this.initialized && !this.loopScheduled) {
			this.loopScheduled = true;
			this.lastTime = performance.now();
			this.animFrameId = requestAnimationFrame(this.loop);
		}
	}

	public stop(): void {
		this.running = false;
		this.loopScheduled = false;
		if (this.animFrameId !== null) {
			cancelAnimationFrame(this.animFrameId);
			this.animFrameId = null;
		}
	}

	public triggerMuzzleFlash(): void {
		this.muzzleFlash = 1.0;
	}

	public getCanvas(): HTMLCanvasElement | undefined {
		return this.initialized ? this.app.canvas : undefined;
	}

	public destroy(): void {
		this.abortInit = true;
		this.stop();
		if (this.initialized) {
			const canvas = this.app.canvas;
			if (this.handleContextLost) canvas.removeEventListener('webglcontextlost', this.handleContextLost);
			if (this.handleContextRestored) canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
			this.enemy.destroy();
			this.projectile.destroy();
			this.effects.destroy();
			this.tower.destroy();
			this.background.destroy();
			this.app.destroy(
				{ removeView: true, releaseGlobalResources: true },
				{ children: true, texture: true, textureSource: true },
			);
		}
		this.initialized = false;
	}

	private getPreviewWaveTypes(state: GameState, isBossWave: boolean): EnemyType[] {
		const key = `${state.wave.currentWave + 1}-${state.tier ?? 1}-${isBossWave}`;
		if (this._prevPreviewKey === key) return this._prevPreviewTypes;
		this._prevPreviewKey = key;
		const front = state.tier ?? 1;
		const eligible = Array.from(new Set(availableEnemyTypes(state.wave.currentWave + 1, front)));
		if (isBossWave && !eligible.includes(EnemyType.Boss)) eligible.push(EnemyType.Boss);
		this._prevPreviewTypes = eligible;
		return eligible;
	}
}

/**
 * Mirror of the waveSystem boss-wave predicate — true on every 10th wave AND
 * for every wave during the BossRush challenge. Kept here (not imported) so
 * the renderer does not pull in the system module at module-load time.
 */
function isNextWaveBoss(state: GameState): boolean {
	const upcoming = state.wave.currentWave + 1;
	return upcoming % 10 === 0 || state.activeChallenge === ChallengeId.BossRush;
}
