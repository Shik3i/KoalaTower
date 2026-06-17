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
}

const _meta = new WeakMap<Container, EnemyMeta>();

export class EnemyRenderer {
	public container = new Container();
	private gfxMap = new Map<number, Container>();

	sync(enemies: Enemy[], _time: number): void {
		const activeIds = new Set<number>();

		for (const enemy of enemies) {
			if (!enemy.alive) continue;
			activeIds.add(enemy.id);

			let c = this.gfxMap.get(enemy.id);
			if (!c) {
				c = this.create(enemy);
				this.container.addChild(c);
				this.gfxMap.set(enemy.id, c);
			} else {
				this.updateVisuals(c, enemy);
			}

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

	private create(enemy: Enemy): Container {
		const c = new Container();
		const shape = new Graphics();
		const inner = new Graphics();
		const glow = new Graphics();
		c.addChild(glow);
		c.addChild(shape);
		c.addChild(inner);
		_meta.set(c, { shape, inner, glow, type: enemy.type, size: enemy.size, boss: enemy.isBoss, shiny: enemy.isShiny });
		this.draw(enemy, shape, inner, glow);
		return c;
	}

	private updateVisuals(c: Container, enemy: Enemy): void {
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

		// Hit flash — briefly brighten plus scale pulse
		if (flash) {
			meta.shape.tint = 0xDDDDFF;
			meta.glow.tint = 0xDDDDFF;
			c.scale.set(1.08);
		} else {
			meta.shape.tint = 0xFFFFFF;
			meta.glow.tint = 0xFFFFFF;
			c.scale.set(1);
		}

		// Shiny glow pulse
		if (enemy.isShiny) {
			const pulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.005 + enemy.id * 0.5);
			meta.glow.alpha = pulse * 0.6;
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
