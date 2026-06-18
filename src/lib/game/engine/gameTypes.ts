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
	isShiny?: boolean;
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
	/** Per-enemy coin reward (independent of workshop/lab multipliers) */
	coinReward: number;
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
	isShiny: boolean;
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
	/** Optional future combat modifiers; omitted values preserve current behavior. */
	armorPierce?: number;
	damageMultiplier?: number;
	maxDistance?: number;
	distanceFalloff?: number;
	tags?: string[];
}

export interface TowerStats {
	damage: number;
	fireRate: number;
	range: number;
	multishotChance: number;
	multishotCount: number;
	critChance: number;
	critMultiplier: number;
	/** Damage reduction percentage (0–0.50 capped) */
	defensePercent: number;
	/** Flat damage reduction after defensePercent */
	defenseAbsolute: number;
	/** HP restored per second (up to maxHP) */
	regen: number;
	/** Fraction of projectile damage healed (0–0.15 capped) */
	lifesteal: number;
	/** Damage reflected to melee attackers */
	thorns: number;
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
	MultishotProjectiles = 'multishotProjectiles',
	CritChance = 'critChance',
	CritMultiplier = 'critMultiplier',
	Defense = 'defense',
	DefensePercent = 'defensePercent',
	MaxHp = 'maxHp',
	Regen = 'regen',
	Lifesteal = 'lifesteal',
	Thorns = 'thorns',
	EnergyAmp = 'energyAmp',
	CashPerWave = 'cashPerWave',
}

export enum WorkshopUpgradeId {
	BaseDamage = 'baseDamage',
	BaseFireRate = 'baseFireRate',
	BaseRange = 'baseRange',
	StartingHp = 'startingHp',
	DefenseAbsolute = 'defenseAbsolute',
	Regen = 'regen',
	DefensePercent = 'defensePercent',
	Lifesteal = 'lifesteal',
	Thorns = 'thorns',
	CoinBonus = 'coinBonus',
	EnergyBonus = 'energyBonus',
	CritBonus = 'critBonus',
	StartingEnergy = 'startingEnergy'
}

export enum LabId {
	DamageResearch = 'damageResearch',
	AttackSpeedResearch = 'attackSpeedResearch',
	HealthResearch = 'healthResearch',
	AlloyEfficiency = 'alloyEfficiency',
	EnergyEfficiency = 'energyEfficiency',
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
	Wave500 = 'wave500',
	Wave1000 = 'wave1000',
	Wave2500 = 'wave2500',
	Wave4500 = 'wave4500',
}

export enum ChallengeId {
	FastSwarm = 'fastSwarm',
	GlassTower = 'glassTower',
	BossRush = 'bossRush'
}

export type UpgradeCategory = 'offense' | 'defense' | 'utility';

export enum BlueprintId {
	CriticalTargeting = 'criticalTargeting',
	SplitBeamGeometry = 'splitBeamGeometry',
	ExtendedCoreOptics = 'extendedCoreOptics',
	PlatedCoreShell = 'platedCoreShell',
	PhaseDampener = 'phaseDampener',
	ReactiveSurface = 'reactiveSurface',
	EnergyReclaimer = 'energyReclaimer',
	AlloyExtraction = 'alloyExtraction',
	EnergyCondenser = 'energyCondenser',
	DeploymentReserves = 'deploymentReserves',
}

export type BlueprintCategory = 'attack' | 'defense' | 'utility';

export enum AchievementId {
	Deployments1 = 'deployments1',
	Deployments10 = 'deployments10',
	Deployments100 = 'deployments100',
	Deployments1000 = 'deployments1000',
	Deployments10000 = 'deployments10000',
	Deployments100000 = 'deployments100000',
	BestWave2 = 'bestWave2',
	BestWave5 = 'bestWave5',
	BestWave10 = 'bestWave10',
	BestWave25 = 'bestWave25',
	BestWave50 = 'bestWave50',
	BestWave100 = 'bestWave100',
	BestWave250 = 'bestWave250',
	BestWave500 = 'bestWave500',
	BestWave1000 = 'bestWave1000',
	BestWave2500 = 'bestWave2500',
	BestWave5000 = 'bestWave5000',
	ShapesDestroyed10 = 'shapesDestroyed10',
	ShapesDestroyed100 = 'shapesDestroyed100',
	ShapesDestroyed1000 = 'shapesDestroyed1000',
	ShapesDestroyed10000 = 'shapesDestroyed10000',
	ShapesDestroyed100000 = 'shapesDestroyed100000',
	BossesDefeated1 = 'bossesDefeated1',
	BossesDefeated10 = 'bossesDefeated10',
	BossesDefeated100 = 'bossesDefeated100',
	BossesDefeated1000 = 'bossesDefeated1000',
	FieldUpgradesPurchased10 = 'fieldUpgradesPurchased10',
	FieldUpgradesPurchased100 = 'fieldUpgradesPurchased100',
	FieldUpgradesPurchased1000 = 'fieldUpgradesPurchased1000',
	FieldUpgradesPurchased10000 = 'fieldUpgradesPurchased10000',
	AlloyEarned100 = 'alloyEarned100',
	AlloyEarned1000 = 'alloyEarned1000',
	AlloyEarned10000 = 'alloyEarned10000',
	AlloyEarned100000 = 'alloyEarned100000',
}

