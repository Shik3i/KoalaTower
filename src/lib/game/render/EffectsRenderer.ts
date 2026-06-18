import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GAME_CONFIG } from '../engine/gameConfig';
import type { GameSettings, Particle, DamageNumber, DamageNumberKind, Shockwave, DeathEffect } from '../engine/gameTypes';

// ─── Instance-level particle pool ───────────────────────────────────────────

interface PooledParticle { g: Graphics; active: boolean; }
interface PooledText { t: Text; active: boolean; kind: DamageNumberKind; lastText?: string; }
interface PooledDeath {
	gfx: Graphics;
	inner: Graphics;
	active: boolean;
	shape: string;
	size: number;
	color: number;
	isBoss: boolean;
	isShiny: boolean;
}

/**
 * Per-kind text style. Pool entries are keyed by kind so the renderer can
 * vary font size, weight, colour, and ascent without the caller computing
 * them — keeps damage / crits / energy / alloy visually distinct.
 */
interface KindStyle { fontSize: number; fontWeight: 'bold' | 'normal'; strokeWidth: number; ascent: number; }
const KIND_STYLE: Record<DamageNumberKind, KindStyle> = {
	damage:   { fontSize: 14, fontWeight: 'bold',   strokeWidth: 2.5, ascent: 30 },
	crit:     { fontSize: 22, fontWeight: 'bold',   strokeWidth: 3.5, ascent: 42 },
	energy:   { fontSize: 16, fontWeight: 'bold',   strokeWidth: 2.5, ascent: 34 },
	alloy:    { fontSize: 18, fontWeight: 'bold',   strokeWidth: 3.0, ascent: 38 },
	strange:  { fontSize: 18, fontWeight: 'bold',   strokeWidth: 3.0, ascent: 38 },
	schematic:{ fontSize: 17, fontWeight: 'bold',   strokeWidth: 2.8, ascent: 36 },
	chain:    { fontSize: 16, fontWeight: 'bold',   strokeWidth: 3.0, ascent: 0   },
	error:    { fontSize: 14, fontWeight: 'bold',   strokeWidth: 2.5, ascent: 22 },
};

/** Resolve kind → style; falls back to plain damage for unknown / omitted kinds. */
export function resolveKindStyle(kind?: DamageNumberKind): KindStyle {
	return KIND_STYLE[kind ?? 'damage'] ?? KIND_STYLE.damage!;
}

export class EffectsRenderer {
	public particleContainer = new Container();
	public shockwaveContainer = new Container();
	public textContainer = new Container();
	public waveContainer = new Container();
	public deathContainer = new Container();

	private particlePool: PooledParticle[] = [];
	private particleFree: PooledParticle[] = [];
	private textPool: PooledText[] = [];
	private shockwavePool: Graphics[] = [];
	private deathPool: PooledDeath[] = [];

	// ... (wave objects unchanged)

	// Persistent wave announcement objects
	private waveBg = new Graphics();
	private waveBossBg = new Graphics();
	private waveBossLine1 = new Graphics();
	private waveBossLine2 = new Graphics();
	private waveBossLabel = new Text({ text: '⚡ BOSS INCOMING ⚡', style: { fontFamily: '"SF Mono","Fira Code",monospace', fontSize: 15, fontWeight: '600', fill: GAME_CONFIG.NEON_PINK } });
	private waveBossNum = new Text({ text: '', style: { fontFamily: '"SF Mono","Fira Code",monospace', fontSize: 64, fontWeight: 'bold', fill: '#FF44AA' } });
	private waveBossSub = new Text({ text: '', style: { fontFamily: '"SF Mono","Fira Code",monospace', fontSize: 13, fill: GAME_CONFIG.NEON_PINK } });
	private waveLabel = new Text({ text: 'WAVE', style: { fontFamily: '"SF Mono","Fira Code",monospace', fontSize: 14, fontWeight: '500', fill: 0xF0F4FF } });
	private waveNum = new Text({ text: '', style: { fontFamily: '"SF Mono","Fira Code",monospace', fontSize: 52, fontWeight: 'bold', fill: '#00FFFF' } });
	private waveSub = new Text({ text: '', style: { fontFamily: '"SF Mono","Fira Code",monospace', fontSize: 12, fill: 0xF0F4FF } });
	private waveAccentLine = new Graphics();
	private waveVisible = false;

