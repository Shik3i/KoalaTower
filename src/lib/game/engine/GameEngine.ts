import { GAME_CONFIG, getDefaultTowerStats } from './gameConfig';
import type {
	Enemy,
	Particle,
	DamageNumber,
	DamageNumberKind,
	DeathEffect,
	Shockwave,
	GameSettings,
	GameSnapshot,
	GameState,
	UpgradeId,
	WorkshopUpgradeId,
	LabId,
	BlueprintId,
} from './gameTypes';
import type { SoundName } from '../audio/AudioManager';
import { EnemyType, DEFAULT_SETTINGS, ChallengeId } from './gameTypes';
import { createTowerState, applyBattleUpgrades, applyRegen } from '../systems/towerSystem';
import { updateEnemySystem, updateProjectileSystem, updateTowerTargeting, resetProjectileIdCounter, formatFloatingText } from '../systems/enemySystem';
import { updateWaveSystem, removeDeadEnemies } from '../systems/waveSystem';
import { getStartingEnergy } from '../systems/economySystem';
import { resetEnemyIdCounter } from '../balance/enemies';
import { getMasteryBonus } from '../balance/balanceMath';
import { getBattleUpgradeCost, buildBattleUpgradeList } from '../balance/battleUpgrades';
import { seedBattleUpgradesFromForge } from '../balance/forgeUpgrades';
import { isFieldUpgradeUnlocked } from '../balance/blueprints';
import { setFeedbackHooks } from '../systems/enemySystem';
import { buildEnemyFrameIndex } from '../systems/spatialIndex';

export type MuzzleFlashCallback = () => void;

/**
 * Per-kind ascent speed (px/s) for floating damage numbers. Mirrored from
 * EffectsRenderer's KIND_STYLE so the engine owns the simulation while the
 * renderer owns the visuals — no renderer→engine import.
 */
const DAMAGE_ASCENT: Record<DamageNumberKind, number> = {
	damage: 30,
	crit: 42,
	energy: 34,
	alloy: 38,
	strange: 38,
	schematic: 36,
	chain: 0,
	error: 22,
};

const MILESTONE_WAVES = new Set([10, 25, 50, 100, 250, 500, 1000, 2500, 4500]);

export class GameEngine {
	public state: GameState;
	public particles: Particle[] = [];
	public damageNumbers: DamageNumber[] = [];
	/** Enemy id → its currently-live aggregated damage number, for merging rapid
	 * hits. Stale entries self-evict (a dead number reads life<=0 on next lookup). */
	private dmgAggIndex = new Map<number, DamageNumber>();
	public shockwaves: Shockwave[] = [];
	public deathEffects: DeathEffect[] = [];
	public shakeAmount: number = 0;
	public speedMultiplier: number = 1;
	private hitStopTimer: number = 0;
	private soundHandler: ((name: SoundName) => void) | null = null;
	private onKillstreakMilestoneHandler: ((count: number) => void) | null = null;
	private nextDeathEffectId: number = 1;

	private snapshotTimer: number = 0;
	private lastWave: number = 0;
	private lastSnapshot: GameSnapshot | null = null;
	private firedMilestones: Set<number> = new Set();
	private onSnapshot: ((snapshot: GameSnapshot) => void) | null = null;
	private onGameOver: ((coins: number, wave: number) => void) | null = null;
	private onMilestone: ((text: string) => void) | null = null;
	private onStateChange: (() => void) | null = null;
	private muzzleFlashCallback: MuzzleFlashCallback | null = null;
	private unlockedFieldBlueprints: BlueprintId[] = [];
	private statsDirty: boolean = true;

	constructor() {
		this.state = this.createInitialState();
	}

	/** Call after PixiGameView is created to wire the muzzle flash */
	public wireMuzzleFlash(cb: MuzzleFlashCallback): void {
		this.muzzleFlashCallback = cb;
		setFeedbackHooks({
			addDmg: (x, y, text, color, kind, aggKey, aggValue) => this.addDamageNumber(x, y, text, color, kind, aggKey, aggValue),
			addParticles: (x, y, color, count, speed) => this.addParticles(x, y, color, count, speed),
			addShake: (amount) => this.addShake(amount),
			triggerMuzzleFlash: () => this.muzzleFlashCallback?.(),
			playSound: (name) => this.soundHandler?.(name),
			hitStop: (seconds) => this.triggerHitStop(seconds),
			addShockwave: (x, y, color, maxRadius, duration, width) => this.addShockwave(x, y, color, maxRadius, duration, width),
			addDeathEffect: (enemy) => this.addDeathEffect(enemy),
			onKillstreakMilestone: (count) => this.onKillstreakMilestoneHandler?.(count),
		});
	}

