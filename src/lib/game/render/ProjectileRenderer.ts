import { Container, Graphics } from 'pixi.js';
import type { Projectile } from '../engine/gameTypes';

interface ProjectileMeta {
	trail: Graphics;
	body: Graphics;
	ring: Graphics;
	crit: boolean;
	color: number;
}

const _meta = new WeakMap<Container, ProjectileMeta>();

export class ProjectileRenderer {
	public container = new Container();
	private gfxMap = new Map<number, Container>();
	private free: Container[] = [];
	private activeIds = new Set<number>();

	sync(projectiles: Projectile[]): void {
		const activeIds = this.activeIds;
		activeIds.clear();

		for (const proj of projectiles) {
			if (!proj.alive) continue;
			activeIds.add(proj.id);

			let c = this.gfxMap.get(proj.id);
			if (!c) {
				c = this.acquire(proj);
				this.gfxMap.set(proj.id, c);
			}

			c.x = proj.position.x;
			c.y = proj.position.y;

			if (proj.trail.length >= 2) {
				const prev = proj.trail[proj.trail.length - 2]!;
				c.rotation = Math.atan2(proj.position.y - prev.y, proj.position.x - prev.x) + Math.PI / 2;
			}

			// Render trail
			const meta = _meta.get(c);
			if (meta && proj.trail.length > 1) {
				const trailGfx = meta.trail;
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
				this.gfxMap.delete(id);
				this.free.push(c);
			}
		}
	}

	private acquire(proj: Projectile): Container {
		const pooled = this.free.pop();
		if (pooled) {
			const meta = _meta.get(pooled);
			if (meta) {
				this.drawProjectile(meta, proj);
				pooled.visible = true;
				pooled.rotation = 0;
				return pooled;
			}
		}

		const c = new Container();
		const trailGfx = new Graphics();
		const g = new Graphics();
		const ring = new Graphics();
		c.addChild(trailGfx);
		c.addChild(g);
		c.addChild(ring);
		const meta: ProjectileMeta = { trail: trailGfx, body: g, ring, crit: proj.isCrit, color: proj.color };
		_meta.set(c, meta);
		this.drawProjectile(meta, proj);
		this.container.addChild(c);
		return c;
	}

	private drawProjectile(meta: ProjectileMeta, proj: Projectile): void {
		const sz = proj.isCrit ? 4 : 2;
		const col = proj.color;

		meta.trail.clear();
		meta.body.clear();
		meta.ring.clear();
		meta.crit = proj.isCrit;
		meta.color = proj.color;

		meta.body.moveTo(0, -sz * 1.6).lineTo(sz * 0.6, 0).lineTo(0, sz * 0.4).lineTo(-sz * 0.6, 0).closePath()
			.fill({ color: 0xFFFFFF, alpha: 0.95 });
		meta.body.circle(0, 0, sz * 2.5).fill({ color: col, alpha: 0.4 });

		if (proj.isCrit) {
			meta.ring.visible = true;
			meta.ring.circle(0, 0, sz * 3.5).stroke({ width: 2.5, color: col, alpha: 0.5 });
		} else {
			meta.ring.visible = false;
		}
	}

	destroy(): void {
		for (const [, c] of this.gfxMap) {
			c.destroy({ children: true });
			_meta.delete(c);
		}
		this.gfxMap.clear();
		this.free.length = 0;
		this.container.destroy({ children: true });
	}
}