	constructor() {
		// Set up wave announce objects (hidden by default)
		this.waveBg.visible = false;
		this.waveBossBg.visible = false; this.waveBossLine1.visible = false; this.waveBossLine2.visible = false;
		this.waveBossLabel.visible = false; this.waveBossNum.visible = false; this.waveBossSub.visible = false;
		this.waveLabel.visible = false; this.waveNum.visible = false; this.waveSub.visible = false;
		this.waveAccentLine.visible = false;

		this.waveContainer.addChild(this.waveBg);
		this.waveContainer.addChild(this.waveBossBg);
		this.waveContainer.addChild(this.waveBossLine1);
		this.waveContainer.addChild(this.waveBossLine2);
		this.waveContainer.addChild(this.waveBossLabel);
		this.waveBossNum.anchor.set(0.5); this.waveContainer.addChild(this.waveBossNum);
		this.waveBossSub.anchor.set(0.5); this.waveContainer.addChild(this.waveBossSub);
		this.waveLabel.anchor.set(0.5); this.waveContainer.addChild(this.waveLabel);
		this.waveNum.anchor.set(0.5); this.waveContainer.addChild(this.waveNum);
		this.waveSub.anchor.set(0.5); this.waveContainer.addChild(this.waveSub);
		this.waveContainer.addChild(this.waveAccentLine);

		// Blend modes for neon glow
		this.particleContainer.blendMode = 'add';
		this.shockwaveContainer.blendMode = 'add';
	}

	// ─── Shockwave rings (impact feedback) ───────────────────────────────────

	syncShockwaves(shockwaves: Shockwave[], settings: GameSettings): void {
		if (!settings.particles) {
			for (const g of this.shockwavePool) g.visible = false;
			return;
		}
		// Grow the pool as needed.
		while (this.shockwavePool.length < shockwaves.length) {
			const g = new Graphics();
			this.shockwaveContainer.addChild(g);
			this.shockwavePool.push(g);
		}
		for (let i = 0; i < this.shockwavePool.length; i++) {
			const g = this.shockwavePool[i]!;
			const sw = shockwaves[i];
			if (!sw) { g.visible = false; continue; }
			const fade = Math.max(0, sw.life / sw.maxLife);
			g.visible = true;
			g.clear();
			g.circle(sw.x, sw.y, Math.max(0.5, sw.radius)).stroke({ width: sw.width, color: sw.color, alpha: fade * 0.8 });
			// Faint inner echo
			g.circle(sw.x, sw.y, Math.max(0.5, sw.radius * 0.7)).stroke({ width: sw.width * 0.6, color: sw.color, alpha: fade * 0.3 });
		}
	}

	// ─── Particle helpers (instance methods) ─────────────────────────────────
	// Getters return the pool ENTRY (not the bare Graphics) so callers and the
	// per-frame cleanup never have to linear-scan the pool to release — keeps
	// sync O(n) as particle/text counts grow.

	private getParticle(): PooledParticle {
		const p = this.particleFree.pop();
		if (p) { p.active = true; p.g.alpha = 1; p.g.rotation = 0; return p; }
		const ng = new Graphics();
		this.particleContainer.addChild(ng);
		const entry: PooledParticle = { g: ng, active: true };
		this.particlePool.push(entry);
		return entry;
	}

	private releaseParticle(p: PooledParticle): void {
		if (!p.active) return;
		p.active = false; p.g.clear(); p.g.rotation = 0; this.particleFree.push(p);
	}

