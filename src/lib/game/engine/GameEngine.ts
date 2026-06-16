import { GAME_CONFIG, getDefaultTowerStats } from './gameConfig';
import type {
	Enemy,
	Particle,
	DamageNumber,
	GameSettings,
	GameSnapshot,
	GameState,
	UpgradeId,
	WorkshopUpgradeId,
} from './gameTypes';
import { EnemyType, DEFAULT_SETTINGS } from './gameTypes';
import { createTowerState, applyBattleUpgrades } from '../systems/towerSystem';
import { updateEnemySystem, updateProjectileSystem, updateTowerTargeting, resetProjectileIdCounter } from '../systems/enemySystem';
import { updateWaveSystem, removeDeadEnemies } from '../systems/waveSystem';
import { getStartingGold } from '../systems/economySystem';
import { resetEnemyIdCounter } from '../balance/enemies';
import { getBattleUpgradeCost, BATTLE_UPGRADES } from '../balance/battleUpgrades';
import { setFeedbackHooks } from '../systems/enemySystem';

export class GameEngine {
	public state: GameState;
	public particles: Particle[] = [];
	public damageNumbers: DamageNumber[] = [];
	public shakeAmount: number = 0;
	public speedMultiplier: number = 1;

	private snapshotTimer: number = 0;
	private lastWave: number = 0;
	private lastSnapshot: GameSnapshot | null = null;
	private onSnapshot: ((snapshot: GameSnapshot) => void) | null = null;
	private onGameOver: ((coins: number, wave: number) => void) | null = null;
	private onMilestone: ((text: string) => void) | null = null;
	private onStateChange: (() => void) | null = null;

