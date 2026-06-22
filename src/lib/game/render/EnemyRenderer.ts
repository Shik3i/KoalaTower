import { Container, Graphics } from 'pixi.js';
import type { Enemy } from '../engine/gameTypes';
import { enemyDisplayColor, type ColorblindMode } from '../balance/balanceMath';

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
	/** Last damage tier drawn so we only re-render cracks when the tier changes. */
	dmgTier: number;
	/** Colour-blind mode the shape was last drawn for; redraw when it changes. */
	cb: ColorblindMode;
}

const _meta = new WeakMap<Container, EnemyMeta>();

/**
 * Map an enemy's HP ratio to a 0/1/2 damage tier (healthy / damaged / critical).
 * Used by both the renderer and tests so the thresholds stay in one place.
 * Below 50% = damaged, below 25% = critical. Bosses always read as healthy
 * (they already have a dedicated health bar and rotate too fast for cracks).
 */
export function getEnemyDamageTier(hp: number, maxHp: number, isBoss: boolean = false): number {
	if (isBoss) return 0;
	if (!Number.isFinite(hp) || !Number.isFinite(maxHp) || maxHp <= 0) return 0;
	const r = hp / maxHp;
	if (r <= 0.25) return 2;
	if (r <= 0.5) return 1;
	return 0;
}

export class EnemyRenderer {
	public container = new Container();
	private gfxMap = new Map<number, Container>();
	private free: Container[] = [];
	private activeIds = new Set<number>();

	sync(enemies: Enemy[], time: number, reduced: boolean = false, colorblind: ColorblindMode = 'off'): void {
		const activeIds = this.activeIds;
		activeIds.clear();

		for (const enemy of enemies) {
			if (!enemy.alive) continue;
			activeIds.add(enemy.id);

			let c = this.gfxMap.get(enemy.id);
			if (!c) {
				c = this.acquire(enemy, time, colorblind);
				this.gfxMap.set(enemy.id, c);
			}
			this.updateVisuals(c, enemy, time, reduced, colorblind);

			c.x = enemy.position.x;
			c.y = enemy.position.y;
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

	private acquire(enemy: Enemy, time: number, colorblind: ColorblindMode): Container {
		const pooled = this.free.pop();
		if (pooled) {
			const meta = _meta.get(pooled);
			if (meta) {
				const dir = (enemy.id % 2 === 0) ? 1 : -1;
				meta.type = enemy.type;
				meta.size = enemy.size;
				meta.boss = enemy.isBoss;
				meta.shiny = enemy.isShiny;
				meta.spawnTime = time;
				meta.spin = enemy.isBoss ? 0.25 * dir : (0.4 + (enemy.id % 5) * 0.12) * dir;
				meta.spinPhase = (enemy.id % 7) * 0.9;
				meta.dmgTier = -1; // force redraw on next updateVisuals
				meta.cb = colorblind;
				this.draw(enemy, meta.shape, meta.inner, meta.glow, 0, colorblind);
				pooled.visible = true;
				return pooled;
			}
		}

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
			spawnTime: time, spin, spinPhase: (enemy.id % 7) * 0.9, dmgTier: -1, cb: colorblind,
		});
		this.draw(enemy, shape, inner, glow, 0, colorblind);
		this.container.addChild(c);
		return c;
	}