export interface AchievementDef {
	id: AchievementId;
	name: string;
	description: string;
	category: 'deployments' | 'bestWave' | 'shapesDestroyed' | 'bossesDefeated' | 'fieldUpgrades' | 'alloyEarned';
	threshold: number;
	reward: number;
	rewardLabel: string;
}

export interface BattleUpgrade {
	id: UpgradeId;
	name: string;
	description: string;
	category: UpgradeCategory;
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

/** Expanding ring burst used for impact feedback (boss/crit kills). */
export interface Shockwave {
	x: number;
	y: number;
	color: number;
	radius: number;
	maxRadius: number;
	life: number;
	maxLife: number;
	width: number;
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
	currentSubWave: number;
	enemiesInSubWave: number;
	enemiesSpawnedInSubWave: number;
	subWavePauseTimer: number;
	subWaveActive: boolean;
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
	bossesDefeated: number;
	totalDamageDealt: number;
	totalEnergyEarned: number;
	highestWave: number;
	totalRuns: number;
	settings: GameSettings;
	shiniesKilled: number;
	/** Numeric front/tier this deployment is running on (1–5). */
	tier: number;
	/** Live viewport width in px, set by the renderer — used for enemy spawn placement. */
	viewWidth?: number;
	/** Live viewport height in px, set by the renderer — used for enemy spawn placement. */
	viewHeight?: number;
	/** Active Special Ops challenge for this run, or null for a standard run. */
	activeChallenge: ChallengeId | null;
	/** Per-run kill counts by enemy type — accumulated into save on game over. */
	killsByType: Partial<Record<EnemyType, number>>;
	/** Per-run shiny kills by type. */
	shinyKillsByType: Partial<Record<EnemyType, number>>;
	/** Mastery damage bonus per type, precomputed at run start from lifetime killsByType. */
	masteryDmgBonus: Partial<Record<EnemyType, number>>;
	/** Crits dealt this run. */
	critsDealt: number;
}

export interface GameSettings {
	reducedMotion: boolean;
	screenShake: boolean;
	particles: boolean;
	damageNumbers: boolean;
	lowEffectsMode: boolean;
	/** Sound effects (procedural Web Audio). */
	sfx: boolean;
	/** Ambient background music. */
	music: boolean;
	/** Neon bloom post-processing filter. */
	bloom: boolean;
	/** Browser notification when lab research completes. */
	browserNotifications: boolean;
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
	bossesDefeated: number;
	elapsedTime: number;
	gameOver: boolean;
	runActive: boolean;
	highestWave: number;
	enemyCount: number;
	speed: number;
	towerDamage: number;
	towerFireRate: number;
	towerRange: number;
	towerMultishotChance: number;
	towerMultishotCount: number;
	towerCritChance: number;
	towerCritMultiplier: number;
	towerDefensePercent: number;
	towerDefenseAbsolute: number;
	towerRegen: number;
	towerLifesteal: number;
	towerThorns: number;
	upgradeLevels: Record<string, number>;
	enemiesInWave: number;
	enemiesSpawned: number;
	enemiesKilledThisWave: number;
	waveActive: boolean;
	betweenWaveTimer: number;
	spawnInterval: number;
	/** Boss health bar — populated only while a boss is alive. */
	bossActive: boolean;
	bossHp: number;
	bossMaxHp: number;
}

export const DEFAULT_SETTINGS: GameSettings = {
	reducedMotion: false,
	screenShake: true,
	particles: true,
	damageNumbers: true,
	lowEffectsMode: false,
	sfx: true,
	music: false,
	bloom: true,
	browserNotifications: false
};
