/**
 * Selectable battlefield backgrounds. Mirrors the TowerSkin economy (free +
 * alloy + achievement unlocks) but recolours the BackgroundRenderer's static
 * field — deep-space fill, atmospheric glow rings, grid, and star tint — rather
 * than the tower. Cosmetic only; never touches simulation or balance.
 */
export interface BackgroundTheme {
	id: string;
	name: string;
	description: string;
	cost: number;
	currency: 'alloy' | 'achievement';
	achievementId?: string;
	colors: {
		/** Deep-space base fill. */
		deepSpace: number;
		/** Two alternating atmospheric glow-ring hues. */
		glowA: number;
		glowB: number;
		/** Faint grid lines. */
		grid: number;
		/** Twinkling star tint. */
		star: number;
	};
	/** Grid line opacity (default field uses 0.025). */
	gridAlpha: number;
	/** Multiplier on the dark vignette strength (1 = default). */
	vignette: number;
	/** Multiplier on star count (1 = default density). */
	starDensity: number;
}

export const BACKGROUNDS: BackgroundTheme[] = [
	{
		id: 'void',
		name: 'Deep Void',
		description: 'Standard issue. Cyan security glow over a near-black field.',
		cost: 0,
		currency: 'alloy',
		colors: { deepSpace: 0x070812, glowA: 0x00FFFF, glowB: 0x4488FF, grid: 0x00FFFF, star: 0xB4C8FF },
		gridAlpha: 0.025,
		vignette: 1,
		starDensity: 1,
	},
	{
		id: 'nebula',
		name: 'Violet Nebula',
		description: 'A free alternate sky — drifting magenta gas clouds and cool starlight.',
		cost: 0,
		currency: 'alloy',
		colors: { deepSpace: 0x0B0718, glowA: 0xAA44FF, glowB: 0xFF44AA, grid: 0x8844FF, star: 0xD8C8FF },
		gridAlpha: 0.022,
		vignette: 1.1,
		starDensity: 1.2,
	},
	{
		id: 'emeraldField',
		name: 'Emerald Field',
		description: 'A calm green expanse — like staring into a friendly, well-funded terminal.',
		cost: 1500,
		currency: 'alloy',
		colors: { deepSpace: 0x04120A, glowA: 0x33FF88, glowB: 0x119955, grid: 0x33FF88, star: 0xC8FFE0 },
		gridAlpha: 0.03,
		vignette: 0.9,
		starDensity: 1,
	},
	{
		id: 'emberSky',
		name: 'Ember Sky',
		description: 'Smouldering orange horizons. The war looks warmer than it is.',
		cost: 3000,
		currency: 'alloy',
		colors: { deepSpace: 0x140803, glowA: 0xFF8A1E, glowB: 0xCC3300, grid: 0xFF7733, star: 0xFFE0C0 },
		gridAlpha: 0.028,
		vignette: 1.15,
		starDensity: 0.9,
	},
	{
		id: 'monochrome',
		name: 'Monochrome',
		description: 'A clean, clinical greyscale field for commanders who find colour distracting.',
		cost: 4500,
		currency: 'alloy',
		colors: { deepSpace: 0x0A0A0C, glowA: 0x8899AA, glowB: 0x556677, grid: 0x99AABB, star: 0xDDE4EC },
		gridAlpha: 0.02,
		vignette: 1,
		starDensity: 1.1,
	},
	{
		id: 'aurora',
		name: 'Aurora Drift',
		description: 'Shimmering teal-and-rose curtains over a deep polar dark. Premium calm.',
		cost: 7000,
		currency: 'alloy',
		colors: { deepSpace: 0x05101A, glowA: 0x22E0C0, glowB: 0xAA66FF, grid: 0x33D0C8, star: 0xCFF6FF },
		gridAlpha: 0.026,
		vignette: 1.05,
		starDensity: 1.3,
	},
];

/** Resolve a background theme by id, falling back to the default 'void'. */
export function getBackground(id: string | undefined): BackgroundTheme {
	return BACKGROUNDS.find(b => b.id === id) ?? BACKGROUNDS[0]!;
}
