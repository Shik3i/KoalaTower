import { writable } from 'svelte/store';
import type { GameEngine } from '$lib/game/engine/GameEngine';

/** Holds the active GameEngine instance so it persists across navigations. */
export const engineStore = writable<GameEngine | null>(null);
