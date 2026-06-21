import { Application, Container } from 'pixi.js';
import { AdvancedBloomFilter } from 'pixi-filters';
import { GAME_CONFIG } from '../engine/gameConfig';
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
	private callbacks: PixiGameViewCallbacks;
	private handleContextLost: ((event: Event) => void) | null = null;
	private handleContextRestored: (() => void) | null = null;

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

		await this.app.init({
			width: vw,
			height: vh,
			background: GAME_CONFIG.CANVAS_BG,
			antialias: true,
			resolution: Math.max(1, window.devicePixelRatio || 1),
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

		const stars = generateStars(vw, vh, Math.floor(GAME_CONFIG.BACKGROUND_STARS * (vw / 800)));
		this.background = new BackgroundRenderer(stars, vw, vh);
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
			threshold: 0.35,
			bloomScale: 1.1,
			brightness: 1.0,
			blur: 6,
			quality: 4,
		});
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

	public resize(): void {
		// PixiJS resizeTo handles the canvas; recompute the camera for the new size.
		if (this.app && this.initialized) {
			const range = this.engine.state.tower?.stats?.range ?? 0;
			const zoom = this.engine.state.runActive ? this.computeZoom(range) : 1;
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

		this.enemy.sync(state.enemies, effTime, settings.reducedMotion);
		this.projectile.sync(state.projectiles);
		this.effects.syncParticles(this.engine.particles, settings);
		this.effects.syncShockwaves(this.engine.shockwaves, settings);
		this.effects.syncDamageNumbers(this.engine.damageNumbers, settings);
		this.effects.syncDeathEffects(this.engine.deathEffects, settings, effTime);
		const nextIsBoss = isNextWaveBoss(state);
		this.effects.syncWaveAnnounce(
			state.wave.currentWave,
			state.wave.enemiesInWave,
			state.wave.betweenWaveTimer,
			state.wave.waveActive,
			this.app.screen.width,
			this.app.screen.height,
			state.wave.killsByTypeThisWave ?? {},
			state.wave.waveActive ? [] : previewNextWaveTypes(state, nextIsBoss),
			nextIsBoss,
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

/**
 * Compute the enemy types eligible for the upcoming wave so the inter-wave
 * announce can preview them. De-duplicates the weighted `availableEnemyTypes`
 * list (which acts as spawn-weight duplicates). Boss is appended for boss
 * waves so the preview row shows the boss glyph.
 */
function previewNextWaveTypes(state: GameState, isBossWave: boolean): EnemyType[] {
	const upcoming = state.wave.currentWave + 1;
	const front = state.tier ?? 1;
	const eligible = Array.from(new Set(availableEnemyTypes(upcoming, front)));
	if (isBossWave && !eligible.includes(EnemyType.Boss)) eligible.push(EnemyType.Boss);
	return eligible;
}
