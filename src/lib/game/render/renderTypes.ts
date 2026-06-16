import type { Enemy, GameSnapshot, Particle, DamageNumber, GameState } from '../engine/gameTypes';

export interface RenderState {
	enemies: Enemy[];
	particles: Particle[];
	damageNumbers: DamageNumber[];
	towerHp: number;
	towerMaxHp: number;
	wave: number;
	shakeAmount: number;
	settings: {
		reducedMotion: boolean;
		particles: boolean;
		damageNumbers: boolean;
		lowEffectsMode: boolean;
	};
}
