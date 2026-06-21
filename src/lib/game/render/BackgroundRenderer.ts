import { Container, Graphics } from 'pixi.js';
import { GAME_CONFIG } from '../engine/gameConfig';

export class BackgroundRenderer {
	public container: Container;
	public width: number;
	public height: number;
	private bgGfx = new Graphics();
	private gridGfx = new Graphics();
	private starGfxs: Graphics[] = [];
	private stars: ReturnType<typeof import('./renderUtils').generateStars>;
	private lastTwinkle = 0;

	constructor(stars: ReturnType<typeof import('./renderUtils').generateStars>, width: number, height: number) {
		this.width = width;
		this.height = height;
		this.stars = stars;
		this.container = new Container();
		this.container.addChild(this.bgGfx);
		this.container.addChild(this.gridGfx);

		// Stars with additive blend for glow — single parent Container
		// avoids ~80 individual batch breaks vs per-Graphics blendMode.
		const starLayer = new Container();
		starLayer.blendMode = 'add';
		for (const star of stars) {
			const sg = new Graphics();
			starLayer.addChild(sg);
			this.starGfxs.push(sg);
		}
		this.container.addChild(starLayer);

		this.drawStatic();
	}

	private drawStatic(): void {
		const w = this.width;
		const h = this.height;
		const cx = w / 2, cy = h / 2;
		const g = this.bgGfx;

		// Deep space
		g.rect(0, 0, w, h).fill(GAME_CONFIG.CANVAS_BG);

		// Atmospheric glow
		for (let i = 5; i >= 0; i--) {
			const t = i / 5;
			const r = w * 0.55 * (0.25 + t * 0.75);
			const alpha = 0.06 - t * 0.03;
			const col = i % 2 === 0 ? GAME_CONFIG.NEON_CYAN : GAME_CONFIG.NEON_BLUE;
			g.circle(cx, cy, r).fill({ color: col, alpha: Math.max(0.01, alpha) });
		}

		// Vignette
		for (let i = 0; i < 6; i++) {
			const t = i / 5;
			const r = w * (0.3 + t * 0.35);
			g.circle(cx, cy, r).fill({ color: 0x000000, alpha: t * 0.065 });
		}

		// Grid
		const gs = GAME_CONFIG.BACKGROUND_GRID_SIZE;
		const grid = this.gridGfx;
		for (let x = 0; x <= w; x += gs) {
			grid.moveTo(x, 0).lineTo(x, h).stroke({ width: 0.5, color: GAME_CONFIG.NEON_CYAN, alpha: 0.025 });
		}
		for (let y = 0; y <= h; y += gs) {
			grid.moveTo(0, y).lineTo(w, y).stroke({ width: 0.5, color: GAME_CONFIG.NEON_CYAN, alpha: 0.025 });
		}
	}

	update(time: number, _dt: number): void {
		// Grid pulse — clamped to valid alpha range
		this.gridGfx.alpha = Math.min(1, Math.max(0.1, Math.sin(time * 0.3) * 0.3 + 0.85));

		// Stars twinkle (throttled to ~10 updates/sec for performance)
		if (time - this.lastTwinkle < 0.1) return;
		this.lastTwinkle = time;

		for (let i = 0; i < this.stars.length; i++) {
			const star = this.stars[i]!;
			const gfx = this.starGfxs[i]!;
			const twinkle = Math.sin(time * 2 + star.x * 0.07 + star.y * 0.09) * 0.5 + 0.5;
			const a = star.alpha * (0.3 + twinkle * 0.7);
			gfx.clear();
			gfx.circle(star.x, star.y, star.size * (0.8 + twinkle * 0.4)).fill({ color: 0xB4C8FF, alpha: a });
			if (star.size > 1.4 && a > 0.45) {
				gfx.circle(star.x, star.y, star.size * 3.5).fill({ color: 0xB4C8FF, alpha: a * 0.12 });
			}
		}
	}

	destroy(): void {
		// Container destroy handles children — no need to destroy individually
		this.container.destroy({ children: true });
	}
}