	// ─── Text helpers (instance methods) ─────────────────────────────────────
	// Pool entries are keyed by `kind` — each kind has a fixed font size,
	// weight, and stroke width (see KIND_STYLE). Color travels per-message
	// via tint so the cache stays small without flattening crit / energy /
	// alloy / etc. into the same visual.

	private getText(kind: DamageNumberKind, color: number): PooledText {
		const f = this.textPool.find(e => !e.active && e.kind === kind);
		if (f) {
			f.active = true;
			f.t.visible = true;
			f.t.alpha = 1;
			f.t.tint = color;
			return f;
		}
		const style = resolveKindStyle(kind);
		const ts = new TextStyle({
			fontFamily: '"SF Mono","Fira Code",monospace',
			fontSize: style.fontSize,
			fontWeight: style.fontWeight,
			fill: 0xFFFFFF,
			stroke: { color: 0x000000, width: style.strokeWidth },
		});
		const t = new Text({ text: '', style });
		t.anchor.set(0.5);
		t.tint = color;
		this.textContainer.addChild(t);
		const entry: PooledText = { t, active: true, kind };
		this.textPool.push(entry);
		return entry;
	}

	private releaseText(p: PooledText): void {
		if (!p.active) return;
		p.active = false; p.lastText = undefined; p.t.visible = false;
	}

	// ─── Sync methods ────────────────────────────────────────────────────────

	syncParticles(particles: Particle[], settings: GameSettings): void {
		if (!settings.particles) {
			for (const p of this.particlePool) if (p.active) this.releaseParticle(p);
			return;
		}
		const max = settings.lowEffectsMode ? 30 : GAME_CONFIG.MAX_PARTICLES;
		const count = Math.min(particles.length, max);
		const used = new Set<PooledParticle>();

		for (let i = 0; i < count; i++) {
			const p = particles[i]!;
			const entry = this.getParticle();
			used.add(entry);
			const g = entry.g;
			g.clear();
			g.x = p.x; g.y = p.y; g.alpha = p.alpha;

			const style = Math.floor(p.size * 100) % 3;
			if (style === 0) {
				g.circle(0, 0, p.size * (0.4 + p.alpha * 0.6)).fill({ color: p.color, alpha: 1 });
			} else if (style === 1) {
				const angle = Math.atan2(p.vy, p.vx);
				const len = p.size * 1.5 * p.alpha;
				g.rect(-len / 2, -p.size * 0.3, len, p.size * 0.6).fill({ color: p.color, alpha: 1 });
				g.rotation = angle;
			} else {
				const sz = p.size * 0.6 * p.alpha;
				g.moveTo(0, -sz).lineTo(sz * 0.5, 0).lineTo(0, sz).lineTo(-sz * 0.5, 0).closePath().fill({ color: p.color, alpha: 1 });
			}
			g.circle(0, 0, p.size * 0.25 * p.alpha).fill({ color: 0xFFFFFF, alpha: 0.5 });
		}

		for (const p of this.particlePool) { if (!used.has(p) && p.active) this.releaseParticle(p); }
	}

	syncDamageNumbers(nums: DamageNumber[], settings: GameSettings): void {
		if (!settings.damageNumbers) {
			for (const t of this.textPool) if (t.active) this.releaseText(t);
			return;
		}
		const max = settings.lowEffectsMode ? 15 : GAME_CONFIG.MAX_DAMAGE_NUMBERS;
		const count = Math.min(nums.length, max);
		const used = new Set<PooledText>();

		for (let i = 0; i < count; i++) {
			const n = nums[i]!;
			const kind: DamageNumberKind = n.kind ?? 'damage';
			const entry = this.getText(kind, n.color);
			used.add(entry);
			const t = entry.t;

			// Only update text when changed (avoids expensive re-rasterize)
			if (entry.lastText !== n.text) {
				t.text = n.text;
				entry.lastText = n.text;
			}
			t.x = n.x; t.y = n.y; t.alpha = n.alpha;
		}

		for (const tp of this.textPool) { if (!used.has(tp) && tp.active) this.releaseText(tp); }
	}