	/** Wire a handler invoked when a cosmetic killstreak tier is crossed. */
	public setKillstreakMilestoneHandler(cb: ((count: number) => void) | null): void {
		this.onKillstreakMilestoneHandler = cb;
	}

	/** Wire a sound handler (e.g. the AudioManager). */
	public setSoundHandler(cb: ((name: SoundName) => void) | null): void {
		this.soundHandler = cb;
	}

	private createInitialState(): GameState {
		return {
			tower: {
				position: { x: GAME_CONFIG.VIEW_WIDTH / 2, y: GAME_CONFIG.VIEW_HEIGHT / 2 },
				hp: 100,
				maxHp: 100,
				stats: getDefaultTowerStats(),
				fireTimer: 0,
				alive: true,
			},
		wave: {
			currentWave: 0,
			enemiesInWave: 0,
			enemiesSpawned: 0,
			enemiesKilled: 0,
			spawnTimer: 0,
			spawnInterval: 1.0,
			waveActive: false,
			betweenWaveTimer: 0,
			currentSubWave: 0,
			enemiesInSubWave: 0,
			enemiesSpawnedInSubWave: 0,
			subWavePauseTimer: 0,
			subWaveActive: false,
			killsByTypeThisWave: {},
			lastWaveKillsByType: {},
			currentTickIndex: 0,
			spawnBacklog: 0,
			bossPending: false,
		},
			enemies: [],
			projectiles: [],
			cash: 0,
			coins: 0,
			battleUpgrades: {} as Record<UpgradeId, number>,
			workshopUpgrades: {} as Record<WorkshopUpgradeId, number>,
			labLevels: {} as Record<import('./gameTypes').LabId, number>,
			paused: false,
			gameOver: false,
			runActive: false,
			elapsedTime: 0,
			waveStartTime: 0,
			killCount: 0,
			bossesDefeated: 0,
			shiniesKilled: 0,
			totalDamageDealt: 0,
			towerDamageTaken: 0,
			totalEnergyEarned: 0,
			highestWave: 0,
			totalRuns: 0,
			settings: { ...DEFAULT_SETTINGS },
			tier: 1,
			activeChallenge: null,
			killsByType: {},
			shinyKillsByType: {},
			masteryDmgBonus: {},
			critsDealt: 0,
			energySpentThisRun: 0,
			firstTowerDamageWave: 0,
			lastTowerDamageSource: undefined,
			killstreak: { count: 0, best: 0, lastMilestone: 0 },
		};
	}

	/**
	 * Replace the full callback set. Passing an empty object detaches all
	 * callbacks — used on component teardown so a destroyed view's closures
	 * are not retained by the (navigation-persisted) engine.
	 */
	public setCallbacks(opts: {
		onSnapshot?: (snapshot: GameSnapshot) => void;
		onGameOver?: (coins: number, wave: number) => void;
		onMilestone?: (text: string) => void;
		onStateChange?: () => void;
	}): void {
		this.onSnapshot = opts.onSnapshot ?? null;
		this.onGameOver = opts.onGameOver ?? null;
		this.onMilestone = opts.onMilestone ?? null;
		this.onStateChange = opts.onStateChange ?? null;
	}

