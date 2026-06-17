import { Container, Graphics } from 'pixi.js';
import type { Enemy } from '../engine/gameTypes';

interface EnemyMeta {
	shape: Graphics;
	inner: Graphics;
	glow: Graphics;
	type: string;
	size: number;
	boss: boolean;
	shiny: boolean;
	spawnTime: number;   // time value when first seen (for spawn-in scale)
	spin: number;        // per-enemy rotation speed (rad/s)
	spinPhase: number;   // per-enemy starting angle
}

const _meta = new WeakMap<Container, EnemyMeta>();

export class EnemyRenderer {
	public container = new Container();
	private gfxMap = new Map<number, Container>();

	sync(enemies: Enemy[], time: number, reduced: boolean = false): void {
		const activeIds = new Set<number>();

		for (const enemy of enemies) {
			if (!enemy.alive) continue;
			activeIds.add(enemy.id);

			let c = this.gfxMap.get(enemy.id);
			if (!c) {
				c = this.create(enemy, time);
				this.container.addChild(c);
				this.gfxMap.set(enemy.id, c);
			}
			this.updateVisuals(c, enemy, time, reduced);

			c.x = enemy.position.x;
			c.y = enemy.position.y;
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

	private create(enemy: Enemy, time: number): Container {
		const c = new Container();
		const shape = new Graphics();
		const inner = new Graphics();
		const glow = new Graphics();
		c.addChild(glow);
		c.addChild(shape);
		c.addChild(inner);
		// Bosses spin slowly and majestically; smaller enemies spin a touch faster.
		// Direction alternates by id so a swarm doesn't rotate in lockstep.
		const dir = (enemy.id % 2 === 0) ? 1 : -1;
		const spin = enemy.isBoss ? 0.25 * dir : (0.4 + (enemy.id % 5) * 0.12) * dir;
		_meta.set(c, {
			shape, inner, glow,
			type: enemy.type, size: enemy.size, boss: enemy.isBoss, shiny: enemy.isShiny,
			spawnTime: time, spin, spinPhase: (enemy.id % 7) * 0.9,
		});
		this.draw(enemy, shape, inner, glow);
		return c;
	}

	private updateVisuals(c: Container, enemy: Enemy, time: number, reduced: boolean): void {
		const meta = _meta.get(c);
		if (!meta) return;

		if (meta.type !== enemy.type || meta.size !== enemy.size || meta.boss !== enemy.isBoss || meta.shiny !== enemy.isShiny) {
			this.draw(enemy, meta.shape, meta.inner, meta.glow);
			meta.type = enemy.type;
			meta.size = enemy.size;
			meta.boss = enemy.isBoss;
			meta.shiny = enemy.isShiny;
		}

		const flash = enemy.hitFlashTimer > 0;
		meta.shape.alpha = flash ? 1 : 0.9;

		if (reduced) {
			// Accessibility: no spin/pulse/spawn animation, just a steady shape.
			c.scale.set(flash ? 1.12 : 1);
			c.rotation = 0;
		} else {
			// Spawn-in: ease-out scale from 0 over the first ~0.28s.
			const age = time - meta.spawnTime;
			const spawnT = Math.min(1, age / 0.28);
			const spawnScale = 1 - (1 - spawnT) * (1 - spawnT); // ease-out quad
			// Idle pulse — gentle breathing so the field feels alive.
			const pulse = 1 + Math.sin(time * 3 + meta.spinPhase) * (enemy.isBoss ? 0.015 : 0.04);
			c.scale.set(spawnScale * pulse * (flash ? 1.12 : 1));
			// Continuous rotation (movement-agnostic — geometric identity stays readable).
			c.rotation = meta.spinPhase + time * meta.spin;
		}

		// Hit flash — briefly brighten
		if (flash) {
			meta.shape.tint = 0xDDDDFF;
			meta.glow.tint = 0xDDDDFF;
		} else {
			meta.shape.tint = 0xFFFFFF;
			meta.glow.tint = 0xFFFFFF;
		}

		// Shiny glow pulse
		if (enemy.isShiny) {
			const sp = 0.7 + 0.3 * Math.sin(time * 5 + enemy.id * 0.5);
			meta.glow.alpha = sp * 0.6;
		} else {
			meta.glow.alpha = 0;
		}
	}

	private draw(enemy: Enemy, s: Graphics, inner: Graphics, glow: Graphics): void {
		const hw = enemy.size / 2;
		const color = enemy.color;
		const lw = enemy.isBoss ? 3 : 2;

		s.clear();
		inner.clear();
		glow.clear();

		// Shiny glow circle
		if (enemy.isShiny) {
			glow.circle(0, 0, enemy.size * 1.4)
				.fill({ color: 0xFFD700, alpha: 0.12 })
				.stroke({ width: 2.5, color: 0xFFD700, alpha: 0.5 });
			glow.circle(0, 0, enemy.size * 2.0)
				.stroke({ width: 1.5, color: 0xFFD700, alpha: 0.2 });
		}

		// Semi-transparent fill for all enemies
		const fillAlpha = enemy.isBoss ? 0.15 : 0.1;

		switch (enemy.shape) {
			case 'square':
				s.rect(-hw, -hw, enemy.size, enemy.size).fill({ color, alpha: fillAlpha })
					.stroke({ width: lw, color, alpha: 0.95 });
				inner.rect(-enemy.size / 3, -enemy.size / 3, enemy.size * 2 / 3, enemy.size * 2 / 3)
					.stroke({ width: 0.8, color, alpha: 0.4 });
				break;
			case 'diamond':
				s.moveTo(0, -hw).lineTo(hw, 0).lineTo(0, hw).lineTo(-hw, 0).closePath()
					.fill({ color, alpha: fillAlpha })
					.stroke({ width: lw, color, alpha: 0.95 });
				inner.moveTo(0, -enemy.size / 3).lineTo(enemy.size / 3, 0).lineTo(0, enemy.size / 3).lineTo(-enemy.size / 3, 0).closePath()
					.stroke({ width: 0.8, color, alpha: 0.4 });
				break;
			case 'hexagon':
				for (let i = 0; i < 6; i++) {
					const a = (Math.PI / 3) * i - Math.PI / 6;
					i === 0 ? s.moveTo(Math.cos(a) * hw, Math.sin(a) * hw) : s.lineTo(Math.cos(a) * hw, Math.sin(a) * hw);
				}
				s.closePath().fill({ color, alpha: fillAlpha }).stroke({ width: lw, color, alpha: 0.95 });
				for (let i = 0; i < 6; i++) {
					const a = (Math.PI / 3) * i - Math.PI / 6;
					i === 0 ? inner.moveTo(Math.cos(a) * enemy.size / 3.5, Math.sin(a) * enemy.size / 3.5)
						: inner.lineTo(Math.cos(a) * enemy.size / 3.5, Math.sin(a) * enemy.size / 3.5);
				}
				inner.closePath().stroke({ width: 0.8, color, alpha: 0.4 });
				break;
			case 'triangle':
				s.moveTo(hw, 0).lineTo(-hw, -hw).lineTo(-hw, hw).closePath()
					.fill({ color, alpha: fillAlpha })
					.stroke({ width: lw, color, alpha: 0.95 });
				break;
			case 'pentagon':
				for (let i = 0; i < 5; i++) {
					const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
					i === 0 ? s.moveTo(Math.cos(a) * hw, Math.sin(a) * hw) : s.lineTo(Math.cos(a) * hw, Math.sin(a) * hw);
				}
				s.closePath().fill({ color, alpha: fillAlpha }).stroke({ width: lw, color, alpha: 0.95 });
				for (let i = 0; i < 5; i++) {
					const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
					i === 0 ? inner.moveTo(Math.cos(a) * enemy.size / 3.5, Math.sin(a) * enemy.size / 3.5)
						: inner.lineTo(Math.cos(a) * enemy.size / 3.5, Math.sin(a) * enemy.size / 3.5);
				}
				inner.closePath().stroke({ width: 0.8, color, alpha: 0.4 });
				break;
		}

		// Boss aura
		if (enemy.isBoss) {
			s.circle(0, 0, enemy.size * 2.2).stroke({ width: 2.5, color, alpha: 0.3 });
			s.circle(0, 0, enemy.size * 0.85).stroke({ width: 2, color, alpha: 0.4 });
		}
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
