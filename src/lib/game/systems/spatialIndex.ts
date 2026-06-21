import type { Enemy } from '../engine/gameTypes';

export interface EnemyFrameIndex {
	byId: Map<number, Enemy>;
	grid: Quadtree;
}

export interface Boundary {
	x: number;      // top-left x
	y: number;      // top-left y
	width: number;
	height: number;
}

class QuadtreeNodePool {
	private pool: Quadtree[] = [];
	private index = 0;

	reset(): void {
		this.index = 0;
	}

	get(boundary: Boundary, capacity: number): Quadtree {
		if (this.index < this.pool.length) {
			const node = this.pool[this.index]!;
			node.init(boundary, capacity);
			this.index++;
			return node;
		} else {
			const node = new Quadtree(boundary, capacity);
			this.pool.push(node);
			this.index++;
			return node;
		}
	}
}

const qtPool = new QuadtreeNodePool();

export class Quadtree {
	public boundary: Boundary;
	public capacity: number;
	private enemies: Enemy[] = [];
	private divided = false;

	// Children
	private nw?: Quadtree;
	private ne?: Quadtree;
	private sw?: Quadtree;
	private se?: Quadtree;

	constructor(boundary: Boundary, capacity = 8) {
		this.boundary = boundary;
		this.capacity = capacity;
	}

	init(boundary: Boundary, capacity: number): void {
		this.boundary = boundary;
		this.capacity = capacity;
		this.enemies.length = 0;
		this.divided = false;
	}

	insert(enemy: Enemy): boolean {
		if (!enemy.alive) return false;
		if (!this.contains(enemy.position.x, enemy.position.y)) {
			return false;
		}

		if (this.enemies.length < this.capacity && !this.divided) {
			this.enemies.push(enemy);
			return true;
		}

		if (!this.divided) {
			this.subdivide();
		}

		return (
			this.nw!.insert(enemy) ||
			this.ne!.insert(enemy) ||
			this.sw!.insert(enemy) ||
			this.se!.insert(enemy)
		);
	}

	private contains(x: number, y: number): boolean {
		return (
			x >= this.boundary.x &&
			x <= this.boundary.x + this.boundary.width &&
			y >= this.boundary.y &&
			y <= this.boundary.y + this.boundary.height
		);
	}

	private subdivide(): void {
		const { x, y, width, height } = this.boundary;
		const halfW = width / 2;
		const halfH = height / 2;

		this.nw = qtPool.get({ x, y, width: halfW, height: halfH }, this.capacity);
		this.ne = qtPool.get({ x: x + halfW, y, width: halfW, height: halfH }, this.capacity);
		this.sw = qtPool.get({ x, y: y + halfH, width: halfW, height: halfH }, this.capacity);
		this.se = qtPool.get({ x: x + halfW, y: y + halfH, width: halfW, height: halfH }, this.capacity);

		this.divided = true;

		for (let i = 0; i < this.enemies.length; i++) {
			const e = this.enemies[i]!;
			const success = (
				this.nw.insert(e) ||
				this.ne.insert(e) ||
				this.sw.insert(e) ||
				this.se.insert(e)
			);
		}
		this.enemies.length = 0;
	}

	queryCircle(x: number, y: number, radius: number): Enemy[] {
		const results: Enemy[] = [];
		this.queryCircleRecursive(x, y, radius, radius * radius, results);
		return results;
	}

	private queryCircleRecursive(x: number, y: number, radius: number, radiusSq: number, results: Enemy[]): void {
		if (!this.intersectsCircle(x, y, radius)) {
			return;
		}

		if (this.divided) {
			this.nw!.queryCircleRecursive(x, y, radius, radiusSq, results);
			this.ne!.queryCircleRecursive(x, y, radius, radiusSq, results);
			this.sw!.queryCircleRecursive(x, y, radius, radiusSq, results);
			this.se!.queryCircleRecursive(x, y, radius, radiusSq, results);
		} else {
			for (let i = 0; i < this.enemies.length; i++) {
				const enemy = this.enemies[i]!;
				const dx = enemy.position.x - x;
				const dy = enemy.position.y - y;
				if (dx * dx + dy * dy <= radiusSq) {
					results.push(enemy);
				}
			}
		}
	}

	private intersectsCircle(x: number, y: number, radius: number): boolean {
		const closestX = Math.max(this.boundary.x, Math.min(x, this.boundary.x + this.boundary.width));
		const closestY = Math.max(this.boundary.y, Math.min(y, this.boundary.y + this.boundary.height));

		const dx = x - closestX;
		const dy = y - closestY;
		return dx * dx + dy * dy <= radius * radius;
	}
}

export function buildEnemyFrameIndex(enemies: Enemy[], capacity = 8): EnemyFrameIndex {
	qtPool.reset();
	const byId = new Map<number, Enemy>();

	let minX = 0;
	let maxX = 800;
	let minY = 0;
	let maxY = 800;

	for (let i = 0; i < enemies.length; i++) {
		const enemy = enemies[i]!;
		if (!enemy.alive) continue;
		byId.set(enemy.id, enemy);

		if (enemy.position.x < minX) minX = enemy.position.x;
		if (enemy.position.x > maxX) maxX = enemy.position.x;
		if (enemy.position.y < minY) minY = enemy.position.y;
		if (enemy.position.y > maxY) maxY = enemy.position.y;
	}

	minX -= 100;
	minY -= 100;
	const width = (maxX - minX) + 200;
	const height = (maxY - minY) + 200;

	const boundary: Boundary = { x: minX, y: minY, width, height };
	const grid = qtPool.get(boundary, capacity);

	for (let i = 0; i < enemies.length; i++) {
		const enemy = enemies[i]!;
		if (enemy.alive) {
			grid.insert(enemy);
		}
	}

	return { byId, grid };
}