	public startRun(
		workshopUpgrades: Partial<Record<WorkshopUpgradeId, number>>,
		forgeUpgrades: Partial<Record<UpgradeId, number>>,
		labLevels: Partial<Record<LabId, number>>,
		startingCoins: number,
		unlockedBlueprints: BlueprintId[] = [],
		tier: number = 1,
		challenge: ChallengeId | null = null,
		killsByType: Partial<Record<EnemyType, number>> = {},
		selectedSkin = 'classic'
	): void {
		resetEnemyIdCounter();
		resetProjectileIdCounter();
		this.particles = [];
		this.damageNumbers = [];
		this.shockwaves = [];
		this.deathEffects = [];
		this.nextDeathEffectId = 1;
		this.shakeAmount = 0;
		this.hitStopTimer = 0;
		this.speedMultiplier = 1;
		this.lastWave = 0;
		this.firedMilestones = new Set();

		// Preserve viewport dimensions across restarts so spawn positions
		// and tower placement use the actual canvas size, not the 800px default
		const prevViewWidth = this.state.viewWidth;
		const prevViewHeight = this.state.viewHeight;

		this.state = this.createInitialState();
		this.state.workshopUpgrades = { ...workshopUpgrades } as Record<WorkshopUpgradeId, number>;
		// Seed the run's Field upgrade levels from the permanent Forge levels.
		// In-run Field purchases continue (value AND cost) from these levels.
		this.state.battleUpgrades = seedBattleUpgradesFromForge(forgeUpgrades) as Record<UpgradeId, number>;
		this.state.labLevels = { ...labLevels } as Record<LabId, number>;
		this.state.coins = startingCoins;
		this.state.tier = tier;
		this.state.activeChallenge = challenge;
		this.state.selectedSkin = selectedSkin;

		// Precompute mastery damage bonuses from lifetime kill counts
		this.state.masteryDmgBonus = {};
		for (const type of Object.values(EnemyType)) {
			const bonus = getMasteryBonus(killsByType[type] ?? 0);
			if (bonus > 0) this.state.masteryDmgBonus[type] = bonus;
		}

		this.state.runActive = true;
		this.state.gameOver = false;
		this.state.paused = false;
		this.unlockedFieldBlueprints = [...unlockedBlueprints];
		this.statsDirty = true;

		// Restore viewport dimensions so spawns, tower position, and
		// enemy pathing use the actual canvas size
		if (prevViewWidth != null) this.state.viewWidth = prevViewWidth;
		if (prevViewHeight != null) this.state.viewHeight = prevViewHeight;

		this.state.tower = createTowerState(this.state);

		// Correct tower position to actual viewport center (createTowerState
		// hardcodes VIEW_WIDTH/2 which may not match the live canvas)
		if (this.state.viewWidth != null) {
			this.state.tower.position.x = this.state.viewWidth / 2;
			this.state.tower.position.y = (this.state.viewHeight ?? this.state.viewWidth) / 2;
		}

		this.state.cash = getStartingEnergy(this.state);

		// Glass Tower: 1 HP tower — must be applied after createTowerState
		if (challenge === ChallengeId.GlassTower) {
			this.state.tower.hp = 1;
			this.state.tower.maxHp = 1;
		}

		this.state.wave.betweenWaveTimer = 1.0;
		this.emitImmediateSnapshot();
		this.onStateChange?.();
	}

	public update(dt: number): void {
		// Always check game over — even if inactive, to handle external triggers
		this.checkGameOver();
		if (!this.state.runActive || this.state.gameOver || this.state.paused) return;

		// Hit-stop: briefly freeze the simulation for impact punch. The render
		// loop keeps drawing the frozen frame; we only count down in real time.
		if (this.hitStopTimer > 0) {
			this.hitStopTimer -= dt;
			this.updateShockwaves(dt);
			this.updateDeathEffects(dt);
			this.emitSnapshot(dt);
			return;
		}

		const effectiveDt = Math.min(dt * this.speedMultiplier, GAME_CONFIG.CLAMP_DELTA);
		this.state.elapsedTime += effectiveDt;

		if (this.statsDirty) {
			applyBattleUpgrades(this.state);
			this.statsDirty = false;
		}
		applyRegen(this.state, effectiveDt);
		updateWaveSystem(this.state, effectiveDt);

		// Immediate snapshot when wave changes (fixes UI showing stale wave number)
		if (this.state.wave.currentWave !== this.lastWave) {
			this.lastWave = this.state.wave.currentWave;
			this.emitImmediateSnapshot();
		}

		updateEnemySystem(this.state, effectiveDt);
		const enemyIndex = buildEnemyFrameIndex(this.state.enemies);
		updateTowerTargeting(this.state, effectiveDt, enemyIndex);
		updateProjectileSystem(this.state, effectiveDt, enemyIndex);
		removeDeadEnemies(this.state);

		this.updateParticles(effectiveDt);
		this.updateDamageNumbers(effectiveDt);
		this.updateShockwaves(effectiveDt);
		this.updateShake(effectiveDt);
		this.updateDeathEffects(effectiveDt);

		this.checkGameOver();
		this.checkMilestones();
		this.emitSnapshot(effectiveDt);
	}