	constructor() {
		this.state = this.createInitialState();
		setFeedbackHooks(
			(x, y, text, color) => this.addDamageNumber(x, y, text, color),
			(x, y, color, count, speed) => this.addParticles(x, y, color, count, speed),
			(amount) => this.addShake(amount),
		);
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
			totalDamageDealt: 0,
			highestWave: 0,
			totalRuns: 0,
			settings: { ...DEFAULT_SETTINGS },
		};
	}

	public setCallbacks(opts: {
		onSnapshot?: (snapshot: GameSnapshot) => void;
		onGameOver?: (coins: number, wave: number) => void;
		onMilestone?: (text: string) => void;
		onStateChange?: () => void;
	}): void {
		if (opts.onSnapshot) this.onSnapshot = opts.onSnapshot;
		if (opts.onGameOver) this.onGameOver = opts.onGameOver;
		if (opts.onMilestone) this.onMilestone = opts.onMilestone;
		if (opts.onStateChange) this.onStateChange = opts.onStateChange;
	}

	public startRun(workshopUpgrades: Partial<Record<WorkshopUpgradeId, number>>, labLevels: Partial<Record<import('./gameTypes').LabId, number>>, startingCoins: number): void {
		resetEnemyIdCounter();
		resetProjectileIdCounter();
		this.particles = [];
		this.damageNumbers = [];
		this.shakeAmount = 0;
		this.speedMultiplier = 1;
		this.lastWave = 0;

		this.state = this.createInitialState();
		this.state.workshopUpgrades = { ...workshopUpgrades } as Record<WorkshopUpgradeId, number>;
		this.state.labLevels = { ...labLevels } as Record<import('./gameTypes').LabId, number>;
		this.state.coins = startingCoins;
		this.state.runActive = true;
		this.state.gameOver = false;
		this.state.paused = false;

		this.state.tower = createTowerState(this.state);
		this.state.cash = getStartingGold(this.state);

		this.state.wave.betweenWaveTimer = 1.0;
		this.emitImmediateSnapshot();
		this.onStateChange?.();
	}

	public update(dt: number): void {
		if (!this.state.runActive || this.state.gameOver || this.state.paused) return;

		const effectiveDt = Math.min(dt * this.speedMultiplier, GAME_CONFIG.CLAMP_DELTA);
		this.state.elapsedTime += effectiveDt;

		applyBattleUpgrades(this.state);
		updateWaveSystem(this.state, effectiveDt);

		// Immediate snapshot when wave changes (fixes UI showing stale wave number)
		if (this.state.wave.currentWave !== this.lastWave) {
			this.lastWave = this.state.wave.currentWave;
			this.emitImmediateSnapshot();
		}

		updateEnemySystem(this.state, effectiveDt);
		updateTowerTargeting(this.state, effectiveDt);
		updateProjectileSystem(this.state, effectiveDt);
		removeDeadEnemies(this.state);

		this.updateParticles(effectiveDt);
		this.updateDamageNumbers(effectiveDt);
		this.updateShake(effectiveDt);

		this.checkGameOver();
		this.checkMilestones();
		this.emitSnapshot(effectiveDt);
	}

	private checkGameOver(): void {
		if (this.state.gameOver && this.onGameOver) {
			// Coins are earned per kill during the run — no end-of-run bonus needed.
			const coinsEarned = this.state.coins; // KoalaCoins accumulated from kills
			this.state.totalRuns++;
			this.state.highestWave = Math.max(this.state.highestWave, this.state.wave.currentWave);
			this.onGameOver(coinsEarned, this.state.wave.currentWave);
		}
	}

	private checkMilestones(): void {
		const wave = this.state.wave.currentWave;
		if (wave === 10 || wave === 25 || wave === 50 || wave === 100 || wave === 250 || wave === 500) {
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
			towerMultishot: t.stats.multishot,
			towerCritChance: t.stats.critChance,
			upgradeLevels: { ...this.state.battleUpgrades as Record<string, number> },
			enemiesInWave: w.enemiesInWave,
			enemiesSpawned: w.enemiesSpawned,
			enemiesKilledThisWave: w.enemiesKilled,
			waveActive: w.waveActive,
			betweenWaveTimer: w.betweenWaveTimer,
			spawnInterval: w.spawnInterval,
		};
		this.lastSnapshot = snap;
		if (this.onSnapshot) this.onSnapshot(snap);
	}

	public getLastSnapshot(): GameSnapshot | null {
		return this.lastSnapshot;
	}

	public buyBattleUpgrade(id: UpgradeId): boolean {
		const currentLevel = this.state.battleUpgrades[id] ?? 0;
		const upgrade = BATTLE_UPGRADES.find(u => u.id === id);
		if (!upgrade) return false;
		const maxLv = upgrade.maxLevel;
		const cost = getBattleUpgradeCost(id, currentLevel);
		if (this.state.cash >= cost && currentLevel < maxLv) {
			this.state.cash -= cost;
			this.state.battleUpgrades[id] = currentLevel + 1;
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
		this.speedMultiplier = Math.max(0.1, Math.min(10, multiplier));
		this.state.paused = multiplier === 0;
		this.emitImmediateSnapshot();
		this.onStateChange?.();
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
		if (!this.state.settings.particles || this.state.settings.lowEffectsMode) return;
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

	public addDamageNumber(x: number, y: number, text: string, color: number): void {
		if (!this.state.settings.damageNumbers) return;
		if (this.damageNumbers.length >= GAME_CONFIG.MAX_DAMAGE_NUMBERS) {
			this.damageNumbers.shift();
		}
		this.damageNumbers.push({
			x,
			y,
			text,
			color,
			life: GAME_CONFIG.DAMAGE_NUMBER_LIFETIME,
			maxLife: GAME_CONFIG.DAMAGE_NUMBER_LIFETIME,
			alpha: 1,
		});
	}

	private updateParticles(dt: number): void {
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const p = this.particles[i]!;
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			p.life -= dt;
			p.alpha = Math.max(0, p.life / p.maxLife);
			if (p.life <= 0) {
				this.particles.splice(i, 1);
			}
		}
	}

	private updateDamageNumbers(dt: number): void {
		for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
			const n = this.damageNumbers[i]!;
			n.y -= 30 * dt;
			n.life -= dt;
			n.alpha = Math.max(0, n.life / n.maxLife);
			if (n.life <= 0) {
				this.damageNumbers.splice(i, 1);
			}
		}
	}

	public cleanup(): void {
		this.onSnapshot = null;
		this.onGameOver = null;
		this.onMilestone = null;
		this.onStateChange = null;
	}
}
