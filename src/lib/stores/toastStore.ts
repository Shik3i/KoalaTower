import { writable, type Readable } from 'svelte/store';

export type ToastType = 'info' | 'success' | 'warning' | 'error' | 'milestone';

export interface Toast {
	id: number;
	msg: string;
	type: ToastType;
}

export interface ToastController extends Readable<Toast[]> {
	/** Show a toast; returns its id. Visible time scales with message length. */
	push(msg: string, type?: ToastType, duration?: number): number;
	/** Remove a toast early. */
	dismiss(id: number): void;
	/** Remove all toasts and cancel pending timers. */
	clear(): void;
}

/** Lower/upper bounds for the auto-computed visible duration (ms). */
const MIN_VISIBLE = 1800;
const MAX_VISIBLE = 7000;

/**
 * Visible duration for a message: at least `base`, longer for long strings so
 * wordy flavor text stays readable, capped so it never lingers forever.
 */
function visibleDuration(msg: string, base: number): number {
	return Math.min(MAX_VISIBLE, Math.max(base, MIN_VISIBLE, msg.length * 55));
}

/**
 * Create an isolated toast controller. Each surface (play, hub, global layout)
 * owns its own instance so lists never bleed across mount points, while the
 * queue/timeout logic and markup live in one place.
 */
export function createToastStore(baseDuration = 2200): ToastController {
	const { subscribe, update } = writable<Toast[]>([]);
	let nextId = 0;
	const timers = new Map<number, ReturnType<typeof setTimeout>>();

	function dismiss(id: number): void {
		const timer = timers.get(id);
		if (timer !== undefined) {
			clearTimeout(timer);
			timers.delete(id);
		}
		update(list => list.filter(t => t.id !== id));
	}

	function push(msg: string, type: ToastType = 'info', duration = baseDuration): number {
		const id = ++nextId;
		update(list => [...list, { id, msg, type }]);
		if (typeof setTimeout !== 'undefined') {
			timers.set(id, setTimeout(() => dismiss(id), visibleDuration(msg, duration)));
		}
		return id;
	}

	function clear(): void {
		for (const timer of timers.values()) clearTimeout(timer);
		timers.clear();
		update(() => []);
	}

	return { subscribe, push, dismiss, clear };
}
