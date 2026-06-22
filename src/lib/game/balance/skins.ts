export interface TowerSkin {
	id: string;
	name: string;
	description: string;
	cost: number;
	currency: 'alloy' | 'achievement';
	achievementId?: string;
	colors: {
		coreFill: number;
		coreStroke: number;
		innerStroke1: number;
		innerStroke2: number;
		centerHex: number;
		centerBright: number;
		muzzleColor: number;
	};
}

export const TOWER_SKINS: TowerSkin[] = [
	{
		id: 'classic',
		name: 'Classic Cyan',
		description: 'The standard issue defense core. Glowing with cyan security pulses.',
		cost: 0,
		currency: 'alloy',
		colors: {
			coreFill: 0x2255CC,
			coreStroke: 0x00FFFF, // GAME_CONFIG.NEON_CYAN
			innerStroke1: 0x00FFFF,
			innerStroke2: 0x0088FF, // GAME_CONFIG.NEON_BLUE
			centerHex: 0x00FFFF,
			centerBright: 0xFFFFFF,
			muzzleColor: 0xFFFFFF,
		}
	},
	{
		id: 'crimsonGuard',
		name: 'Crimson Guard',
		description: 'A free alternate finish — an aggressive red core for the impatient commander.',
		cost: 0,
		currency: 'alloy',
		colors: {
			coreFill: 0x661122,
			coreStroke: 0xFF3355,
			innerStroke1: 0xFF3355,
			innerStroke2: 0xAA1133,
			centerHex: 0xFF6677,
			centerBright: 0xFFFFFF,
			muzzleColor: 0xFF3355,
		}
	},
	{
		id: 'neonGrid',
		name: 'Neon Grid',
		description: 'A vibrant green shell with high-frequency orange shielding.',
		cost: 1000,
		currency: 'alloy',
		colors: {
			coreFill: 0x116622,
			coreStroke: 0x33FF33,
			innerStroke1: 0x33FF33,
			innerStroke2: 0xFF7700,
			centerHex: 0xFF7700,
			centerBright: 0xFFFFFF,
			muzzleColor: 0xFF7700,
		}
	},
	{
		id: 'emberForge',
		name: 'Ember Forge',
		description: 'Molten amber plating that runs hotter the longer the war drags on.',
		cost: 2500,
		currency: 'alloy',
		colors: {
			coreFill: 0x5A2208,
			coreStroke: 0xFF8A1E,
			innerStroke1: 0xFFB347,
			innerStroke2: 0xCC4400,
			centerHex: 0xFFCC55,
			centerBright: 0xFFF2D0,
			muzzleColor: 0xFFAA33,
		}
	},
	{
		id: 'cosmicVortex',
		name: 'Cosmic Vortex',
		description: 'Deep spatial purple core emitting hot pink accretion arcs.',
		cost: 3000,
		currency: 'alloy',
		colors: {
			coreFill: 0x441166,
			coreStroke: 0xAA00FF,
			innerStroke1: 0xFF00AA,
			innerStroke2: 0xFF0055,
			centerHex: 0xFF00AA,
			centerBright: 0xFFFFFF,
			muzzleColor: 0xFF00AA,
		}
	},
	{
		id: 'arcticPulse',
		name: 'Arctic Pulse',
		description: 'A glacial white-blue shell that radiates a cold, clinical calm.',
		cost: 5000,
		currency: 'alloy',
		colors: {
			coreFill: 0x123A55,
			coreStroke: 0x9FE8FF,
			innerStroke1: 0xCFF6FF,
			innerStroke2: 0x4FB8E8,
			centerHex: 0xEAFBFF,
			centerBright: 0xFFFFFF,
			muzzleColor: 0xCFF6FF,
		}
	},
	{
		id: 'matrix',
		name: 'Matrix Cascade',
		description: 'A dark digital core running streams of bright emerald code.',
		cost: 6000,
		currency: 'alloy',
		colors: {
			coreFill: 0x071C08,
			coreStroke: 0x00FF33,
			innerStroke1: 0x00AA22,
			innerStroke2: 0x005511,
			centerHex: 0x00FF33,
			centerBright: 0xEEFFEE,
			muzzleColor: 0x00FF33,
		}
	},
	{
		id: 'glassMastery',
		name: 'Glass Chrono',
		description: 'A delicate golden matrix unlocked by mastering the Glass Tower challenge.',
		cost: 0,
		currency: 'achievement',
		achievementId: 'glass_tower_100',
		colors: {
			coreFill: 0x665511,
			coreStroke: 0xFFDD44,
			innerStroke1: 0xFFDD44,
			innerStroke2: 0xAA8800,
			centerHex: 0xFFEEAA,
			centerBright: 0xFFFFFF,
			muzzleColor: 0xFFDD44,
		}
	}
];
