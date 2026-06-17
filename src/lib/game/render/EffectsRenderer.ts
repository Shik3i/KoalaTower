import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GAME_CONFIG } from '../engine/gameConfig';
import type { GameSettings, Particle, DamageNumber, Shockwave } from '../engine/gameTypes';

// ─── Instance-level particle pool ───────────────────────────────────────────

interface PooledParticle { g: Graphics; active: boolean; }
interface PooledText { t: Text; active: boolean; fontSize: number; color: number; lastText?: string; }

export class EffectsRenderer {
	public particleContainer = new Container();
	public shockwaveContainer = new Container();
	public textContainer = new Container();
	public waveContainer = new Container();

	private particlePool: PooledParticle[] = [];
	private particleFree: PooledParticle[] = [];
	private textPool: PooledText[] = [];
	private shockwavePool: Graphics[] = [];

	// ... (wave objects unchanged)

	// Persistent wave announcement objects
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
		this.waveBossBg.visible = false; this.waveBossLine1.visible = false; this.waveBossLine2.visible = false;
		this.waveBossLabel.visible = false; this.waveBossNum.visible = false; this.waveBossSub.visible = false;
		this.waveLabel.visible = false; this.waveNum.visible = false; this.waveSub.visible = false;
		this.waveAccentLine.visible = false;

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

	private getText(fontSize: number, color: number): PooledText {
		const f = this.textPool.find(e => !e.active && e.fontSize === fontSize && e.color === color);
		if (f) { f.active = true; f.t.visible = true; f.t.alpha = 1; return f; }
		const style = new TextStyle({ fontFamily: '"SF Mono","Fira Code",monospace', fontSize, fontWeight: 'bold', fill: color, stroke: { color: 0x000000, width: 2.5 } });
		const t = new Text({ text: '', style });
		t.anchor.set(0.5);
		this.textContainer.addChild(t);
		const entry: PooledText = { t, active: true, fontSize, color };
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
			const isCrit = n.color === GAME_CONFIG.NEON_YELLOW;
			const isCoin = n.color === GAME_CONFIG.NEON_GREEN;
			const fs = isCrit ? 22 : isCoin ? 14 : 15;
			const entry = this.getText(fs, n.color);
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
		const cx = w / 2, cy = h / 2;
		const upcoming = currentWave + 1;
		const isBoss = upcoming % 10 === 0;
		const total = enemiesInWave || 0;

		this.waveContainer.alpha = alpha;

		if (isBoss) {
			this.waveBossBg.clear(); this.waveBossBg.rect(0, cy - 110, w, 220).fill({ color: GAME_CONFIG.NEON_PINK, alpha: 0.08 });
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
		this.waveBossBg.visible = false; this.waveBossLine1.visible = false; this.waveBossLine2.visible = false;
		this.waveBossLabel.visible = false; this.waveBossNum.visible = false; this.waveBossSub.visible = false;
		this.waveLabel.visible = false; this.waveNum.visible = false; this.waveSub.visible = false;
		this.waveAccentLine.visible = false;
	}

	resetPools(): void {
		this.particleFree.length = 0;
		for (const p of this.particlePool) { p.active = false; p.g.clear(); p.g.rotation = 0; this.particleFree.push(p); }
		for (const t of this.textPool) { t.active = false; t.lastText = undefined; t.t.visible = false; }
	}

	destroy(): void {
		this.particlePool.length = 0;
		this.particleFree.length = 0;
		this.textPool.length = 0;
		this.shockwavePool.length = 0;
		this.particleContainer.destroy({ children: true });
		this.shockwaveContainer.destroy({ children: true });
		this.textContainer.destroy({ children: true });
		this.waveContainer.destroy({ children: true });
	}
}
