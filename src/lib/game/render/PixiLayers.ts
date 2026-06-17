import { Container } from 'pixi.js';

export interface GameLayers {
	bg: Container;
	range: Container;
	enemy: Container;
	projectile: Container;
	tower: Container;
	particle: Container;
	dmgText: Container;
	waveAnnounce: Container;
}

export function createLayers(): GameLayers {
	const bg = new Container();
	const range = new Container();
	const enemy = new Container();
	const projectile = new Container();
	const tower = new Container();
	const particle = new Container();
	const dmgText = new Container();
	const waveAnnounce = new Container();

	return { bg, range, enemy, projectile, tower, particle, dmgText, waveAnnounce };
}
