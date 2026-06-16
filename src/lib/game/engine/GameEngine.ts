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
import { calculateRunCoins, getStartingCash } from '../systems/economySystem';
import { resetEnemyIdCounter } from '../balance/enemies';
import { getBattleUpgradeCost } from '../balance/battleUpgrades';

export class GameEngine {
	public state: GameState;
	public particles: Particle[] = [];
	public damageNumbers: DamageNumber[] = [];
	public shakeAmount: number = 0;

	private snapshotTimer: number = 0;
	private lastSnapshot: GameSnapshot | null = null;
	private onSnapshot: ((snapshot: GameSnapshot) => void) | null = null;
	private onGameOver: ((coins: number, wave: number) => void) | null = null;
	private onMilestone: ((text: string) => void) | null = null;

	constructor() {
		this.state = this.createInitialState();
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
			paused: false,
			gameOver: false,
			runActive: false,
			elapsedTime: 0,
			waveStartTime: 0,
			killCount: 0,
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
	}): void {
		if (opts.onSnapshot) this.onSnapshot = opts.onSnapshot;
		if (opts.onGameOver) this.onGameOver = opts.onGameOver;
		if (opts.onMilestone) this.onMilestone = opts.onMilestone;
	}

	public startRun(workshopUpgrades: Partial<Record<WorkshopUpgradeId, number>>, startingCoins: number): void {
		resetEnemyIdCounter();
		resetProjectileIdCounter();
		this.particles = [];
		this.damageNumbers = [];
		this.shakeAmount = 0;

		this.state = this.createInitialState();
		this.state.workshopUpgrades = { ...workshopUpgrades } as Record<WorkshopUpgradeId, number>;
		this.state.coins = startingCoins;
		this.state.runActive = true;
		this.state.gameOver = false;
		this.state.paused = false;

		this.state.tower = createTowerState(this.state);
		this.state.cash = getStartingCash(this.state);

		this.state.wave.betweenWaveTimer = 1.0;
	}

	public update(dt: number): void {
		if (!this.state.runActive || this.state.gameOver || this.state.paused) return;

		const clampedDt = Math.min(dt, GAME_CONFIG.CLAMP_DELTA);
		this.state.elapsedTime += clampedDt;

		applyBattleUpgrades(this.state);
		updateWaveSystem(this.state, clampedDt);
		updateEnemySystem(this.state, clampedDt);
		updateTowerTargeting(this.state, clampedDt);
		updateProjectileSystem(this.state, clampedDt);
		removeDeadEnemies(this.state);

		this.updateParticles(clampedDt);
		this.updateDamageNumbers(clampedDt);
		this.updateShake(clampedDt);

		this.checkGameOver();
		this.checkMilestones();
		this.emitSnapshot(clampedDt);
	}

	private checkGameOver(): void {
		if (this.state.gameOver && this.onGameOver) {
			const coins = calculateRunCoins(this.state);
			this.state.coins += coins;
			this.state.totalRuns++;
			this.state.highestWave = Math.max(this.state.highestWave, this.state.wave.currentWave);
			this.onGameOver(coins, this.state.wave.currentWave);
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

		const snap: GameSnapshot = {
			wave: this.state.wave.currentWave,
			towerHp: this.state.tower.hp,
			towerMaxHp: this.state.tower.maxHp,
			cash: this.state.cash,
			coins: this.state.coins,
			killCount: this.state.killCount,
			elapsedTime: this.state.elapsedTime,
			gameOver: this.state.gameOver,
			runActive: this.state.runActive,
			highestWave: this.state.highestWave,
			enemyCount: this.state.enemies.length,
		};
		this.lastSnapshot = snap;
		if (this.onSnapshot) this.onSnapshot(snap);
	}

	public getLastSnapshot(): GameSnapshot | null {
		return this.lastSnapshot;
	}

	public buyBattleUpgrade(id: UpgradeId): boolean {
		const currentLevel = this.state.battleUpgrades[id] ?? 0;
		const cost = getBattleUpgradeCost(id, currentLevel);
		if (this.state.cash >= cost && currentLevel < 50) {
			this.state.cash -= cost;
			this.state.battleUpgrades[id] = currentLevel + 1;
			applyBattleUpgrades(this.state);
			return true;
		}
		return false;
	}

	public togglePause(): void {
		this.state.paused = !this.state.paused;
	}

	public isPaused(): boolean {
		return this.state.paused;
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
	}
}
