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

/** Maximum number of toasts shown simultaneously. Extras are queued. */
const MAX_VISIBLE_TOASTS = 3;

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
 *
 * At most MAX_VISIBLE_TOASTS are shown at once; excess are queued and shown
 * as earlier toasts expire.
 */
export function createToastStore(baseDuration = 2200): ToastController {
	const { subscribe, update } = writable<Toast[]>([]);
	let nextId = 0;
	const timers = new Map<number, ReturnType<typeof setTimeout>>();
	const queue: Array<{ id: number; msg: string; type: ToastType; duration: number }> = [];

	function scheduleTimer(id: number, msg: string, duration: number): void {
		if (typeof setTimeout !== 'undefined') {
			timers.set(id, setTimeout(() => dismiss(id), visibleDuration(msg, duration)));
		}
	}

	function flush(): void {
		// Promote queued toasts if we have room
		update(list => {
			while (list.length < MAX_VISIBLE_TOASTS && queue.length > 0) {
				const next = queue.shift()!;
				list = [...list, { id: next.id, msg: next.msg, type: next.type }];
				scheduleTimer(next.id, next.msg, next.duration);
			}
			return list;
		});
	}

	function dismiss(id: number): void {
		const timer = timers.get(id);
		if (timer !== undefined) {
			clearTimeout(timer);
			timers.delete(id);
		}
		update(list => list.filter(t => t.id !== id));
		flush();
	}

	function push(msg: string, type: ToastType = 'info', duration = baseDuration): number {
		const id = ++nextId;
		update(list => {
			if (list.length < MAX_VISIBLE_TOASTS) {
				scheduleTimer(id, msg, duration);
				return [...list, { id, msg, type }];
			}
			// Queue the overflow — it will be shown when a slot opens.
			queue.push({ id, msg, type, duration });
			return list;
		});
		return id;
	}

	function clear(): void {
		for (const timer of timers.values()) clearTimeout(timer);
		timers.clear();
		queue.length = 0;
		update(() => []);
	}

	return { subscribe, push, dismiss, clear };
}