	// ─── Death-effect sync (render-only corpse proxies) ──────────────────────
	// Each proxy is a shrinking, spinning, fading shape that overlays the
	// frame of death so enemies don't pop out. Lives in its own container
	// above the enemy layer. Reuses a small pool keyed by shape+size so
	// hundreds of simultaneous deaths stay cheap.

	syncDeathEffects(deathEffects: DeathEffect[], settings: GameSettings, time: number): void {
		// Always release all active proxies first; cheap and avoids stale state.
		for (const d of this.deathPool) if (d.active) this.releaseDeath(d);
		if (!settings.particles) return;

		const reduced = settings.reducedMotion;
		const usedCount = Math.min(deathEffects.length, GAME_CONFIG.MAX_DEATH_FX);
		for (let i = 0; i < usedCount; i++) {
			const d = deathEffects[i]!;
			const pooled = this.getDeath(d);
			const gfx = pooled.gfx;
			const inner = pooled.inner;

			const t = Math.min(1, d.age / d.life);
			// Ease-out scale: snap-shrink at the end. Bosses implode a touch slower.
			const eased = reduced ? (1 - t) : (1 - t) * (1 - t);
			const scale = Math.max(0, eased);
			// Alpha falls off slightly after scale so the shape reads as "imploding".
			const alpha = Math.max(0, 1 - t * (reduced ? 1.2 : 0.9));

			gfx.x = d.x; gfx.y = d.y;
			gfx.rotation = d.rotation;
			gfx.scale.set(scale);
			gfx.alpha = alpha;
			inner.x = d.x; inner.y = d.y;
			inner.rotation = d.rotation;
			inner.scale.set(scale);
			inner.alpha = alpha * 0.6;
		}
		// Touch `time` so reduced-motion branches can still pulse without eslint warnings.
		void time;
	}

	private getDeath(d: DeathEffect): PooledDeath {
		const pooled = this.deathPool.find(e => !e.active);
		if (pooled) {
			pooled.active = true;
			pooled.shape = d.shape;
			pooled.size = d.size;
			pooled.color = d.color;
			pooled.isBoss = d.isBoss;
			pooled.isShiny = d.isShiny;
			this.drawDeath(pooled);
			pooled.gfx.visible = true;
			pooled.inner.visible = true;
			return pooled;
		}
		const gfx = new Graphics();
		const inner = new Graphics();
		this.deathContainer.addChild(gfx);
		this.deathContainer.addChild(inner);
		const entry: PooledDeath = {
			gfx, inner, active: true,
			shape: d.shape, size: d.size, color: d.color,
			isBoss: d.isBoss, isShiny: d.isShiny,
		};
		this.drawDeath(entry);
		this.deathPool.push(entry);
		return entry;
	}

	private releaseDeath(p: PooledDeath): void {
		if (!p.active) return;
		p.active = false;
		p.gfx.visible = false;
		p.inner.visible = false;
	}

