import { GAME_CONFIG } from '../engine/gameConfig';
import type { Enemy, Particle, DamageNumber } from '../engine/gameTypes';

// Shared time reference, set by PixiGameView each frame
let frameTime = 0;
export function setFrameTime(t: number) { frameTime = t; }

/** Hex color number → CSS rgba string */
function hexToRgba(hex: number, alpha: number = 1): string {
	const r = (hex >> 16) & 0xFF;
	const g = (hex >> 8) & 0xFF;
	const b = hex & 0xFF;
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Helper: rounded rect polyfill */
function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
	if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.lineTo(x + w - r, y);
	ctx.arcTo(x + w, y, x + w, y + r, r);
	ctx.lineTo(x + w, y + h - r);
	ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
	ctx.lineTo(x + r, y + h);
	ctx.arcTo(x, y + h, x, y + h - r, r);
	ctx.lineTo(x, y + r);
	ctx.arcTo(x, y, x + r, y, r);
	ctx.closePath();
}

// ─── BACKGROUND ────────────────────────────────────────────────────────────

export function drawBackground(
	ctx: CanvasRenderingContext2D,
	w: number,
	h: number,
	stars: { x: number; y: number; size: number; alpha: number }[],
	time: number
): void {
	// Deep space fill
	ctx.fillStyle = '#070812';
	ctx.fillRect(0, 0, w, h);

	const gs = GAME_CONFIG.BACKGROUND_GRID_SIZE;
	const gridPulse = Math.sin(time * 0.3) * 0.3 + 0.7;

	// Animated grid — subtle cyan lines that pulse
	ctx.strokeStyle = `rgba(0, 255, 255, ${0.025 * gridPulse})`;
	ctx.lineWidth = 1;
	for (let x = 0; x < w; x += gs) {
		ctx.beginPath();
		ctx.moveTo(x, 0);
		ctx.lineTo(x, h);
		ctx.stroke();
	}
	for (let y = 0; y < h; y += gs) {
		ctx.beginPath();
		ctx.moveTo(0, y);
		ctx.lineTo(w, y);
		ctx.stroke();
	}

	// Diagonal grid accent every 3rd line
	if (gs > 0) {
		ctx.strokeStyle = `rgba(68, 136, 255, ${0.015 * gridPulse})`;
		for (let x = 0; x < w; x += gs * 3) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, h);
			ctx.stroke();
		}
	}

	// Center atmospheric glow
	const cx = w / 2;
	const cy = h / 2;
	const atmosPulse = Math.sin(time * 1.5) * 0.3 + 0.7;
	const gridGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.55);
	gridGlow.addColorStop(0, `rgba(0, 255, 255, ${0.05 * atmosPulse})`);
	gridGlow.addColorStop(0.3, `rgba(68, 136, 255, ${0.03 * atmosPulse})`);
	gridGlow.addColorStop(0.6, `rgba(136, 68, 255, ${0.015 * atmosPulse})`);
	gridGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
	ctx.fillStyle = gridGlow;
	ctx.fillRect(0, 0, w, h);

	// Stars with twinkle
	for (const star of stars) {
		const twinkle = Math.sin(time * 2 + star.x * 0.07 + star.y * 0.09) * 0.5 + 0.5;
		const a = star.alpha * (0.3 + twinkle * 0.7);
		ctx.fillStyle = `rgba(180, 200, 255, ${a})`;
		ctx.beginPath();
		ctx.arc(star.x, star.y, star.size * (0.8 + twinkle * 0.4), 0, Math.PI * 2);
		ctx.fill();

		// Bright stars get cross glow
		if (star.size > 1.4 && a > 0.45) {
			ctx.fillStyle = `rgba(180, 200, 255, ${a * 0.12})`;
			ctx.beginPath();
			ctx.arc(star.x, star.y, star.size * 3.5, 0, Math.PI * 2);
			ctx.fill();

			// Cross rays
			ctx.strokeStyle = `rgba(180, 200, 255, ${a * 0.1})`;
			ctx.lineWidth = 0.5;
			const cr = star.size * 2;
			ctx.beginPath();
			ctx.moveTo(star.x - cr, star.y);
			ctx.lineTo(star.x + cr, star.y);
			ctx.moveTo(star.x, star.y - cr);
			ctx.lineTo(star.x, star.y + cr);
			ctx.stroke();
		}
	}

	// Vignette overlay (dark edges)
	const vignette = ctx.createRadialGradient(cx, cy, w * 0.3, cx, cy, w * 0.75);
	vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
	vignette.addColorStop(0.5, 'rgba(7, 8, 18, 0.1)');
	vignette.addColorStop(1, 'rgba(7, 8, 18, 0.55)');
	ctx.fillStyle = vignette;
	ctx.fillRect(0, 0, w, h);
}

