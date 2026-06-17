import { Container, Graphics } from 'pixi.js';
import { GAME_CONFIG } from '../engine/gameConfig';

export class TowerRenderer {
	public container: Container;
	public x: number;
	public y: number;

	private towerGfx = new Graphics();
	private arcsGfx = new Graphics();
	private muzzleGfx = new Graphics();
	public rangeGfx = new Graphics();
	public rangeContainer = new Container();

	private _muzzleFlash = 0;

	constructor(x: number, y: number) {
		this.x = x;
		this.y = y;

		this.container = new Container();
		this.container.x = x;
		this.container.y = y;

		// Additive glow layer for arcs + muzzle
		const glowLayer = new Container();
		glowLayer.blendMode = 'add';
		glowLayer.addChild(this.arcsGfx);
		glowLayer.addChild(this.muzzleGfx);

		this.container.addChild(this.towerGfx);
		this.container.addChild(glowLayer);

		this.rangeContainer.addChild(this.rangeGfx);

		this.drawTower();
	}

	set muzzleFlash(v: number) { this._muzzleFlash = v; }
	get muzzleFlash(): number { return this._muzzleFlash; }

	private drawOctagon(g: Graphics, cx: number, cy: number, r: number): void {
		g.moveTo(cx + Math.cos(-Math.PI / 8) * r, cy + Math.sin(-Math.PI / 8) * r);
		for (let i = 1; i < 8; i++) {
			const a = (Math.PI / 4) * i - Math.PI / 8;
			g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
		}
		g.closePath();
	}

	private drawTower(): void {
		const g = this.towerGfx;
		const s = GAME_CONFIG.TOWER_SIZE;
		const cx = 0, cy = 0;

		// Octagon body (solid core)
		this.drawOctagon(g, cx, cy, s);
		g.fill({ color: 0x2255CC, alpha: 0.85 });
		g.stroke({ width: 2.5, color: GAME_CONFIG.NEON_CYAN, alpha: 0.95 });

		// Inner ring 1
		this.drawOctagon(g, cx, cy, s * 0.58);
		g.stroke({ width: 1.2, color: GAME_CONFIG.NEON_CYAN, alpha: 0.4 });

		// Inner ring 2
		this.drawOctagon(g, cx, cy, s * 0.33);
		g.stroke({ width: 1, color: GAME_CONFIG.NEON_BLUE, alpha: 0.3 });

		// Core hex
		for (let i = 0; i < 6; i++) {
			const a = (Math.PI / 3) * i - Math.PI / 6;
			i === 0
				? g.moveTo(cx + Math.cos(a) * s * 0.22, cy + Math.sin(a) * s * 0.22)
				: g.lineTo(cx + Math.cos(a) * s * 0.22, cy + Math.sin(a) * s * 0.22);
		}
		g.closePath().fill({ color: GAME_CONFIG.NEON_CYAN, alpha: 0.8 });

		// Bright center
		g.circle(cx, cy, s * 0.08).fill({ color: 0xFFFFFF, alpha: 0.95 });

		// Arcs (additive glow layer)
		const a = this.arcsGfx;
		for (let i = 0; i < 4; i++) {
			const baseA = (Math.PI / 2) * i;
			const r1 = s * 0.4, r2 = s * 0.9;
			const start1 = baseA, end1 = baseA + Math.PI * 0.35;
			const start2 = baseA + Math.PI, end2 = baseA + Math.PI + Math.PI * 0.35;
			a.moveTo(cx + Math.cos(start1) * r1, cy + Math.sin(start1) * r1);
			a.arc(cx, cy, r1, start1, end1);
			a.stroke({ width: 1.8, color: GAME_CONFIG.NEON_CYAN, alpha: 0.3 });
			a.moveTo(cx + Math.cos(start2) * r2, cy + Math.sin(start2) * r2);
			a.arc(cx, cy, r2, start2, end2);
			a.stroke({ width: 1.8, color: GAME_CONFIG.NEON_CYAN, alpha: 0.3 });
		}

		// Crosshair
		for (let i = 0; i < 4; i++) {
			const ca = (Math.PI / 2) * i;
			a.moveTo(cx + Math.cos(ca) * s * 0.35, cy + Math.sin(ca) * s * 0.35)
				.lineTo(cx + Math.cos(ca) * s * 0.85, cy + Math.sin(ca) * s * 0.85);
			a.stroke({ width: 1, color: GAME_CONFIG.NEON_CYAN, alpha: 0.25 });
		}
	}

	updateVisuals(time: number, hpPct: number): void {
		const hpDanger = hpPct < 0.3;
		const dangerPulse = Math.sin(time * 4.5) * 0.3 + 0.7;
		const pulse = Math.sin(time * 0.75) * 0.25 + 0.75;

		// HP-based tint
		if (hpDanger) {
			const r = Math.round(255 * (0.7 + dangerPulse * 0.3));
			const g = Math.round(100 * (1 - dangerPulse * 0.6));
			const b = Math.round(100 * (1 - dangerPulse * 0.6));
			this.towerGfx.tint = (r << 16) | (g << 8) | b;
			this.container.alpha = 0.8 + dangerPulse * 0.2;
		} else {
			this.towerGfx.tint = 0xFFFFFF;
			this.container.alpha = pulse * 0.7 + 0.3;
		}

		// Rotate arcs
		if (time > 0) this.arcsGfx.rotation += 0.015;

		// Muzzle flash
		if (this._muzzleFlash > 0) {
			const mf = this._muzzleFlash;
			this.muzzleGfx.clear();
			this.muzzleGfx.circle(0, 0, GAME_CONFIG.TOWER_SIZE * 0.8 + (1 - mf) * GAME_CONFIG.TOWER_SIZE * 2.5)
				.stroke({ width: 6 * mf, color: 0xFFFFFF, alpha: mf * 0.35 });
			this.muzzleGfx.alpha = mf;
		} else {
			this.muzzleGfx.clear();
			this.muzzleGfx.alpha = 0;
		}
	}

	updateRange(range: number, lastRange: number): number {
		if (range === lastRange) return lastRange;
		const g = this.rangeGfx;
		g.clear();
		const cx = this.x, cy = this.y;

		// Subtle range fill
		for (let i = 2; i >= 0; i--) {
			g.circle(cx, cy, range * (0.4 + (i / 2) * 0.6)).fill({ color: GAME_CONFIG.NEON_CYAN, alpha: 0.003 + (i / 2) * 0.006 });
		}

		// Dashed ring — moveTo before each arc to prevent connecting lines
		const segs = 32;
		for (let i = 0; i < segs; i += 2) {
			const a1 = (Math.PI * 2 / segs) * i;
			const a2 = a1 + (Math.PI * 2 / segs);
			g.moveTo(cx + Math.cos(a1) * range, cy + Math.sin(a1) * range);
			g.arc(cx, cy, range, a1, a2).stroke({ width: 1, color: GAME_CONFIG.NEON_CYAN, alpha: 0.12 });
		}

		// Rotating dots
		const dots = 8;
		for (let i = 0; i < dots; i++) {
			const a = (Math.PI * 2 / dots) * i;
			g.circle(cx + Math.cos(a) * range, cy + Math.sin(a) * range, 2).fill({ color: GAME_CONFIG.NEON_CYAN, alpha: 0.2 });
		}

		return range;
	}

	destroy(): void {
		this.container.destroy({ children: true });
		this.rangeContainer.destroy({ children: true });
	}
}