	private checkGameOver(): void {
		if (this.state.gameOver && this.onGameOver) {
			const coinsEarned = this.state.coins;
			this.state.totalRuns++;
			this.state.highestWave = Math.max(this.state.highestWave, this.state.wave.currentWave);
			const cb = this.onGameOver;
			this.onGameOver = null;
			cb(coinsEarned, this.state.wave.currentWave);
		}
	}

	private checkMilestones(): void {
		const wave = this.state.wave.currentWave;
		if (this.firedMilestones.has(wave)) return;
		if (MILESTONE_WAVES.has(wave)) {
			this.firedMilestones.add(wave);
			if (this.onMilestone) {
				this.onMilestone(`Wave ${wave} reached!`);
			}
		}
	}

	private emitSnapshot(dt: number): void {
		this.snapshotTimer += dt;
		if (this.snapshotTimer < GAME_CONFIG.UI_SNAPSHOT_INTERVAL / 1000) return;
		this.snapshotTimer = 0;
		this.buildAndEmitSnapshot();
	}

	public emitImmediateSnapshot(): void {
		this.buildAndEmitSnapshot();
	}

	private buildAndEmitSnapshot(): void {
		const t = this.state.tower;
		const w = this.state.wave;
		const boss = this.getActiveBoss();
		const snap: GameSnapshot = {
			wave: w.currentWave,
			towerHp: t.hp,
			towerMaxHp: t.maxHp,
			cash: this.state.cash,
			coins: this.state.coins,
			killCount: this.state.killCount,
			bossesDefeated: this.state.bossesDefeated,
			elapsedTime: this.state.elapsedTime,
			gameOver: this.state.gameOver,
			runActive: this.state.runActive,
			highestWave: this.state.highestWave,
			enemyCount: this.state.enemies.length,
			speed: this.speedMultiplier,
			towerDamage: t.stats.damage,
			towerFireRate: t.stats.fireRate,
			towerRange: t.stats.range,
			towerMultishotChance: t.stats.multishotChance,
			towerMultishotCount: t.stats.multishotCount,
			towerCritChance: t.stats.critChance,
			towerCritMultiplier: t.stats.critMultiplier,
			towerDefensePercent: t.stats.defensePercent,
			towerDefenseAbsolute: t.stats.defenseAbsolute,
			towerRegen: t.stats.regen,
			towerLifesteal: t.stats.lifesteal,
			towerThorns: t.stats.thorns,
			upgradeLevels: this.state.battleUpgrades as unknown as Record<string, number>,
			enemiesInWave: w.enemiesInWave,
			enemiesSpawned: w.enemiesSpawned,
			enemiesKilledThisWave: w.enemiesKilled,
			waveActive: w.waveActive,
			betweenWaveTimer: w.betweenWaveTimer,
			spawnInterval: w.spawnInterval,
			bossActive: !!boss,
			bossHp: boss ? boss.hp : 0,
			bossMaxHp: boss ? boss.maxHp : 0,
		};
		this.lastSnapshot = snap;
		if (this.onSnapshot) this.onSnapshot(snap);
	}

	public getLastSnapshot(): GameSnapshot | null {
		return this.lastSnapshot;
	}

	public buyBattleUpgrade(id: UpgradeId): boolean {
		const currentLevel = this.state.battleUpgrades[id] ?? 0;
		const upgrades = buildBattleUpgradeList();
		const upgrade = upgrades.find(u => u.id === id);
		if (!upgrade) return false;

		// Check blueprint lock
		if (upgrade.requiredBlueprint && !this.unlockedFieldBlueprints.includes(upgrade.requiredBlueprint)) {
			return false;
		}

		const maxLv = upgrade.maxLevel;
		const cost = getBattleUpgradeCost(id, currentLevel);
		if (this.state.cash >= cost && currentLevel < maxLv) {
			this.state.cash -= cost;
			this.state.energySpentThisRun += cost;
			this.state.battleUpgrades[id] = currentLevel + 1;
			this.statsDirty = true;
			applyBattleUpgrades(this.state);
			this.emitImmediateSnapshot();
			this.onStateChange?.();
			return true;
		}
		return false;
	}

