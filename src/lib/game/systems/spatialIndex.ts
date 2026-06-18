import type { Enemy } from '../engine/gameTypes';

export interface EnemyFrameIndex {
	byId: Map<number, Enemy>;
	grid: SpatialGrid;
}

export class SpatialGrid {
	private readonly cellSize: number;
	private readonly cells = new Map<string, Enemy[]>();

	constructor(cellSize = 96) {
		this.cellSize = cellSize;
	}

	clear(): void {
		this.cells.clear();
	}

	insert(enemy: Enemy): void {
		if (!enemy.alive) return;
		const key = this.keyFor(enemy.position.x, enemy.position.y);
		let bucket = this.cells.get(key);
		if (!bucket) {
			bucket = [];
			this.cells.set(key, bucket);
		}
		bucket.push(enemy);
	}

	queryCircle(x: number, y: number, radius: number): Enemy[] {
		const result: Enemy[] = [];
		const minX = Math.floor((x - radius) / this.cellSize);
		const maxX = Math.floor((x + radius) / this.cellSize);
		const minY = Math.floor((y - radius) / this.cellSize);
		const maxY = Math.floor((y + radius) / this.cellSize);
		const radiusSq = radius * radius;

		for (let cy = minY; cy <= maxY; cy++) {
			for (let cx = minX; cx <= maxX; cx++) {
				const bucket = this.cells.get(`${cx},${cy}`);
				if (!bucket) continue;
				for (const enemy of bucket) {
					const dx = enemy.position.x - x;
					const dy = enemy.position.y - y;
					if (dx * dx + dy * dy <= radiusSq) result.push(enemy);
				}
			}
		}

		return result;
	}

	private keyFor(x: number, y: number): string {
		return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`;
	}
}

export function buildEnemyFrameIndex(enemies: Enemy[], cellSize = 96): EnemyFrameIndex {
	const byId = new Map<number, Enemy>();
	const grid = new SpatialGrid(cellSize);

	for (const enemy of enemies) {
		if (!enemy.alive) continue;
		byId.set(enemy.id, enemy);
		grid.insert(enemy);
	}

	return { byId, grid };
}