	/** Redraw the death-shape onto a pooled entry. Same geometry vocabulary as EnemyRenderer. */
	private drawDeath(p: PooledDeath): void {
		const s = p.gfx;
		const inner = p.inner;
		s.clear();
		inner.clear();
		const hw = p.size / 2;
		const lw = p.isBoss ? 3 : 2;
		const fillAlpha = p.isBoss ? 0.18 : 0.12;

		switch (p.shape) {
			case 'square':
				s.rect(-hw, -hw, p.size, p.size).fill({ color: p.color, alpha: fillAlpha })
					.stroke({ width: lw, color: p.color, alpha: 0.95 });
				break;
			case 'diamond':
				s.moveTo(0, -hw).lineTo(hw, 0).lineTo(0, hw).lineTo(-hw, 0).closePath()
					.fill({ color: p.color, alpha: fillAlpha })
					.stroke({ width: lw, color: p.color, alpha: 0.95 });
				break;
			case 'hexagon':
				for (let i = 0; i < 6; i++) {
					const a = (Math.PI / 3) * i - Math.PI / 6;
					i === 0 ? s.moveTo(Math.cos(a) * hw, Math.sin(a) * hw) : s.lineTo(Math.cos(a) * hw, Math.sin(a) * hw);
				}
				s.closePath().fill({ color: p.color, alpha: fillAlpha }).stroke({ width: lw, color: p.color, alpha: 0.95 });
				break;
			case 'triangle':
				s.moveTo(hw, 0).lineTo(-hw, -hw).lineTo(-hw, hw).closePath()
					.fill({ color: p.color, alpha: fillAlpha })
					.stroke({ width: lw, color: p.color, alpha: 0.95 });
				break;
			case 'pentagon':
				for (let i = 0; i < 5; i++) {
					const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
					i === 0 ? s.moveTo(Math.cos(a) * hw, Math.sin(a) * hw) : s.lineTo(Math.cos(a) * hw, Math.sin(a) * hw);
				}
				s.closePath().fill({ color: p.color, alpha: fillAlpha }).stroke({ width: lw, color: p.color, alpha: 0.95 });
				break;
		}

		// Inner fracture lines — read as "shattering" as scale collapses.
		if (p.isBoss) {
			s.circle(0, 0, p.size * 1.6).stroke({ width: 2, color: p.color, alpha: 0.25 });
		}
		// Two cross cracks on the inner layer so spinning reads as breaking.
		inner.moveTo(-hw, -hw).lineTo(hw, hw).stroke({ width: 0.8, color: p.color, alpha: 0.5 });
		inner.moveTo(-hw, hw).lineTo(hw, -hw).stroke({ width: 0.8, color: p.color, alpha: 0.5 });
	}