	public togglePause(): void {
		this.state.paused = !this.state.paused;
		this.onStateChange?.();
	}

	public isPaused(): boolean {
		return this.state.paused;
	}

	public setSpeed(multiplier: number): void {
		this.speedMultiplier = multiplier === 0 ? 0 : Math.max(0.1, Math.min(10, multiplier));
		this.state.paused = multiplier === 0;
		this.emitImmediateSnapshot();
		this.onStateChange?.();
	}

	/** Freeze the simulation for a few ms to punch up impactful kills. */
	public triggerHitStop(seconds: number): void {
		if (this.state.settings.reducedMotion) return;
		this.hitStopTimer = Math.max(this.hitStopTimer, seconds);
	}

	/** Spawn an expanding ring burst (tied to the particles setting). */
	public addShockwave(x: number, y: number, color: number, maxRadius: number, duration: number, width: number = 2): void {
		if (!this.state.settings.particles || this.state.settings.reducedMotion) return;
		this.shockwaves.push({ x, y, color, radius: 0, maxRadius, life: duration, maxLife: duration, width });
	}

	private updateShockwaves(dt: number): void {
		for (let i = this.shockwaves.length - 1; i >= 0; i--) {
			const s = this.shockwaves[i]!;
			s.life -= dt;
			const t = Math.min(1, 1 - s.life / s.maxLife);
			// Ease-out expansion
			s.radius = s.maxRadius * (1 - (1 - t) * (1 - t));
			if (s.life <= 0) {
				const li = this.shockwaves.length - 1;
				if (i !== li) this.shockwaves[i] = this.shockwaves[li]!;
				this.shockwaves.pop();
			}
		}
	}

	/** The currently-alive boss enemy, if any (for the boss health bar). */
	public getActiveBoss(): Enemy | null {
		for (const e of this.state.enemies) {
			if (e.alive && e.isBoss) return e;
		}
		return null;
	}

	public addShake(amount: number): void {
		if (this.state.settings.screenShake) {
			this.shakeAmount = Math.min(GAME_CONFIG.MAX_SCREEN_SHAKE, this.shakeAmount + amount);
		}
	}

	private updateShake(dt: number): void {
		if (this.shakeAmount > 0) {
			this.shakeAmount *= GAME_CONFIG.SHAKE_DECAY;
			if (this.shakeAmount < GAME_CONFIG.MIN_SCREEN_SHAKE) {
				this.shakeAmount = 0;
			}
		}
	}

	public addParticles(x: number, y: number, color: number, count: number, speed: number = 80): void {
		if (!this.state.settings.particles) return;
		const maxCount = this.state.settings.lowEffectsMode ? Math.min(count, 5) : Math.min(count, GAME_CONFIG.MAX_PARTICLES - this.particles.length);
		for (let i = 0; i < maxCount; i++) {
			const angle = Math.random() * Math.PI * 2;
			const spd = speed * (0.5 + Math.random());
			this.particles.push({
				x,
				y,
				vx: Math.cos(angle) * spd,
				vy: Math.sin(angle) * spd,
				life: GAME_CONFIG.PARTICLE_LIFETIME * (0.5 + Math.random() * 0.5),
				maxLife: GAME_CONFIG.PARTICLE_LIFETIME,
				color,
				size: 2 + Math.random() * 3,
				alpha: 1,
			});
		}
	}

