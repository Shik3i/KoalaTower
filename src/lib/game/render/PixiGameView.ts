import { GAME_CONFIG } from '../engine/gameConfig';
import type { GameEngine } from '../engine/GameEngine';
import {
	drawBackground,
	drawTower,
	drawEnemy,
	drawProjectile,
	drawParticle,
	drawDamageNumber,
	drawRangeIndicator,
	generateStars,
	setFrameTime,
} from './shapeFactory';

export class PixiGameView {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private engine: GameEngine;
	private stars: { x: number; y: number; size: number; alpha: number }[];
	private animFrameId: number | null = null;
	private running: boolean = false;
	private lastTime: number = 0;
	private w: number = GAME_CONFIG.VIEW_WIDTH;
	private h: number = GAME_CONFIG.VIEW_HEIGHT;
	private time: number = 0;

	/** Muzzle flash timer — decays over time, set when tower fires */
	public muzzleFlash: number = 0;

	constructor(container: HTMLElement, engine: GameEngine) {
		this.canvas = document.createElement('canvas');
		this.ctx = this.canvas.getContext('2d')!;
		this.engine = engine;
		this.stars = generateStars(GAME_CONFIG.VIEW_WIDTH, GAME_CONFIG.VIEW_HEIGHT, GAME_CONFIG.BACKGROUND_STARS);

		this.canvas.width = GAME_CONFIG.VIEW_WIDTH;
		this.canvas.height = GAME_CONFIG.VIEW_HEIGHT;
		this.canvas.style.width = '100%';
		this.canvas.style.height = '100%';
		this.canvas.style.display = 'block';
		this.canvas.style.imageRendering = 'pixelated';

		container.appendChild(this.canvas);
		this.resize();
	}

	public resize(): void {
		const parent = this.canvas.parentElement;
		if (!parent) return;

		const rect = parent.getBoundingClientRect();
		const aspect = GAME_CONFIG.VIEW_WIDTH / GAME_CONFIG.VIEW_HEIGHT;
		let w: number, h: number;

		if (rect.width / rect.height > aspect) {
			h = rect.height;
			w = h * aspect;
		} else {
			w = rect.width;
			h = w / aspect;
		}

		this.w = w;
		this.h = h;
		this.canvas.style.width = `${w}px`;
		this.canvas.style.height = `${h}px`;
	}

	public start(): void {
		if (this.running) return;
		this.running = true;
		this.lastTime = performance.now();
		this.loop(this.lastTime);
	}

	public stop(): void {
		this.running = false;
		if (this.animFrameId !== null) {
			cancelAnimationFrame(this.animFrameId);
			this.animFrameId = null;
		}
	}

	public triggerMuzzleFlash(): void {
		this.muzzleFlash = 1.0;
	}

	private loop = (now: number): void => {
		if (!this.running) return;

		const rawDt = (now - this.lastTime) / 1000;
		this.lastTime = now;
		const dt = Math.min(rawDt, GAME_CONFIG.CLAMP_DELTA);
		this.time += dt;

		// Decay muzzle flash
		if (this.muzzleFlash > 0) {
			this.muzzleFlash = Math.max(0, this.muzzleFlash - dt * 5);
		}

		// Update engine
		this.engine.update(dt);

		// Render
		this.render();

		this.animFrameId = requestAnimationFrame(this.loop);
	};