// ─── TOWER ─────────────────────────────────────────────────────────────────

export function drawTower(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	hp: number,
	maxHp: number,
	muzzleFlash: number,
): void {
	const t = frameTime;
	const pulse = Math.sin(t * 1.3) * 0.15 + 0.85;
	const glowPulse = Math.sin(t * 0.75) * 0.25 + 0.75;
	const hpPct = Math.max(0, hp / maxHp);
	const hpDanger = hpPct < 0.3;
	const dangerPulse = Math.sin(t * 4.5) * 0.3 + 0.7;

	function octPath(cx: number, cy: number, r: number) {
		ctx.beginPath();
		for (let i = 0; i < 8; i++) {
			const a = (Math.PI / 4) * i - Math.PI / 8;
			const px = cx + Math.cos(a) * r;
			const py = cy + Math.sin(a) * r;
			i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
		}
		ctx.closePath();
	}

	// ── Muzzle flash ring (expanding) ──
	if (muzzleFlash > 0) {
		const mfAlpha = muzzleFlash;
		const mfRadius = size * 0.8 + (1 - mfAlpha) * size * 2.5;
		ctx.save();
		ctx.globalAlpha = mfAlpha * 0.5;
		ctx.strokeStyle = `rgba(255, 255, 255, ${mfAlpha * 0.6})`;
		ctx.lineWidth = 4 * mfAlpha;
		ctx.shadowColor = `rgba(0, 255, 255, ${mfAlpha})`;
		ctx.shadowBlur = 20 * mfAlpha;
		ctx.beginPath();
		ctx.arc(x, y, mfRadius, 0, Math.PI * 2);
		ctx.stroke();
		ctx.shadowBlur = 0;
		ctx.restore();
	}

	// ── Outer atmospheric glow ──
	const glowColor = hpDanger ? '255, 68, 68' : '0, 255, 255';
	const glowAlpha = hpDanger ? 0.14 : 0.07;
	const pulsingGlow = hpDanger ? dangerPulse : glowPulse;
	const atmos = ctx.createRadialGradient(x, y, 0, x, y, size * 4.5);
	atmos.addColorStop(0, `rgba(${glowColor}, ${glowAlpha * pulsingGlow})`);
	atmos.addColorStop(0.25, `rgba(68, 136, 255, ${0.05 * pulsingGlow})`);
	atmos.addColorStop(0.55, `rgba(136, 68, 255, ${0.025 * pulsingGlow})`);
	atmos.addColorStop(1, 'rgba(0, 0, 0, 0)');
	ctx.fillStyle = atmos;
	ctx.beginPath();
	ctx.arc(x, y, size * 4.5, 0, Math.PI * 2);
	ctx.fill();

	// ── Outer glow octagons ──
	ctx.save();
	const outerGlowColor = hpDanger ? 'rgba(255, 68, 68, 0.7)' : 'rgba(0, 255, 255, 0.65)';
	ctx.shadowColor = outerGlowColor;
	ctx.shadowBlur = 35 * pulse;
	ctx.strokeStyle = hpDanger
		? `rgba(255, 68, 68, ${0.22 * dangerPulse})`
		: `rgba(0, 255, 255, ${0.16 * pulse})`;
	ctx.lineWidth = 1.5;
	octPath(x, y, size * 1.4);
	ctx.stroke();
	ctx.shadowBlur = 0;
	ctx.restore();

	// Second outer ring
	ctx.strokeStyle = hpDanger
		? `rgba(255, 136, 68, ${0.11 * dangerPulse})`
		: `rgba(68, 136, 255, ${0.09 * pulse})`;
	ctx.lineWidth = 1;
	octPath(x, y, size * 1.7);
	ctx.stroke();

	// ── Tower body: octagon with gradient ──
	const bodyGrad = ctx.createRadialGradient(x - size * 0.2, y - size * 0.25, 0, x, y, size);
	bodyGrad.addColorStop(0, '#77BBFF');
	bodyGrad.addColorStop(0.25, '#4499FF');
	bodyGrad.addColorStop(0.55, '#2266DD');
	bodyGrad.addColorStop(0.8, '#112266');
	bodyGrad.addColorStop(1, '#070812');
	ctx.fillStyle = bodyGrad;
	octPath(x, y, size);
	ctx.fill();

	// ── Neon border with glow ──
	ctx.save();
	const borderColor = hpDanger ? 'rgba(255, 68, 68, 0.9)' : 'rgba(0, 255, 255, 0.85)';
	ctx.shadowColor = borderColor;
	ctx.shadowBlur = hpDanger ? 28 * dangerPulse : 20 * pulse;
	ctx.strokeStyle = hpDanger
		? `rgba(255, 68, 68, ${0.88 * dangerPulse})`
		: `rgba(0, 255, 255, ${0.78 * pulse})`;
	ctx.lineWidth = hpDanger ? 2.5 : 2;
	octPath(x, y, size);
	ctx.stroke();
	ctx.shadowBlur = 0;
	ctx.restore();

	// ── Inner octagon rings ──
	ctx.strokeStyle = hpDanger
		? `rgba(255, 136, 68, ${0.2 * dangerPulse})`
		: `rgba(0, 255, 255, ${0.14 * pulse})`;
	ctx.lineWidth = 1;
	octPath(x, y, size * 0.58);
	ctx.stroke();
	ctx.strokeStyle = hpDanger
		? `rgba(255, 68, 68, ${0.12 * dangerPulse})`
		: `rgba(68, 136, 255, ${0.1 * pulse})`;
	octPath(x, y, size * 0.33);
	ctx.stroke();

	// ── Center core (hexagonal pulse) ──
	const coreColor = hpDanger ? `rgba(255, 68, 68, ${0.7 * dangerPulse})` : `rgba(0, 255, 255, ${0.55 * pulse})`;
	const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, size * 0.25);
	coreGrad.addColorStop(0, coreColor);
	coreGrad.addColorStop(0.5, `rgba(0, 255, 255, ${0.2 * pulse})`);
	coreGrad.addColorStop(1, 'rgba(0, 255, 255, 0)');
	ctx.fillStyle = coreGrad;
	ctx.beginPath();
	for (let i = 0; i < 6; i++) {
		const a = (Math.PI / 3) * i - Math.PI / 6;
		const px = x + Math.cos(a) * size * 0.22;
		const py = y + Math.sin(a) * size * 0.22;
		i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
	}
	ctx.closePath();
	ctx.fill();

	// Bright center dot
	ctx.fillStyle = hpDanger
		? `rgba(255, 100, 100, ${0.9 * dangerPulse})`
		: `rgba(255, 255, 255, ${0.7 * pulse})`;
	ctx.beginPath();
	ctx.arc(x, y, size * 0.08, 0, Math.PI * 2);
	ctx.fill();

	// ── Rotating energy arcs ──
	const rot = t * 0.55;
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(rot);
	const arcColor = hpDanger
		? `rgba(255, 136, 68, ${0.18 * dangerPulse})`
		: `rgba(0, 255, 255, ${0.13 * pulse})`;
	ctx.strokeStyle = arcColor;
	ctx.lineWidth = 1.5;
	// Four arcs
	for (let i = 0; i < 4; i++) {
		const baseAngle = (Math.PI / 2) * i;
		const startR = size * 0.4;
		const endR = size * 0.9;
		const arcSpan = Math.PI * 0.35;
		ctx.beginPath();
		ctx.arc(0, 0, startR, baseAngle, baseAngle + arcSpan);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(0, 0, endR, baseAngle + Math.PI, baseAngle + Math.PI + arcSpan);
		ctx.stroke();
	}
	// Counter-rotating thin arcs
	ctx.rotate(-rot * 2.5);
	ctx.strokeStyle = hpDanger
		? `rgba(255, 100, 100, ${0.08 * dangerPulse})`
		: `rgba(68, 136, 255, ${0.06 * pulse})`;
	ctx.lineWidth = 0.8;
	for (let i = 0; i < 3; i++) {
		const a = (Math.PI * 2 / 3) * i + t * 0.3;
		ctx.beginPath();
		ctx.arc(0, 0, size * 0.65, a, a + Math.PI * 0.4);
		ctx.stroke();
	}
	ctx.restore();

	// ── Spinning crosshair segments ──
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(rot * 1.1);
	const crossColor = hpDanger
		? `rgba(255, 136, 68, ${0.18 * dangerPulse})`
		: `rgba(0, 255, 255, ${0.12 * pulse})`;
	ctx.strokeStyle = crossColor;
	ctx.lineWidth = 1;
	for (let i = 0; i < 4; i++) {
		const a = (Math.PI / 2) * i;
		ctx.beginPath();
		ctx.moveTo(Math.cos(a) * size * 0.35, Math.sin(a) * size * 0.35);
		ctx.lineTo(Math.cos(a) * size * 0.85, Math.sin(a) * size * 0.85);
		ctx.stroke();
	}
	ctx.restore();
}