	public addDamageNumber(x: number, y: number, text: string, color: number, kind?: DamageNumberKind, aggKey?: number, aggValue?: number): void {
		if (!this.state.settings.damageNumbers) return;
		const resolvedKind: DamageNumberKind = kind ?? 'damage';

		// Aggregation: when a basic-damage number for this enemy is still alive,
		// fold the new hit into it (sum + refresh + reposition) instead of pushing
		// another. At slow fire the prior number has already expired, so this only
		// kicks in under rapid fire — exactly the high-density spam it targets.
		if (aggKey !== undefined && aggValue !== undefined && resolvedKind === 'damage') {
			const existing = this.dmgAggIndex.get(aggKey);
			if (existing && existing.life > 0 && existing.kind === 'damage') {
				existing.aggValue = (existing.aggValue ?? 0) + aggValue;
				existing.text = formatFloatingText('damage', existing.aggValue);
				existing.life = existing.maxLife;
				existing.alpha = 1;
				existing.x = x;
				existing.y = y;
				existing.color = color;
				return;
			}
		}

		if (this.damageNumbers.length >= GAME_CONFIG.MAX_DAMAGE_NUMBERS) {
			this.damageNumbers.shift();
		}
		// Lazy import avoided — pulling the style resolver up front would create a
		// renderer→engine dependency. Mirror the ascent table here instead.
		const ascent = DAMAGE_ASCENT[resolvedKind] ?? 30;
		const dn: DamageNumber = {
			x,
			y,
			text,
			color,
			life: GAME_CONFIG.DAMAGE_NUMBER_LIFETIME,
			maxLife: GAME_CONFIG.DAMAGE_NUMBER_LIFETIME,
			alpha: 1,
			kind: resolvedKind,
			drift: ascent,
		};
		this.damageNumbers.push(dn);
		// Register as the merge target for subsequent rapid hits on this enemy.
		if (aggKey !== undefined && resolvedKind === 'damage') {
			dn.aggValue = aggValue ?? 0;
			this.dmgAggIndex.set(aggKey, dn);
		}
	}

	/**
	 * Spawn a render-only corpse proxy at the enemy's last position. The
	 * proxy lives in `deathEffects` (separate from `state.enemies`) so it
	 * never affects targeting, collision, or wave completion.
	 */
	public addDeathEffect(enemy: Enemy): void {
		if (this.deathEffects.length >= GAME_CONFIG.MAX_DEATH_FX) {
			// Drop the oldest so new deaths always get a slot — FIFO queue.
			this.deathEffects.shift();
		}
		const reduced = this.state.settings.reducedMotion || this.state.settings.lowEffectsMode;
		const id = enemy.id;
		this.deathEffects.push({
			id: this.nextDeathEffectId++,
			x: enemy.position.x,
			y: enemy.position.y,
			color: enemy.isBoss ? GAME_CONFIG.NEON_PINK : enemy.color,
			size: enemy.size,
			shape: enemy.shape,
			isBoss: enemy.isBoss,
			isShiny: enemy.isShiny,
			rotation: (id % 7) * 0.9,
			spin: (id % 2 === 0 ? 1 : -1) * (enemy.isBoss ? 1.2 : 3.5),
			age: 0,
			life: reduced ? GAME_CONFIG.DEATH_FX_LIFETIME_REDUCED : GAME_CONFIG.DEATH_FX_LIFETIME,
		});
	}

	private updateDeathEffects(dt: number): void {
		for (let i = this.deathEffects.length - 1; i >= 0; i--) {
			const d = this.deathEffects[i]!;
			d.age += dt;
			d.rotation += d.spin * dt;
			if (d.age >= d.life) {
				const li = this.deathEffects.length - 1;
				if (i !== li) this.deathEffects[i] = this.deathEffects[li]!;
				this.deathEffects.pop();
			}
		}
	}

	private updateParticles(dt: number): void {
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const p = this.particles[i]!;
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			p.life -= dt;
			p.alpha = Math.max(0, p.life / p.maxLife);
			if (p.life <= 0) {
				const li = this.particles.length - 1;
				if (i !== li) this.particles[i] = this.particles[li]!;
				this.particles.pop();
			}
		}
	}

	private updateDamageNumbers(dt: number): void {
		for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
			const n = this.damageNumbers[i]!;
			// Per-kind ascent so crits lift triumphantly, alloy drifts gently,
			// and chain text holds position (drift = 0).
			n.y -= (n.drift ?? 30) * dt;
			n.life -= dt;
			n.alpha = Math.max(0, n.life / n.maxLife);
			if (n.life <= 0) {
				const li = this.damageNumbers.length - 1;
				if (i !== li) this.damageNumbers[i] = this.damageNumbers[li]!;
				this.damageNumbers.pop();
			}
		}
	}

	public cleanup(): void {
		this.onSnapshot = null;
		this.onGameOver = null;
		this.onMilestone = null;
		this.onStateChange = null;
		this.onKillstreakMilestoneHandler = null;
		this.state.enemies = [];
		this.state.projectiles = [];
		this.particles = [];
		this.damageNumbers = [];
		this.dmgAggIndex.clear();
		this.shockwaves = [];
		this.deathEffects = [];
		this.hitStopTimer = 0;
		this.firedMilestones = new Set();
		this.speedMultiplier = 1;
	}
}