	private updateVisuals(c: Container, enemy: Enemy, time: number, reduced: boolean, colorblind: ColorblindMode): void {
		const meta = _meta.get(c);
		if (!meta) return;

		if (meta.type !== enemy.type || meta.size !== enemy.size || meta.boss !== enemy.isBoss || meta.shiny !== enemy.isShiny || meta.cb !== colorblind) {
			meta.cb = colorblind;
			this.draw(enemy, meta.shape, meta.inner, meta.glow, 0, colorblind);
			meta.type = enemy.type;
			meta.size = enemy.size;
			meta.boss = enemy.isBoss;
			meta.shiny = enemy.isShiny;
			meta.dmgTier = -1;
		}

		// Redraw the inner layer only when the damage tier changes — avoids
		// per-frame redraws while still showing progressive damage cracks.
		const tier = getEnemyDamageTier(enemy.hp, enemy.maxHp, enemy.isBoss);
		if (tier !== meta.dmgTier) {
			this.drawDamageCracks(enemy, meta.inner, tier, colorblind);
			meta.dmgTier = tier;
		}

		const flash = enemy.hitFlashTimer > 0;
		meta.shape.alpha = flash ? 1 : (0.9 - tier * 0.12); // damaged enemies fade slightly

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

		// Hit flash — briefly brighten; otherwise tint darkens with damage tier
		// so damaged / critical enemies read at a glance without HP bars.
		if (flash) {
			meta.shape.tint = 0xDDDDFF;
			meta.glow.tint = 0xDDDDFF;
		} else if (tier === 2) {
			// Critical: desaturate toward a wounded pink-grey.
			meta.shape.tint = 0xBB99AA;
			meta.glow.tint = 0xFFFFFF;
		} else if (tier === 1) {
			// Damaged: slight wash-out.
			meta.shape.tint = 0xCCBBCC;
			meta.glow.tint = 0xFFFFFF;
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

	private draw(enemy: Enemy, s: Graphics, inner: Graphics, glow: Graphics, tier: number = 0, colorblind: ColorblindMode = 'off'): void {
		const hw = enemy.size / 2;
		// Shiny keeps its gold override; otherwise honour the colour-blind palette.
		const color = enemy.isShiny ? enemy.color : enemyDisplayColor(enemy.type, colorblind);
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

		// Apply initial damage cracks if spawned already-wounded (rare but possible).
		if (tier > 0 && !enemy.isBoss) {
			this.drawDamageCracks(enemy, inner, tier);
		}
	}

	/**
	 * Render fracture lines on the inner layer to indicate accumulated damage.
	 * Tier 1 (≤50% HP): one diagonal hairline. Tier 2 (≤25% HP): two diagonals
	 * plus a center notch. Tier 0 clears the inner layer back to its idle stroke.
	 * Called only when the tier changes — never per-frame.
	 */
	private drawDamageCracks(enemy: Enemy, inner: Graphics, tier: number, colorblind: ColorblindMode = 'off'): void {
		inner.clear();
		// Redraw the idle inner stroke first so cracks layer on top of the
		// shape's identity outline.
		const color = enemy.isShiny ? enemy.color : enemyDisplayColor(enemy.type, colorblind);
		const hw = enemy.size / 2;
		switch (enemy.shape) {
			case 'square':
				inner.rect(-enemy.size / 3, -enemy.size / 3, enemy.size * 2 / 3, enemy.size * 2 / 3)
					.stroke({ width: 0.8, color, alpha: 0.4 });
				break;
			case 'diamond':
				inner.moveTo(0, -enemy.size / 3).lineTo(enemy.size / 3, 0).lineTo(0, enemy.size / 3).lineTo(-enemy.size / 3, 0).closePath()
					.stroke({ width: 0.8, color, alpha: 0.4 });
				break;
			case 'hexagon':
				for (let i = 0; i < 6; i++) {
					const a = (Math.PI / 3) * i - Math.PI / 6;
					i === 0 ? inner.moveTo(Math.cos(a) * enemy.size / 3.5, Math.sin(a) * enemy.size / 3.5)
						: inner.lineTo(Math.cos(a) * enemy.size / 3.5, Math.sin(a) * enemy.size / 3.5);
				}
				inner.closePath().stroke({ width: 0.8, color, alpha: 0.4 });
				break;
			case 'pentagon':
				for (let i = 0; i < 5; i++) {
					const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
					i === 0 ? inner.moveTo(Math.cos(a) * enemy.size / 3.5, Math.sin(a) * enemy.size / 3.5)
						: inner.lineTo(Math.cos(a) * enemy.size / 3.5, Math.sin(a) * enemy.size / 3.5);
				}
				inner.closePath().stroke({ width: 0.8, color, alpha: 0.4 });
				break;
			case 'triangle':
				// No idle inner stroke for triangle — leave clean.
				break;
		}

		if (tier <= 0 || enemy.isBoss) return;
		// Cracks: thin white-ish lines that read as fractures on any fill colour.
		const crackColor = tier >= 2 ? 0xFFEEFF : 0xDDDDFF;
		const crackAlpha = tier >= 2 ? 0.75 : 0.5;
		const crackWidth = tier >= 2 ? 1.0 : 0.7;
		// Diagonal 1
		inner.moveTo(-hw * 0.6, -hw * 0.6).lineTo(hw * 0.4, hw * 0.5)
			.stroke({ width: crackWidth, color: crackColor, alpha: crackAlpha });
		if (tier >= 2) {
			// Diagonal 2 + a small center notch for "about to die" feel.
			inner.moveTo(-hw * 0.5, hw * 0.6).lineTo(hw * 0.6, -hw * 0.4)
				.stroke({ width: crackWidth, color: crackColor, alpha: crackAlpha });
			inner.moveTo(0, -hw * 0.2).lineTo(0, hw * 0.2)
				.stroke({ width: crackWidth * 0.8, color: crackColor, alpha: crackAlpha * 0.8 });
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