// ─── ENEMY ─────────────────────────────────────────────────────────────────

export function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy): void {
	const { x, y } = enemy.position;
	const s = enemy.size;
	const flash = enemy.hitFlashTimer > 0;
	const t = frameTime;

	ctx.save();
	ctx.translate(x, y);
	if (enemy.shape !== 'triangle') {
		ctx.rotate(enemy.angle);
	}

	// ── Boss: aura ring (subtle outline pulse) ──
	if (enemy.isBoss) {
		const bp = Math.sin(t / 500) * 0.3 + 0.7;

		// Outer pulsing aura ring
		ctx.strokeStyle = hexToRgba(enemy.color, 0.18 * bp);
		ctx.lineWidth = 2;
		ctx.setLineDash([6, 10]);
		ctx.beginPath();
		ctx.arc(0, 0, s * 2.2, 0, Math.PI * 2);
		ctx.stroke();
		ctx.setLineDash([]);

		// Inner aura ring
		ctx.strokeStyle = hexToRgba(enemy.color, 0.25 * bp);
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.arc(0, 0, s * 0.85, 0, Math.PI * 2);
		ctx.stroke();
	}

	// ── Outline color with flash effect ──
	const outlineAlpha = flash ? 1 : 0.9;
	const outlineColor = flash ? '#FFFFFF' : hexToRgba(enemy.color, outlineAlpha);
	const lineW = enemy.isBoss ? 3 : 2;

	// ── Outer glow shadow ──
	ctx.save();
	ctx.shadowColor = flash ? 'rgba(255,255,255,0.9)' : hexToRgba(enemy.color, 0.7);
	ctx.shadowBlur = flash ? 18 : (enemy.isBoss ? 14 : 8);

	ctx.strokeStyle = outlineColor;
	ctx.lineWidth = lineW;

	ctx.beginPath();
	switch (enemy.shape) {
		case 'square': {
			const r = s / 2;
			rrect(ctx, -r, -r, s, s, 2);
			break;
		}
		case 'triangle':
			ctx.moveTo(s / 2, 0);
			ctx.lineTo(-s / 2, -s / 2);
			ctx.lineTo(-s / 2, s / 2);
			ctx.closePath();
			break;
		case 'hexagon':
			for (let i = 0; i < 6; i++) {
				const a = (Math.PI / 3) * i - Math.PI / 6;
				const px = Math.cos(a) * s / 2;
				const py = Math.sin(a) * s / 2;
				i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
			}
			ctx.closePath();
			break;
		case 'diamond':
			ctx.moveTo(0, -s / 2);
			ctx.lineTo(s / 2, 0);
			ctx.lineTo(0, s / 2);
			ctx.lineTo(-s / 2, 0);
			ctx.closePath();
			break;
		case 'pentagon':
			for (let i = 0; i < 5; i++) {
				const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
				const px = Math.cos(a) * s / 2;
				const py = Math.sin(a) * s / 2;
				i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
			}
			ctx.closePath();
			break;
	}
	ctx.stroke();
	ctx.shadowBlur = 0;
	ctx.restore();

	// ── Second inner outline (subtle) ──
	ctx.strokeStyle = flash ? 'rgba(255,255,255,0.3)' : hexToRgba(enemy.color, 0.25);
	ctx.lineWidth = 0.8;
	switch (enemy.shape) {
		case 'square':
			ctx.strokeRect(-s / 3, -s / 3, s * 2 / 3, s * 2 / 3);
			break;
		case 'hexagon': {
			ctx.beginPath();
			for (let i = 0; i < 6; i++) {
				const a = (Math.PI / 3) * i - Math.PI / 6;
				const px = Math.cos(a) * s / 3.5;
				const py = Math.sin(a) * s / 3.5;
				i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
			}
			ctx.closePath();
			ctx.stroke();
			break;
		}
		case 'diamond':
			ctx.beginPath();
			ctx.moveTo(0, -s / 3);
			ctx.lineTo(s / 3, 0);
			ctx.lineTo(0, s / 3);
			ctx.lineTo(-s / 3, 0);
			ctx.closePath();
			ctx.stroke();
			break;
		case 'pentagon': {
			ctx.beginPath();
			for (let i = 0; i < 5; i++) {
				const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
				const px = Math.cos(a) * s / 3.5;
				const py = Math.sin(a) * s / 3.5;
				i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
			}
			ctx.closePath();
			ctx.stroke();
			break;
		}
	}

	ctx.restore();
}

