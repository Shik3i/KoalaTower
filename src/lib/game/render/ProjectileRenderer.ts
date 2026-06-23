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

			const meta = _meta.get(c);

			// Rotate ONLY the body + ring to face the travel direction. The
			// container itself stays unrotated so the trail — which is drawn in
			// world-relative coordinates below — keeps its true world orientation.
			// (Rotating the container would spin the already-correct trail off in
			// an apparently random direction.)
			if (meta && proj.trail.length >= 2) {
				const prev = proj.trail[proj.trail.length - 2]!;
				const heading = Math.atan2(proj.position.y - prev.y, proj.position.x - prev.x) + Math.PI / 2;
				meta.body.rotation = heading;
				meta.ring.rotation = heading;
			}

			// Render trail as one continuous tapered ribbon (tail → head) instead of
			// stippled circles: smoother streak, and a single connected fill per
			// segment reads as a light-beam rather than a string of beads. Width
			// grows toward the head; alpha fades toward the tail.
			if (meta && proj.trail.length > 1) {
				const trailGfx = meta.trail;
				trailGfx.clear();
				const col = proj.color;
				const pts = proj.trail;
				const n = pts.length;
				const headW = proj.isCrit ? 3 : 1.6;
				const baseAlpha = proj.isCrit ? 0.5 : 0.35;
				// Perpendicular offsets along the path, scaled by a head-weighted taper.
				for (let i = 1; i < n; i++) {
					const p0 = pts[i - 1]!;
					const p1 = pts[i]!;
					let dx = p1.x - p0.x;
					let dy = p1.y - p0.y;
					const len = Math.hypot(dx, dy) || 1;
					const px = -dy / len;
					const py = dx / len;
					const t0 = (i - 1) / (n - 1);
					const t1 = i / (n - 1);
					const w0 = headW * t0;
					const w1 = headW * t1;
					const x0 = p0.x - c.x;
					const y0 = p0.y - c.y;
					const x1 = p1.x - c.x;
					const y1 = p1.y - c.y;
					trailGfx
						.moveTo(x0 + px * w0, y0 + py * w0)
						.lineTo(x1 + px * w1, y1 + py * w1)
						.lineTo(x1 - px * w1, y1 - py * w1)
						.lineTo(x0 - px * w0, y0 - py * w0)
						.closePath()
						.fill({ color: col, alpha: baseAlpha * t1 * 0.85 });
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
		meta.body.rotation = 0;
		meta.ring.rotation = 0;
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
