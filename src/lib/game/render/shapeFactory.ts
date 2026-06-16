import { GAME_CONFIG } from '../engine/gameConfig';
import type { Enemy, Particle, DamageNumber } from '../engine/gameTypes';

export function drawTower(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, hp: number, maxHp: number): void {
	const t = Date.now() / 1000;
	const pulse = Math.sin(t * 1.2) * 0.2 + 0.8;
	const glowPulse = Math.sin(t * 0.8) * 0.3 + 0.7;

	// === Outer atmospheric glow ===
	const atmos = ctx.createRadialGradient(x, y, 0, x, y, size * 4);
	atmos.addColorStop(0, `rgba(0, 255, 255, ${0.06 * glowPulse})`);
	atmos.addColorStop(0.3, `rgba(68, 136, 255, ${0.04 * glowPulse})`);
	atmos.addColorStop(0.6, `rgba(136, 68, 255, ${0.02 * glowPulse})`);
	atmos.addColorStop(1, 'rgba(0, 0, 0, 0)');
	ctx.fillStyle = atmos;
	ctx.beginPath();
	ctx.arc(x, y, size * 4, 0, Math.PI * 2);
	ctx.fill();

	// === Neon ring glow ===
	ctx.save();
	ctx.shadowColor = 'rgba(0, 255, 255, 0.6)';
	ctx.shadowBlur = 30 * pulse;

	// Outer ring
	ctx.strokeStyle = `rgba(0, 255, 255, ${0.15 * pulse})`;
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.arc(x, y, size * 1.25, 0, Math.PI * 2);
	ctx.stroke();

	ctx.strokeStyle = `rgba(68, 136, 255, ${0.1 * pulse})`;
	ctx.beginPath();
	ctx.arc(x, y, size * 1.55, 0, Math.PI * 2);
	ctx.stroke();
	ctx.shadowBlur = 0;
	ctx.restore();

	// === Tower body with gradient ===
	const bodyGrad = ctx.createRadialGradient(
		x - size * 0.25, y - size * 0.3, 0,
		x, y, size
	);
	bodyGrad.addColorStop(0, '#66AAFF');
	bodyGrad.addColorStop(0.3, '#4488FF');
	bodyGrad.addColorStop(0.6, '#2255CC');
	bodyGrad.addColorStop(0.85, '#112266');
	bodyGrad.addColorStop(1, '#070812');
	ctx.fillStyle = bodyGrad;
	ctx.beginPath();
	ctx.arc(x, y, size, 0, Math.PI * 2);
	ctx.fill();

	// === Neon border with glow ===
	ctx.save();
	ctx.shadowColor = 'rgba(0, 255, 255, 0.5)';
	ctx.shadowBlur = 15 * pulse;
	ctx.strokeStyle = `rgba(0, 255, 255, ${0.7 * pulse})`;
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.arc(x, y, size, 0, Math.PI * 2);
	ctx.stroke();
	ctx.shadowBlur = 0;
	ctx.restore();

	// === Inner rings ===
	ctx.strokeStyle = `rgba(0, 255, 255, ${0.15 * pulse})`;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.arc(x, y, size * 0.55, 0, Math.PI * 2);
	ctx.stroke();

	ctx.strokeStyle = `rgba(68, 136, 255, ${0.1 * pulse})`;
	ctx.beginPath();
	ctx.arc(x, y, size * 0.3, 0, Math.PI * 2);
	ctx.stroke();

	// === Center core ===
	const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, size * 0.2);
	coreGrad.addColorStop(0, `rgba(0, 255, 255, ${0.6 * pulse})`);
	coreGrad.addColorStop(1, 'rgba(0, 255, 255, 0)');
	ctx.fillStyle = coreGrad;
	ctx.beginPath();
	ctx.arc(x, y, size * 0.2, 0, Math.PI * 2);
	ctx.fill();

	// === Spinning crosshair arms ===
	const rot = t * 0.6;
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(rot);
	ctx.strokeStyle = `rgba(0, 255, 255, ${0.08 * pulse})`;
	ctx.lineWidth = 1;
	for (let i = 0; i < 4; i++) {
		const a = (Math.PI / 2) * i;
		ctx.beginPath();
		ctx.moveTo(Math.cos(a) * size * 0.3, Math.sin(a) * size * 0.3);
		ctx.lineTo(Math.cos(a) * size * 0.9, Math.sin(a) * size * 0.9);
		ctx.stroke();
	}
	ctx.restore();

	// === HP bar ===
	const barW = size * 2.8;
	const barH = 4;
	const barX = x - barW / 2;
	const barY = y - size - 14;
	const hpPct = Math.max(0, hp / maxHp);

	ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
	ctx.beginPath();
	ctx.roundRect?.(barX, barY, barW, barH, 2) ?? ctx.rect(barX, barY, barW, barH);
	ctx.fill();

	const hpColor = hpPct > 0.5 ? `rgb(68, 255, 136)` : hpPct > 0.25 ? `rgb(255, 136, 68)` : `rgb(255, 68, 68)`;
	ctx.fillStyle = hpColor;
	ctx.beginPath();
	ctx.roundRect?.(barX, barY, barW * hpPct, barH, 2) ?? ctx.rect(barX, barY, barW * hpPct, barH);
	ctx.fill();

	ctx.strokeStyle = `rgba(0, 255, 255, 0.2)`;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.roundRect?.(barX, barY, barW, barH, 2) ?? ctx.rect(barX, barY, barW, barH);
	ctx.stroke();
}