// ─── PROJECTILE ─────────────────────────────────────────────────────────────

export function drawProjectile(
	ctx: CanvasRenderingContext2D,
	position: { x: number; y: number },
	trail: { x: number; y: number }[],
	color: number,
	isCrit: boolean
): void {
	const c = hexToRgba(color);
	const size = isCrit ? 4 : 2;

	// ── Trail gradient (fading behind) ──
	if (trail.length > 1) {
		for (let i = trail.length - 1; i >= 1; i--) {
			const t = i / trail.length;
			const alpha = t * (isCrit ? 0.55 : 0.4);
			const tSize = size * (0.15 + t * 0.6);
			const grad = ctx.createRadialGradient(trail[i]!.x, trail[i]!.y, 0, trail[i]!.x, trail[i]!.y, tSize);
			grad.addColorStop(0, hexToRgba(color, alpha));
			grad.addColorStop(1, 'rgba(0,0,0,0)');
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.arc(trail[i]!.x, trail[i]!.y, tSize, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	// ── Outer glow halo ──
	ctx.save();
	ctx.shadowColor = c;
	ctx.shadowBlur = isCrit ? 30 : 14;
	const outerGlow = ctx.createRadialGradient(position.x, position.y, 0, position.x, position.y, size * 2);
	outerGlow.addColorStop(0, c);
	outerGlow.addColorStop(0.4, hexToRgba(color, 0.4));
	outerGlow.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = outerGlow;
	ctx.beginPath();
	ctx.arc(position.x, position.y, size * 2, 0, Math.PI * 2);
	ctx.fill();

	// ── Main body (elongated diamond shape for direction feel) ──
	if (trail.length >= 2) {
		const prev = trail[trail.length - 2]!;
		const angle = Math.atan2(position.y - prev.y, position.x - prev.x);
		ctx.save();
		ctx.translate(position.x, position.y);
		ctx.rotate(angle);
		// Diamond/arrow shape
		ctx.fillStyle = '#FFFFFF';
		ctx.shadowColor = c;
		ctx.shadowBlur = 10;
		ctx.beginPath();
		ctx.moveTo(size * 1.6, 0);
		ctx.lineTo(0, -size * 0.6);
		ctx.lineTo(-size * 0.4, 0);
		ctx.lineTo(0, size * 0.6);
		ctx.closePath();
		ctx.fill();
		ctx.shadowBlur = 0;
		ctx.restore();
	} else {
		// Fallback: circle
		ctx.fillStyle = c;
		ctx.beginPath();
		ctx.arc(position.x, position.y, size, 0, Math.PI * 2);
		ctx.fill();
		// Bright center
		ctx.fillStyle = '#FFFFFF';
		ctx.beginPath();
		ctx.arc(position.x, position.y, size * 0.35, 0, Math.PI * 2);
		ctx.fill();
	}

	ctx.shadowBlur = 0;
	ctx.restore();

	// ── Crit: extra pulsing ring ──
	if (isCrit) {
		const pulse = Math.sin(frameTime * 12) * 0.2 + 0.8;
		ctx.strokeStyle = hexToRgba(color, 0.35 * pulse);
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(position.x, position.y, size * 3, 0, Math.PI * 2);
		ctx.stroke();

		// Spark particles around crit projectile
		for (let i = 0; i < 3; i++) {
			const a = frameTime * 20 + i * (Math.PI * 2 / 3);
			const r = size * 2.5;
			const sx = position.x + Math.cos(a) * r;
			const sy = position.y + Math.sin(a) * r;
			ctx.fillStyle = hexToRgba(color, 0.3 * pulse);
			ctx.beginPath();
			ctx.arc(sx, sy, size * 0.5, 0, Math.PI * 2);
			ctx.fill();
		}
	}
}

// ─── PARTICLE WITH SPARK VARIETY ────────────────────────────────────────────

export function drawParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
	ctx.save();
	ctx.globalAlpha = p.alpha;

	const colorStr = hexToRgba(p.color, p.alpha);
	ctx.fillStyle = colorStr;
	ctx.shadowColor = hexToRgba(p.color, p.alpha * 0.7);
	ctx.shadowBlur = 6;

	// Random style per particle based on its size for variety
	const style = Math.floor(p.size * 100) % 3;

	if (style === 0) {
		// Circle (default)
		ctx.beginPath();
		ctx.arc(p.x, p.y, p.size * (0.4 + p.alpha * 0.6), 0, Math.PI * 2);
		ctx.fill();
	} else if (style === 1) {
		// Spark line (elongated in velocity direction)
		const angle = Math.atan2(p.vy, p.vx);
		const len = p.size * 1.5 * p.alpha;
		ctx.save();
		ctx.translate(p.x, p.y);
		ctx.rotate(angle);
		ctx.fillRect(-len / 2, -p.size * 0.3, len, p.size * 0.6);
		ctx.restore();
	} else {
		// Diamond spark
		const s = p.size * 0.6 * p.alpha;
		ctx.beginPath();
		ctx.moveTo(p.x, p.y - s);
		ctx.lineTo(p.x + s * 0.5, p.y);
		ctx.lineTo(p.x, p.y + s);
		ctx.lineTo(p.x - s * 0.5, p.y);
		ctx.closePath();
		ctx.fill();
	}

	// Bright center
	ctx.globalAlpha = p.alpha * 0.5;
	ctx.fillStyle = '#FFFFFF';
	ctx.beginPath();
	ctx.arc(p.x, p.y, p.size * 0.25 * p.alpha, 0, Math.PI * 2);
	ctx.fill();

	ctx.restore();
}

// ─── DAMAGE NUMBER ──────────────────────────────────────────────────────────

export function drawDamageNumber(ctx: CanvasRenderingContext2D, n: DamageNumber): void {
	ctx.save();
	ctx.globalAlpha = n.alpha;
	const isCritText = n.color === GAME_CONFIG.NEON_YELLOW;
	const isCoinText = n.color === GAME_CONFIG.NEON_GREEN;

	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';

	// Scale in + float up (handled by y movement in engine)
	const scale = 0.6 + n.alpha * 0.4;
	const bounce = Math.sin(frameTime * 15 + n.x * 0.1) * (1 - n.alpha) * 4;

	// Glow shadow
	ctx.shadowColor = hexToRgba(n.color, 0.8);
	ctx.shadowBlur = isCritText ? 18 : isCoinText ? 12 : 10;

	if (isCritText) {
		ctx.font = 'bold 22px "SF Mono", "Fira Code", monospace';
	} else if (isCoinText) {
		ctx.font = 'bold 14px "SF Mono", "Fira Code", monospace';
	} else {
		ctx.font = 'bold 15px "SF Mono", "Fira Code", monospace';
	}

	// Stroke for readability
	ctx.strokeStyle = 'rgba(0,0,0,0.45)';
	ctx.lineWidth = isCritText ? 3.5 : 2.5;
	ctx.save();
	ctx.translate(0, bounce);
	ctx.strokeText(n.text, n.x, n.y);
	ctx.fillStyle = hexToRgba(n.color);
	ctx.fillText(n.text, n.x, n.y);
	ctx.restore();

	ctx.shadowBlur = 0;
	ctx.restore();
}

// ─── RANGE INDICATOR ────────────────────────────────────────────────────────

export function drawRangeIndicator(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	range: number
): void {
	const pulse = Math.sin(frameTime) * 0.2 + 0.8;

	// Fill gradient
	const fillGrad = ctx.createRadialGradient(x, y, 0, x, y, range);
	fillGrad.addColorStop(0, `rgba(0, 255, 255, ${0.018 * pulse})`);
	fillGrad.addColorStop(0.6, `rgba(0, 255, 255, ${0.03 * pulse})`);
	fillGrad.addColorStop(1, `rgba(0, 255, 255, ${0.006 * pulse})`);
	ctx.fillStyle = fillGrad;
	ctx.beginPath();
	ctx.arc(x, y, range, 0, Math.PI * 2);
	ctx.fill();

	// Main ring — dashed
	ctx.strokeStyle = `rgba(0, 255, 255, ${0.08 * pulse})`;
	ctx.lineWidth = 1;
	ctx.setLineDash([3, 10]);
	ctx.beginPath();
	ctx.arc(x, y, range, 0, Math.PI * 2);
	ctx.stroke();
	ctx.setLineDash([]);

	// Inner ring
	ctx.strokeStyle = `rgba(68, 136, 255, ${0.04 * pulse})`;
	ctx.lineWidth = 1;
	ctx.setLineDash([2, 12]);
	ctx.beginPath();
	ctx.arc(x, y, range * 0.6, 0, Math.PI * 2);
	ctx.stroke();
	ctx.setLineDash([]);

	// Rotating small dots on the ring
	const dots = 8;
	for (let i = 0; i < dots; i++) {
		const a = (Math.PI * 2 / dots) * i + frameTime * 0.4;
		const dx = x + Math.cos(a) * range;
		const dy = y + Math.sin(a) * range;
		ctx.fillStyle = `rgba(0, 255, 255, ${0.15 * pulse})`;
		ctx.beginPath();
		ctx.arc(dx, dy, 2, 0, Math.PI * 2);
		ctx.fill();
	}
}

// ─── STAR GENERATION ────────────────────────────────────────────────────────

export function generateStars(
	w: number,
	h: number,
	count: number
): { x: number; y: number; size: number; alpha: number }[] {
	const stars = [];
	for (let i = 0; i < count; i++) {
		stars.push({
			x: Math.random() * w,
			y: Math.random() * h,
			size: 0.4 + Math.random() * 2.2,
			alpha: 0.15 + Math.random() * 0.65,
		});
	}
	return stars;
}
