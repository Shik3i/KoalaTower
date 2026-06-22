import { Container, Graphics } from 'pixi.js';
import { GAME_CONFIG } from '../engine/gameConfig';
import { TOWER_SKINS } from '../balance/skins';

export class TowerRenderer {
	public container: Container;
	public x: number;
	public y: number;
	public skinId: string;

	private towerGfx = new Graphics();
	private arcsGfx = new Graphics();
	private muzzleGfx = new Graphics();
	// Pulsing energy core, drawn each frame strictly inside the octagon body.
	// (Replaces the removed external orbitals — nothing renders outside the tower.)
	private coreGfx = new Graphics();
	public rangeGfx = new Graphics();
	public rangeContainer = new Container();
	private readonly _skin: typeof TOWER_SKINS[number];

	private _muzzleFlash = 0;

	constructor(x: number, y: number, skinId = 'classic') {
		this.x = x;
		this.y = y;
		this.skinId = skinId;
		this._skin = TOWER_SKINS.find(sk => sk.id === skinId) ?? TOWER_SKINS[0]!;

		this.container = new Container();
		this.container.x = x;
		this.container.y = y;

		// Additive glow layer for arcs + muzzle + the inner energy core
		const glowLayer = new Container();
		glowLayer.blendMode = 'add';
		glowLayer.addChild(this.arcsGfx);
		glowLayer.addChild(this.muzzleGfx);
		glowLayer.addChild(this.coreGfx);

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

		const skin = this._skin;
		const c = skin.colors;

		// Octagon body (solid core)
		this.drawOctagon(g, cx, cy, s);
		g.fill({ color: c.coreFill, alpha: 0.85 });
		g.stroke({ width: 2.5, color: c.coreStroke, alpha: 0.95 });

		// Inner ring 1
		this.drawOctagon(g, cx, cy, s * 0.58);
		g.stroke({ width: 1.2, color: c.innerStroke1, alpha: 0.4 });

		// Inner ring 2
		this.drawOctagon(g, cx, cy, s * 0.33);
		g.stroke({ width: 1, color: c.innerStroke2, alpha: 0.3 });

		// Core hex
		for (let i = 0; i < 6; i++) {
			const a = (Math.PI / 3) * i - Math.PI / 6;
			i === 0
				? g.moveTo(cx + Math.cos(a) * s * 0.22, cy + Math.sin(a) * s * 0.22)
				: g.lineTo(cx + Math.cos(a) * s * 0.22, cy + Math.sin(a) * s * 0.22);
		}
		g.closePath().fill({ color: c.centerHex, alpha: 0.8 });

		// Bright center
		g.circle(cx, cy, s * 0.08).fill({ color: c.centerBright, alpha: 0.95 });

		// (Removed) The rotating decorative arc/crosshair ring that clung to the
		// tower was distracting — the tower body now reads cleanly on its own.
	}

	updateVisuals(time: number, hpPct: number, multishotCount = 0): void {
		const hpDanger = hpPct < 0.3;
		const dangerPulse = Math.sin(time * 4.5) * 0.3 + 0.7;
		const pulse = Math.sin(time * 0.75) * 0.25 + 0.75;

		const skin = this._skin;
		const c = skin.colors;

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

		// Muzzle flash
		if (this._muzzleFlash > 0) {
			const mf = this._muzzleFlash;
			this.muzzleGfx.clear();
			this.muzzleGfx.circle(0, 0, GAME_CONFIG.TOWER_SIZE * 0.8 + (1 - mf) * GAME_CONFIG.TOWER_SIZE * 2.5)
				.stroke({ width: 6 * mf, color: c.muzzleColor, alpha: mf * 0.35 });
			this.muzzleGfx.alpha = mf;
		} else {
			this.muzzleGfx.clear();
			this.muzzleGfx.alpha = 0;
		}

		// Inner energy core — a living, breathing centre that flares on each shot.
		// Drawn entirely within the octagon body (max radius ~0.41·TOWER_SIZE, well
		// inside the s·0.58 inner ring) so the tower never gains anything external.
		const s = GAME_CONFIG.TOWER_SIZE;
		const beat = Math.sin(time * 2.2) * 0.5 + 0.5; // 0..1 idle breathing
		const flare = this._muzzleFlash;               // 0..1 brief firing flare
		const coreR = s * (0.1 + beat * 0.05 + flare * 0.08);
		const core = this.coreGfx;
		core.clear();
		core.circle(0, 0, coreR * 1.8).fill({ color: c.centerBright, alpha: 0.1 + flare * 0.2 });
		core.circle(0, 0, coreR).fill({ color: c.muzzleColor, alpha: 0.32 + beat * 0.15 + flare * 0.3 });
		core.circle(0, 0, coreR * 0.5).fill({ color: 0xFFFFFF, alpha: 0.45 + flare * 0.4 });
	}

	updateRange(range: number, lastRange: number): number {
		if (range === lastRange) return lastRange;
		const g = this.rangeGfx;
		g.clear();
		const cx = this.x, cy = this.y;

		const skin = this._skin;
		const rColor = skin.colors.coreStroke;

		// Subtle range fill
		for (let i = 2; i >= 0; i--) {
			g.circle(cx, cy, range * (0.4 + (i / 2) * 0.6)).fill({ color: rColor, alpha: 0.003 + (i / 2) * 0.006 });
		}

		// Dashed ring — moveTo before each arc to prevent connecting lines
		const segs = 32;
		for (let i = 0; i < segs; i += 2) {
			const a1 = (Math.PI * 2 / segs) * i;
			const a2 = a1 + (Math.PI * 2 / segs);
			g.moveTo(cx + Math.cos(a1) * range, cy + Math.sin(a1) * range);
			g.arc(cx, cy, range, a1, a2).stroke({ width: 1, color: rColor, alpha: 0.12 });
		}

		// Rotating dots
		const dots = 8;
		for (let i = 0; i < dots; i++) {
			const a = (Math.PI * 2 / dots) * i;
			g.circle(cx + Math.cos(a) * range, cy + Math.sin(a) * range, 2).fill({ color: rColor, alpha: 0.2 });
		}

		return range;
	}

	destroy(): void {
		this.container.destroy({ children: true });
		this.rangeContainer.destroy({ children: true });
	}
}