export function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy): void {
	const { x, y } = enemy.position;
	const s = enemy.size;
	const flash = enemy.hitFlashTimer > 0;
	const color = flash ? '#FFFFFF' : hexToRgba(enemy.color);
	const strokeColor = flash ? '#FFFFFF' : hexToRgba(enemy.color, 0.8);
	const alpha = flash ? 1 : 0.92;

	ctx.save();
	ctx.translate(x, y);
	if (enemy.shape !== 'triangle') {
		ctx.rotate(enemy.angle);
	}

	// === Outer glow ===
	if (enemy.isBoss) {
		const p = Math.sin(Date.now() / 500) * 0.2 + 0.8;
		const g = ctx.createRadialGradient(0, 0, s * 0.2, 0, 0, s * 2.5);
		g.addColorStop(0, hexToRgba(enemy.color, 0.2 * p));
		g.addColorStop(0.5, hexToRgba(enemy.color, 0.08 * p));
		g.addColorStop(1, 'rgba(0,0,0,0)');
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(0, 0, s * 2.5, 0, Math.PI * 2);
		ctx.fill();
	} else {
		const g = ctx.createRadialGradient(0, 0, s * 0.1, 0, 0, s * 1.5);
		g.addColorStop(0, hexToRgba(enemy.color, 0.1));
		g.addColorStop(1, 'rgba(0,0,0,0)');
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(0, 0, s * 1.5, 0, Math.PI * 2);
		ctx.fill();
	}

	// === Shape fill ===
	ctx.globalAlpha = alpha;
	ctx.fillStyle = color;
	ctx.strokeStyle = strokeColor;
	ctx.lineWidth = enemy.isBoss ? 2.5 : 1.5;

	ctx.beginPath();
	switch (enemy.shape) {
		case 'square': {
			const r = s / 2;
			ctx.roundRect?.(-r, -r, s, s, 2) ?? ctx.rect(-r, -r, s, s);
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
	ctx.fill();
	ctx.stroke();

	// === Inner shape detail ===
	ctx.globalAlpha = alpha * 0.4;
	ctx.strokeStyle = hexToRgba(enemy.color, 0.3);
	ctx.lineWidth = 1;
	switch (enemy.shape) {
		case 'square':
			ctx.strokeRect(-s / 4, -s / 4, s / 2, s / 2);
			break;
		case 'hexagon': {
			ctx.beginPath();
			for (let i = 0; i < 6; i++) {
				const a = (Math.PI / 3) * i - Math.PI / 6;
				const px = Math.cos(a) * s / 4;
				const py = Math.sin(a) * s / 4;
				i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
			}
			ctx.closePath();
			ctx.stroke();
			break;
		}
		case 'diamond':
			ctx.beginPath();
			ctx.moveTo(0, -s / 4);
			ctx.lineTo(s / 4, 0);
			ctx.lineTo(0, s / 4);
			ctx.lineTo(-s / 4, 0);
			ctx.closePath();
			ctx.stroke();
			break;
		case 'pentagon': {
			ctx.beginPath();
			for (let i = 0; i < 5; i++) {
				const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
				const px = Math.cos(a) * s / 4;
				const py = Math.sin(a) * s / 4;
				i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
			}
			ctx.closePath();
			ctx.stroke();
			break;
		}
	}

	ctx.globalAlpha = 1;

	// === HP bar ===
	if (enemy.hp < enemy.maxHp && !enemy.isBoss) {
		const barW = s * 1.6;
		const barH = 3;
		const barX = -barW / 2;
		const barY = -s / 2 - 7;
		const hpPct = enemy.hp / enemy.maxHp;

		ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
		ctx.fillRect(barX, barY, barW, barH);
		ctx.fillStyle = hexToRgba(enemy.color);
		ctx.fillRect(barX, barY, barW * hpPct, barH);
	}

	// === Boss extra glow ring ===
	if (enemy.isBoss) {
		const p = Math.sin(Date.now() / 400) * 0.15 + 0.85;
		ctx.strokeStyle = hexToRgba(enemy.color, 0.3 * p);
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(0, 0, s * 0.7, 0, Math.PI * 2);
		ctx.stroke();
	}

	ctx.restore();
}

export function drawProjectile(
	ctx: CanvasRenderingContext2D,
	position: { x: number; y: number },
	trail: { x: number; y: number }[],
	color: number,
	isCrit: boolean
): void {
	const c = hexToRgba(color);
	const size = isCrit ? 5 : 3;

	// === Glow ===
	ctx.save();
	ctx.shadowColor = c;
	ctx.shadowBlur = isCrit ? 20 : 10;
	ctx.fillStyle = c;
	ctx.beginPath();
	ctx.arc(position.x, position.y, size, 0, Math.PI * 2);
	ctx.fill();
	ctx.shadowBlur = 0;

	// === Bright center ===
	ctx.fillStyle = '#FFFFFF';
	ctx.beginPath();
	ctx.arc(position.x, position.y, size * 0.4, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();

	// === Trail ===
	if (trail.length > 1) {
		for (let i = 1; i < trail.length; i++) {
			const alpha = (i / trail.length) * (isCrit ? 0.6 : 0.4);
			const tSize = isCrit ? (2 + i / trail.length * 2) : (1 + i / trail.length * 1.5);
			ctx.fillStyle = hexToRgba(color, alpha);
			ctx.beginPath();
			ctx.arc(trail[i]!.x, trail[i]!.y, tSize, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	// === Crit flash ===
	if (isCrit) {
		ctx.strokeStyle = hexToRgba(color, 0.3);
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.arc(position.x, position.y, size * 2.5, 0, Math.PI * 2);
		ctx.stroke();
	}
}

export function drawParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
	ctx.save();
	ctx.globalAlpha = p.alpha;
	ctx.fillStyle = hexToRgba(p.color, p.alpha);
	ctx.shadowColor = hexToRgba(p.color, p.alpha * 0.5);
	ctx.shadowBlur = 6;
	ctx.beginPath();
	ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
}

export function drawDamageNumber(ctx: CanvasRenderingContext2D, n: DamageNumber): void {
	ctx.save();
	ctx.globalAlpha = n.alpha;
	const isCritText = n.color === GAME_CONFIG.NEON_YELLOW;
	ctx.fillStyle = hexToRgba(n.color);
	ctx.font = isCritText
		? 'bold 18px "SF Mono", "Fira Code", monospace'
		: 'bold 14px "SF Mono", "Fira Code", monospace';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.shadowColor = hexToRgba(n.color, 0.6);
	ctx.shadowBlur = isCritText ? 12 : 6;

	if (isCritText) {
		ctx.strokeStyle = 'rgba(0,0,0,0.3)';
		ctx.lineWidth = 2;
		ctx.strokeText(n.text, n.x, n.y);
	}

	ctx.fillText(n.text, n.x, n.y);
	ctx.restore();
}

export function drawBackground(
	ctx: CanvasRenderingContext2D,
	w: number,
	h: number,
	stars: { x: number; y: number; size: number; alpha: number }[],
	time: number
): void {
	// === Background ===
	ctx.fillStyle = '#070812';
	ctx.fillRect(0, 0, w, h);

	// === Grid ===
	const gs = GAME_CONFIG.BACKGROUND_GRID_SIZE;
	ctx.strokeStyle = 'rgba(0, 255, 255, 0.03)';
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

	// === Center glow ===
	const cx = w / 2;
	const cy = h / 2;
	const pulse = Math.sin(time * 1.5) * 0.3 + 0.7;
	const gridGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.5);
	gridGlow.addColorStop(0, `rgba(0, 255, 255, ${0.04 * pulse})`);
	gridGlow.addColorStop(0.5, `rgba(68, 136, 255, ${0.02 * pulse})`);
	gridGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
	ctx.fillStyle = gridGlow;
	ctx.fillRect(0, 0, w, h);

	// === Stars with twinkle ===
	for (const star of stars) {
		const twinkle = Math.sin(time * 2 + star.x * 0.07 + star.y * 0.09) * 0.5 + 0.5;
		const a = star.alpha * (0.3 + twinkle * 0.7);
		ctx.fillStyle = `rgba(180, 200, 255, ${a})`;
		ctx.beginPath();
		ctx.arc(star.x, star.y, star.size * (0.8 + twinkle * 0.4), 0, Math.PI * 2);
		ctx.fill();

		// Star glow on brighter ones
		if (star.size > 1.2 && a > 0.4) {
			ctx.fillStyle = `rgba(180, 200, 255, ${a * 0.15})`;
			ctx.beginPath();
			ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
			ctx.fill();
		}
	}
}

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
			size: 0.5 + Math.random() * 2,
			alpha: 0.2 + Math.random() * 0.6,
		});
	}
	return stars;
}

