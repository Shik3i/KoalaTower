import { Container, Graphics } from 'pixi.js';
import { GAME_CONFIG } from '../engine/gameConfig';

export class BackgroundRenderer {
	public container: Container;
	public width: number;
	public height: number;
	private bgGfx = new Graphics();
	private gridGfx = new Graphics();
	private starLayer = new Container();
	private starGfxs: Graphics[] = [];
	private stars: ReturnType<typeof import('./renderUtils').generateStars>;
	private lastTwinkle = 0;
	private zoomParallax = 1;

	constructor(stars: ReturnType<typeof import('./renderUtils').generateStars>, width: number, height: number) {
		this.width = width;
		this.height = height;
		this.stars = stars;
		this.container = new Container();
		this.container.addChild(this.bgGfx);
		this.container.addChild(this.gridGfx);

		// Stars with additive blend for glow — single parent Container
		// avoids ~80 individual batch breaks vs per-Graphics blendMode.
		const starLayer = this.starLayer;
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

	/**
	 * Re-fit the static background to a new canvas size. The atmospheric glow,
	 * vignette and grid are all centred on (w/2, h/2), so without this they stay
	 * anchored to the original dimensions and drift off-centre after a viewport
	 * resize. Star positions are rescaled proportionally to keep the field evenly
	 * covered rather than clustered in one corner.
	 */
	resize(width: number, height: number): void {
		if (width <= 0 || height <= 0 || (width === this.width && height === this.height)) return;
		const sx = width / this.width;
		const sy = height / this.height;
		this.width = width;
		this.height = height;
		for (const star of this.stars) { star.x *= sx; star.y *= sy; }
		this.bgGfx.clear();
		this.gridGfx.clear();
		this.drawStatic();
	}

	/**
	 * Couple the (canvas-pinned) starfield to the camera zoom so it reads as a
	 * distant backdrop: when the world zooms out the stars shrink slightly toward
	 * centre, giving parallax depth the otherwise-static background lacks. Gentle
	 * and clamped so it never looks like the stars are zooming with the action.
	 */
	setZoomParallax(zoom: number): void {
		this.zoomParallax = Math.max(0.85, Math.min(1.1, 1 + (zoom - 1) * 0.2));
	}

	update(time: number, _dt: number): void {
		// Grid pulse — clamped to valid alpha range
		this.gridGfx.alpha = Math.min(1, Math.max(0.1, Math.sin(time * 0.3) * 0.3 + 0.85));

		// Parallax: slow ambient drift + zoom-coupled scale, pivoted on the canvas
		// centre so the field breathes with subtle depth rather than sitting flat.
		const driftX = Math.sin(time * 0.05) * 6;
		const driftY = Math.cos(time * 0.04) * 4;
		this.starLayer.pivot.set(this.width / 2, this.height / 2);
		this.starLayer.position.set(this.width / 2 + driftX, this.height / 2 + driftY);
		this.starLayer.scale.set(this.zoomParallax);

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
