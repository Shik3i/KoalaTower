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

	private loop = (now: number): void => {
		if (!this.running) return;

		const rawDt = (now - this.lastTime) / 1000;
		this.lastTime = now;
		const dt = Math.min(rawDt, GAME_CONFIG.CLAMP_DELTA);
		this.time += dt;

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
			drawTower(ctx, state.tower.position.x, state.tower.position.y, GAME_CONFIG.TOWER_SIZE, state.tower.hp, state.tower.maxHp);
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
			const fadeIn = Math.min(1, progress * 3);
			const fadeOut = Math.max(0, Math.min(1, (1 - progress) * 5));
			const alpha = Math.min(fadeIn, fadeOut);
			const nextWave = state.wave.currentWave + 1;

			ctx.save();
			ctx.globalAlpha = alpha;

			// Background bar
			ctx.fillStyle = 'rgba(0, 255, 255, 0.04)';
			ctx.fillRect(0, h / 2 - 70, w, 80);

			// Top accent line
			ctx.fillStyle = `rgba(0, 255, 255, ${0.15 * alpha})`;
			ctx.fillRect(0, h / 2 - 70, w, 1);

			// Bottom accent line
			ctx.fillStyle = `rgba(0, 255, 255, ${0.1 * alpha})`;
			ctx.fillRect(0, h / 2 + 9, w, 1);

			// Wave label
			ctx.fillStyle = `rgba(240, 244, 255, ${0.4 * alpha})`;
			ctx.font = '400 12px "SF Mono", "Fira Code", monospace';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'bottom';
			ctx.fillText('WAVE', w / 2, h / 2 - 38);

			// Wave number with glow
			ctx.shadowColor = 'rgba(0, 255, 255, 0.6)';
			ctx.shadowBlur = 30 * alpha;
			ctx.fillStyle = '#00FFFF';
			ctx.font = 'bold 44px "SF Mono", "Fira Code", monospace';
			ctx.textBaseline = 'top';
			ctx.fillText(`${nextWave}`, w / 2, h / 2 - 28);
			ctx.shadowBlur = 0;

			// Sub label
			ctx.fillStyle = `rgba(240, 244, 255, ${0.3 * alpha})`;
			ctx.font = '400 10px "SF Mono", "Fira Code", monospace';
			ctx.textBaseline = 'top';
			const totalEnemies = state.wave.enemiesInWave || 0;
			ctx.fillText(`▶ ${totalEnemies} enemies incoming`, w / 2, h / 2 + 24);

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
