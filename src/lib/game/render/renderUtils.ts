export function generateStars(
	w: number,
	h: number,
	count: number,
): { x: number; y: number; size: number; alpha: number }[] {
	const stars: { x: number; y: number; size: number; alpha: number }[] = [];
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