	private render(): void {
		const ctx = this.ctx;
		const w = this.canvas.width;
		const h = this.canvas.height;
		const state = this.engine.state;
		const shake = this.engine.shakeAmount;

		// Set shared frame time for all draw functions
		// Freeze time when reduced motion is enabled
		const effectiveTime = state.settings.reducedMotion ? 1 : this.time;
		setFrameTime(effectiveTime);

		ctx.save();

		// Screen shake
		if (shake > 0.5 && state.settings.screenShake) {
			const sx = (Math.random() - 0.5) * shake;
			const sy = (Math.random() - 0.5) * shake;
			ctx.translate(sx, sy);
		}

		// Background
		drawBackground(ctx, w, h, this.stars, this.time);

		// Range indicator
		if (state.runActive && !state.gameOver) {
			drawRangeIndicator(ctx, state.tower.position.x, state.tower.position.y, state.tower.stats.range);
		}

		// Tower
		if (state.tower.alive || !state.runActive) {
			drawTower(ctx, state.tower.position.x, state.tower.position.y, GAME_CONFIG.TOWER_SIZE, state.tower.hp, state.tower.maxHp, this.muzzleFlash);
		}

		// Enemies
		for (const enemy of state.enemies) {
			if (enemy.alive) {
				drawEnemy(ctx, enemy);
			}
		}

		// Projectiles
		for (const proj of state.projectiles) {
			if (proj.alive) {
				drawProjectile(ctx, proj.position, proj.trail, proj.color, proj.isCrit);
			}
		}

		// Particles
		for (const p of this.engine.particles) {
			drawParticle(ctx, p);
		}

		// Damage numbers
		for (const n of this.engine.damageNumbers) {
			drawDamageNumber(ctx, n);
		}

		// Wave announcement
		if (state.runActive && state.wave.betweenWaveTimer > 0 && !state.wave.waveActive && state.wave.currentWave > 0) {
			const t = state.wave.betweenWaveTimer;
			const duration = 3.0;
			const progress = Math.min(1, t / duration);
			const fadeIn = Math.min(1, progress * 2);
			const fadeOut = Math.max(0, Math.min(1, (1 - progress) * 4));
			const alpha = Math.min(fadeIn, fadeOut);
			const upcomingWave = state.wave.currentWave + 1;
			const isBossWave = upcomingWave % 10 === 0;
			const totalEnemies = state.wave.enemiesInWave || 0;

			ctx.save();
			ctx.globalAlpha = alpha;

			if (isBossWave) {
				// Boss wave gets a special pink/purple background
				ctx.fillStyle = 'rgba(255, 68, 170, 0.08)';
				ctx.fillRect(0, h / 2 - 110, w, 220);

				const bgGrad = ctx.createLinearGradient(0, h / 2 - 110, 0, h / 2 + 110);
				bgGrad.addColorStop(0, 'rgba(255, 68, 170, 0)');
				bgGrad.addColorStop(0.25, `rgba(255, 68, 170, ${0.08 * alpha})`);
				bgGrad.addColorStop(0.75, `rgba(255, 68, 170, ${0.08 * alpha})`);
				bgGrad.addColorStop(1, 'rgba(255, 68, 170, 0)');
				ctx.fillStyle = bgGrad;
				ctx.fillRect(0, h / 2 - 110, w, 220);

				// Warning stripes top & bottom
				ctx.fillStyle = `rgba(255, 68, 170, ${0.25 * alpha})`;
				ctx.fillRect(w * 0.1, h / 2 - 60, w * 0.8, 1);
				ctx.fillRect(w * 0.1, h / 2 + 54, w * 0.8, 1);

				// Side accent dots
				for (let i = 0; i < 10; i++) {
					const dotY = h / 2 - 50 + i * 11;
					ctx.fillStyle = `rgba(255, 68, 170, ${0.1 * alpha})`;
					ctx.fillRect(w * 0.08, dotY, 3, 3);
					ctx.fillRect(w * 0.92, dotY, 3, 3);
				}

				// "BOSS WAVE" label
				ctx.textAlign = 'center';
				ctx.textBaseline = 'bottom';
				ctx.fillStyle = `rgba(255, 68, 170, ${0.7 * alpha})`;
				ctx.font = '600 15px "SF Mono", "Fira Code", monospace';
				ctx.fillText('⚡ BOSS INCOMING ⚡', w / 2, h / 2 - 28);

				// Wave number — big, bold, pink glow
				ctx.textBaseline = 'top';
				ctx.shadowColor = `rgba(255, 68, 170, ${0.9 * alpha})`;
				ctx.shadowBlur = 60 * alpha;
				ctx.fillStyle = '#FF44AA';
				ctx.font = 'bold 64px "SF Mono", "Fira Code", monospace';
				ctx.fillText(`${upcomingWave}`, w / 2, h / 2 - 26);
				ctx.shadowBlur = 0;

				// Sub label
				ctx.textBaseline = 'top';
				ctx.fillStyle = `rgba(255, 68, 170, ${0.55 * alpha})`;
				ctx.font = '400 13px "SF Mono", "Fira Code", monospace';
				ctx.fillText(`▶ ${totalEnemies} enemies — Boss appears last`, w / 2, h / 2 + 58);
			} else {
				// Normal wave announcement
				const bgGrad = ctx.createLinearGradient(0, h / 2 - 90, 0, h / 2 + 80);
				bgGrad.addColorStop(0, `rgba(0, 255, 255, 0)`);
				bgGrad.addColorStop(0.3, `rgba(0, 255, 255, ${0.05 * alpha})`);
				bgGrad.addColorStop(0.7, `rgba(0, 255, 255, ${0.05 * alpha})`);
				bgGrad.addColorStop(1, `rgba(0, 255, 255, 0)`);
				ctx.fillStyle = bgGrad;
				ctx.fillRect(0, h / 2 - 90, w, 170);

				// Top accent line
				ctx.fillStyle = `rgba(0, 255, 255, ${0.15 * alpha})`;
				ctx.fillRect(w * 0.15, h / 2 - 48, w * 0.7, 1);

				// Bottom accent line
				ctx.fillStyle = `rgba(0, 255, 255, ${0.1 * alpha})`;
				ctx.fillRect(w * 0.2, h / 2 + 42, w * 0.6, 1);

				// "WAVE" label
				ctx.textAlign = 'center';
				ctx.textBaseline = 'bottom';
				ctx.fillStyle = `rgba(240, 244, 255, ${0.55 * alpha})`;
				ctx.font = '500 14px "SF Mono", "Fira Code", monospace';
				ctx.fillText('WAVE', w / 2, h / 2 - 22);

				// Wave number — big, bold, glowing
				ctx.textBaseline = 'top';
				ctx.shadowColor = 'rgba(0, 255, 255, 0.8)';
				ctx.shadowBlur = 50 * alpha;
				ctx.fillStyle = '#00FFFF';
				ctx.font = 'bold 52px "SF Mono", "Fira Code", monospace';
				ctx.fillText(`${upcomingWave}`, w / 2, h / 2 - 20);
				ctx.shadowBlur = 0;

				// Sub label: enemies count
				ctx.textBaseline = 'top';
				ctx.fillStyle = `rgba(240, 244, 255, ${0.4 * alpha})`;
				ctx.font = '400 12px "SF Mono", "Fira Code", monospace';
				ctx.fillText(`▶ ${totalEnemies} enemies`, w / 2, h / 2 + 46);
			}

			ctx.globalAlpha = 1;
			ctx.restore();
		}

		ctx.restore();
	}

	public getCanvas(): HTMLCanvasElement {
		return this.canvas;
	}

	public destroy(): void {
		this.stop();
		this.canvas.remove();
	}
}
