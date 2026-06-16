export interface Vec2 {
	x: number;
	y: number;
}

export enum EnemyType {
	Normal = 'normal',
	Fast = 'fast',
	Tank = 'tank',
	Ranged = 'ranged',
	Boss = 'boss'
}

export interface EnemyConfig {
	type: EnemyType;
	hp: number;
	maxHp: number;
	speed: number;
	reward: number;
	damage: number;
	armor: number;
	attackRange: number;
	attackCooldown: number;
	size: number;
	color: number;
	shape: 'square' | 'triangle' | 'hexagon' | 'diamond' | 'pentagon';
}

export interface Enemy {
	id: number;
	type: EnemyType;
	config: EnemyConfig;
	position: Vec2;
	hp: number;
	maxHp: number;
	speed: number;
	reward: number;
	damage: number;
	armor: number;
	attackRange: number;
	attackCooldown: number;
	attackTimer: number;
	size: number;
	color: number;
	shape: EnemyConfig['shape'];
	angle: number;
	alive: boolean;
	hitFlashTimer: number;
	spawnProgress: number;
	stopped: boolean;
	isBoss: boolean;
	wave: number;
}

export interface Projectile {
	id: number;
	position: Vec2;
	targetId: number;
	speed: number;
	damage: number;
	color: number;
	alive: boolean;
	trail: Vec2[];
	isCrit: boolean;
}

export interface TowerStats {
	damage: number;
	fireRate: number;
	range: number;
	multishot: number;
	critChance: number;
	critMultiplier: number;
}

export interface TowerState {
	position: Vec2;
	hp: number;
	maxHp: number;
	stats: TowerStats;
	fireTimer: number;
	alive: boolean;
}

export enum UpgradeId {
	Damage = 'damage',
	FireRate = 'fireRate',
	Range = 'range',
	Multishot = 'multishot',
	CritChance = 'critChance',
	Defense = 'defense',
	MaxHp = 'maxHp'
}

export enum WorkshopUpgradeId {
	BaseDamage = 'baseDamage',
	BaseFireRate = 'baseFireRate',
	BaseRange = 'baseRange',
	StartingHp = 'startingHp',
	CoinBonus = 'coinBonus',
	CashBonus = 'cashBonus',
	CritBonus = 'critBonus',
	StartingCash = 'startingCash'
}

export enum LabId {
	DamageResearch = 'damageResearch',
	CoinEfficiency = 'coinEfficiency',
	TowerDurability = 'towerDurability'
}

export enum TierId {
	Tier1 = 'tier1',
	Tier2 = 'tier2',
	Tier3 = 'tier3',
	Tier4 = 'tier4',
	Tier5 = 'tier5'
}

export enum MilestoneId {
	Wave10 = 'wave10',
	Wave25 = 'wave25',
	Wave50 = 'wave50',
	Wave100 = 'wave100',
	Wave250 = 'wave250',
	Wave500 = 'wave500'
}

export enum ChallengeId {
	FastSwarm = 'fastSwarm',
	GlassTower = 'glassTower',
	BossRush = 'bossRush'
}

export interface BattleUpgrade {
	id: UpgradeId;
	name: string;
	description: string;
	level: number;
	maxLevel: number;
	cost: (level: number) => number;
	icon: string;
}

export interface WorkshopUpgrade {
	id: WorkshopUpgradeId;
	name: string;
	description: string;
	level: number;
	maxLevel: number;
	cost: (level: number) => number;
	icon: string;
}

export interface LabItem {
	id: LabId;
	name: string;
	description: string;
	level: number;
	maxLevel: number;
	cost: (level: number) => number;
	duration: (level: number) => number;
	icon: string;
}

export interface TierDef {
	id: TierId;
	name: string;
	description: string;
	waveRequirement: number;
	unlocked: boolean;
	rewards: string[];
}

export interface MilestoneDef {
	id: MilestoneId;
	tierId: TierId;
	wave: number;
	name: string;
	reward: string;
	claimed: boolean;
}

export interface ChallengeDef {
	id: ChallengeId;
	name: string;
	description: string;
	icon: string;
	locked: boolean;
	highScore: number;
	modifiers: string[];
}

export interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	maxLife: number;
	color: number;
	size: number;
	alpha: number;
}

export interface DamageNumber {
	x: number;
	y: number;
	text: string;
	color: number;
	life: number;
	maxLife: number;
	alpha: number;
}

export interface WaveState {
	currentWave: number;
	enemiesInWave: number;
	enemiesSpawned: number;
	enemiesKilled: number;
	spawnTimer: number;
	spawnInterval: number;
	waveActive: boolean;
	betweenWaveTimer: number;
}

export interface GameState {
	tower: TowerState;
	wave: WaveState;
	enemies: Enemy[];
	projectiles: Projectile[];
	cash: number;
	coins: number;
	battleUpgrades: Record<UpgradeId, number>;
	workshopUpgrades: Record<WorkshopUpgradeId, number>;
	labLevels: Record<LabId, number>;
	paused: boolean;
	gameOver: boolean;
	runActive: boolean;
	elapsedTime: number;
	waveStartTime: number;
	killCount: number;
	totalDamageDealt: number;
	highestWave: number;
	totalRuns: number;
	settings: GameSettings;
}

export interface GameSettings {
	reducedMotion: boolean;
	screenShake: boolean;
	particles: boolean;
	damageNumbers: boolean;
	lowEffectsMode: boolean;
}

/** Tracks real-time research progress. */
export interface ResearchState {
	id: LabId;
	level: number;
	researchStart: number;   // Date.now() when research began
	duration: number;        // total ms for this level
	complete: boolean;
}

export interface GameSnapshot {
	wave: number;
	towerHp: number;
	towerMaxHp: number;
	cash: number;
	coins: number;
	killCount: number;
	elapsedTime: number;
	gameOver: boolean;
	runActive: boolean;
	highestWave: number;
	enemyCount: number;
	speed: number;
	towerDamage: number;
	towerFireRate: number;
	towerRange: number;
	towerMultishot: number;
	towerCritChance: number;
	upgradeLevels: Record<string, number>;
	enemiesInWave: number;
	enemiesSpawned: number;
	enemiesKilledThisWave: number;
	waveActive: boolean;
	betweenWaveTimer: number;
	spawnInterval: number;
}

export const DEFAULT_SETTINGS: GameSettings = {
	reducedMotion: false,
	screenShake: true,
	particles: true,
	damageNumbers: true,
	lowEffectsMode: false
};