	syncWaveAnnounce(currentWave: number, enemiesInWave: number, betweenWaveTimer: number, waveActive: boolean, vw: number, vh: number): void {
		if (waveActive || currentWave <= 0) {
			if (this.waveVisible) { this.hideAllWaveObjects(); this.waveVisible = false; }
			return;
		}

		const progress = Math.min(1, betweenWaveTimer / 3.0);
		const fadeIn = Math.min(1, progress * 2);
		const fadeOut = Math.max(0, Math.min(1, (1 - progress) * 4));
		const alpha = Math.min(fadeIn, fadeOut);

		if (alpha < 0.01) {
			if (this.waveVisible) { this.hideAllWaveObjects(); this.waveVisible = false; }
			return;
		}

		this.waveVisible = true;
		const w = vw, h = vh;
		// Place overlay in the upper third, well above the tower centre
		const cx = w / 2, cy = h * 0.28;
		const upcoming = currentWave + 1;
		const isBoss = upcoming % 10 === 0;
		const total = enemiesInWave || 0;

		this.waveContainer.alpha = alpha;

		// Dark translucent backdrop behind all wave announcements
		const bgW = Math.max(320, w * 0.65);
		const bgH = isBoss ? 210 : 150;
		this.waveBg.clear();
		this.waveBg.roundRect(cx - bgW / 2, cy - bgH / 2 - 10, bgW, bgH + 20, 12).fill({ color: 0x000000, alpha: 0.55 });
		this.waveBg.roundRect(cx - bgW / 2, cy - bgH / 2 - 10, bgW, bgH + 20, 12).stroke({ width: 1, color: isBoss ? GAME_CONFIG.NEON_PINK : GAME_CONFIG.NEON_CYAN, alpha: 0.12 });
		this.waveBg.visible = true;

		if (isBoss) {
			this.waveBossBg.clear(); this.waveBossBg.rect(0, cy - 110, w, 220).fill({ color: GAME_CONFIG.NEON_PINK, alpha: 0.06 });
			this.waveBossBg.visible = true;
			this.waveBossLine1.clear(); this.waveBossLine1.moveTo(w * 0.1, cy - 60).lineTo(w * 0.9, cy - 60).stroke({ width: 1, color: GAME_CONFIG.NEON_PINK, alpha: 0.25 });
			this.waveBossLine1.visible = true;
			this.waveBossLine2.clear(); this.waveBossLine2.moveTo(w * 0.1, cy + 54).lineTo(w * 0.9, cy + 54).stroke({ width: 1, color: GAME_CONFIG.NEON_PINK, alpha: 0.25 });
			this.waveBossLine2.visible = true;

			this.waveBossLabel.alpha = 0.7; this.waveBossLabel.x = cx; this.waveBossLabel.y = cy - 28; this.waveBossLabel.visible = true;
			this.waveBossNum.text = `${upcoming}`; this.waveBossNum.x = cx; this.waveBossNum.y = cy - 24; this.waveBossNum.visible = true;
			this.waveBossSub.text = `▶ ${total} enemies — Boss appears last`; this.waveBossSub.alpha = 0.55; this.waveBossSub.x = cx; this.waveBossSub.y = cy + 58; this.waveBossSub.visible = true;

			this.waveLabel.visible = false; this.waveNum.visible = false; this.waveSub.visible = false; this.waveAccentLine.visible = false;
		} else {
			this.waveLabel.alpha = 0.55; this.waveLabel.x = cx; this.waveLabel.y = cy - 22; this.waveLabel.visible = true;
			this.waveNum.text = `${upcoming}`; this.waveNum.x = cx; this.waveNum.y = cy - 20; this.waveNum.visible = true;
			this.waveSub.text = `▶ ${total} enemies`; this.waveSub.alpha = 0.4; this.waveSub.x = cx; this.waveSub.y = cy + 46; this.waveSub.visible = true;
			this.waveAccentLine.clear(); this.waveAccentLine.moveTo(w * 0.15, cy - 48).lineTo(w * 0.85, cy - 48).stroke({ width: 1, color: GAME_CONFIG.NEON_CYAN, alpha: 0.15 });
			this.waveAccentLine.visible = true;

			this.waveBossBg.visible = false; this.waveBossLine1.visible = false; this.waveBossLine2.visible = false;
			this.waveBossLabel.visible = false; this.waveBossNum.visible = false; this.waveBossSub.visible = false;
		}
	}

	private hideAllWaveObjects(): void {
		this.waveBg.visible = false;
		this.waveBossBg.visible = false; this.waveBossLine1.visible = false; this.waveBossLine2.visible = false;
		this.waveBossLabel.visible = false; this.waveBossNum.visible = false; this.waveBossSub.visible = false;
		this.waveLabel.visible = false; this.waveNum.visible = false; this.waveSub.visible = false;
		this.waveAccentLine.visible = false;
	}

	resetPools(): void {
		this.particleFree.length = 0;
		for (const p of this.particlePool) { p.active = false; p.g.clear(); p.g.rotation = 0; this.particleFree.push(p); }
		for (const t of this.textPool) { t.active = false; t.lastText = undefined; t.t.visible = false; }
		for (const d of this.deathPool) { d.active = false; d.gfx.visible = false; d.inner.visible = false; }
	}

	destroy(): void {
		this.particlePool.length = 0;
		this.particleFree.length = 0;
		this.textPool.length = 0;
		this.shockwavePool.length = 0;
		this.deathPool.length = 0;
		this.particleContainer.destroy({ children: true });
		this.shockwaveContainer.destroy({ children: true });
		this.textContainer.destroy({ children: true });
		this.waveContainer.destroy({ children: true });
		this.deathContainer.destroy({ children: true });
	}
}
