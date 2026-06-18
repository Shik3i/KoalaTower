import { Application } from 'pixi.js';
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

export class PixiGameView {
	private app!: Application;
	private domContainer: HTMLElement;
	private engine: GameEngine;

	private layers!: GameLayers;
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

	constructor(domContainer: HTMLElement, engine: GameEngine) {
		this.domContainer = domContainer;
		this.engine = engine;
		this.initPixi().catch(e => { this.initError = e; console.error('PixiJS init failed:', e); });
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
		this.tower = new TowerRenderer(vw / 2, vh / 2);
		this.enemy = new EnemyRenderer();
		this.projectile = new ProjectileRenderer();
		this.effects = new EffectsRenderer();

		this.projectile.container.blendMode = 'add';
		this.layers.range.blendMode = 'add';

		stage.addChild(this.layers.bg);
		this.layers.bg.addChild(this.background.container);

		stage.addChild(this.layers.range);
		this.layers.range.addChild(this.tower.rangeContainer);

		stage.addChild(this.layers.enemy);
		this.layers.enemy.addChild(this.enemy.container);
		// Death-effect proxies render directly under the enemy layer so corpses
		// fade behind any live enemies overlapping the same tile.
		this.layers.enemy.addChild(this.effects.deathContainer);

		stage.addChild(this.layers.projectile);
		this.layers.projectile.addChild(this.projectile.container);

		stage.addChild(this.layers.tower);
		this.layers.tower.addChild(this.tower.container);

		stage.addChild(this.layers.particle);
		this.layers.particle.addChild(this.effects.particleContainer);
		this.layers.particle.addChild(this.effects.shockwaveContainer);

		stage.addChild(this.layers.dmgText);
		this.layers.dmgText.addChild(this.effects.textContainer);

		stage.addChild(this.layers.waveAnnounce);
		this.layers.waveAnnounce.addChild(this.effects.waveContainer);

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
		// PixiJS resizeTo handles this automatically
		if (this.app && this.initialized) {
			const vw = this.app.screen.width;
			const vh = this.app.screen.height;
			this.engine.state.viewWidth = vw;
			this.engine.state.viewHeight = vh;
			this.tower.x = vw / 2;
			this.tower.y = vh / 2;
			this.tower.container.x = vw / 2;
			this.tower.container.y = vh / 2;
			if (this.engine.state.tower) {
				this.engine.state.tower.position.x = vw / 2;
				this.engine.state.tower.position.y = vh / 2;
			}
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
		this.tower.updateVisuals(effTime, hpPct);

		if (state.runActive && !state.gameOver) {
			const range = state.tower.stats.range;
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
			previewNextWaveTypes(state, nextIsBoss),
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
