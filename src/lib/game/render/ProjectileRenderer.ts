import { Container, Graphics } from 'pixi.js';
import type { Projectile } from '../engine/gameTypes';

const _meta = new WeakMap<Container, Graphics>();

export class ProjectileRenderer {
	public container = new Container();
	private gfxMap = new Map<number, Container>();

	sync(projectiles: Projectile[]): void {
		const activeIds = new Set<number>();

		for (const proj of projectiles) {
			if (!proj.alive) continue;
			activeIds.add(proj.id);

			let c = this.gfxMap.get(proj.id);
			if (!c) {
				c = this.create(proj);
				this.container.addChild(c);
				this.gfxMap.set(proj.id, c);
			}

			c.x = proj.position.x;
			c.y = proj.position.y;

			if (proj.trail.length >= 2) {
				const prev = proj.trail[proj.trail.length - 2]!;
				c.rotation = Math.atan2(proj.position.y - prev.y, proj.position.x - prev.x) + Math.PI / 2;
			}

			// Render trail
			const trailGfx = _meta.get(c);
			if (trailGfx && proj.trail.length > 1) {
				trailGfx.clear();
				const col = proj.color;
				const baseAlpha = proj.isCrit ? 0.5 : 0.35;
				for (let i = 1; i < proj.trail.length; i++) {
					const pt = proj.trail[i]!;
					const t = i / proj.trail.length;
					const r = (proj.isCrit ? 3 : 1.5) * t;
					trailGfx.circle(pt.x - c.x, pt.y - c.y, r).fill({ color: col, alpha: baseAlpha * t * 0.7 });
				}
			}

			c.visible = true;
		}

		for (const [id, c] of this.gfxMap) {
			if (!activeIds.has(id)) {
				c.visible = false;
				this.container.removeChild(c);
				c.destroy({ children: true });
				this.gfxMap.delete(id);
				_meta.delete(c);
			}
		}
	}

	private create(proj: Projectile): Container {
		const c = new Container();
		const trailGfx = new Graphics();
		const g = new Graphics();
		c.addChild(trailGfx);
		c.addChild(g);
		_meta.set(c, trailGfx);

		const sz = proj.isCrit ? 4 : 2;
		const col = proj.color;

		g.moveTo(0, -sz * 1.6).lineTo(sz * 0.6, 0).lineTo(0, sz * 0.4).lineTo(-sz * 0.6, 0).closePath()
			.fill({ color: 0xFFFFFF, alpha: 0.95 });
		g.circle(0, 0, sz * 2.5).fill({ color: col, alpha: 0.4 });

		if (proj.isCrit) {
			const ring = new Graphics();
			ring.circle(0, 0, sz * 3.5).stroke({ width: 2.5, color: col, alpha: 0.5 });
			c.addChild(ring);
		}

		return c;
	}

	destroy(): void {
		for (const [, c] of this.gfxMap) {
			c.destroy({ children: true });
			_meta.delete(c);
		}
		this.gfxMap.clear();
		this.container.destroy({ children: true });
	}
}