export function drawRangeIndicator(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	range: number
): void {
	const pulse = Math.sin(Date.now() / 1000) * 0.15 + 0.85;

	// Range fill
	const fillGrad = ctx.createRadialGradient(x, y, 0, x, y, range);
	fillGrad.addColorStop(0, `rgba(0, 255, 255, ${0.02 * pulse})`);
	fillGrad.addColorStop(0.8, `rgba(0, 255, 255, ${0.04 * pulse})`);
	fillGrad.addColorStop(1, `rgba(0, 255, 255, ${0.01 * pulse})`);
	ctx.fillStyle = fillGrad;
	ctx.beginPath();
	ctx.arc(x, y, range, 0, Math.PI * 2);
	ctx.fill();

	// Range ring
	ctx.strokeStyle = `rgba(0, 255, 255, ${0.07 * pulse})`;
	ctx.lineWidth = 1;
	ctx.setLineDash([4, 8]);
	ctx.beginPath();
	ctx.arc(x, y, range, 0, Math.PI * 2);
	ctx.stroke();
	ctx.setLineDash([]);

	// Inner subtle ring
	ctx.strokeStyle = `rgba(0, 255, 255, ${0.04 * pulse})`;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.arc(x, y, range * 0.7, 0, Math.PI * 2);
	ctx.stroke();
}

function hexToRgba(hex: number, alpha: number = 1): string {
	const r = (hex >> 16) & 0xFF;
	const g = (hex >> 8) & 0xFF;
	const b = hex & 0xFF;
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
