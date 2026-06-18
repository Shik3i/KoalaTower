/**
 * notificationStore.ts — session-only notification history ("inbox").
 *
 * Toasts vanish; idle players miss them. This keeps a capped, in-memory log of
 * the important events so a returning player can catch up. It is deliberately
 * NOT persisted — it resets each session, no save/database involved.
 *
 * Combat micro-events (individual kills, damage) must NOT be logged here — only
 * milestones and state changes. Callers decide what is important enough.
 */
import { writable, derived, type Readable } from 'svelte/store';

export type NotificationKind =
	| 'achievement'
	| 'bestWave'
	| 'frontUnlock'
	| 'blackMarket'
	| 'shipment'
	| 'pickup'
	| 'research'
	| 'boss'
	| 'warning'
	| 'info';

export interface AppNotification {
	id: number;
	kind: NotificationKind;
	title: string;
	detail?: string;
	icon: string;
	time: number;
	read: boolean;
}

/** Newest-first cap. Older entries fall off the end. */
export const NOTIFICATION_CAP = 50;

/** Default emoji per kind so callers usually don't have to pass one. */
const KIND_ICON: Record<NotificationKind, string> = {
	achievement: '🏆',
	bestWave: '📈',
	frontUnlock: '🌍',
	blackMarket: '◈',
	shipment: '📦',
	pickup: '◈',
	research: '🔬',
	boss: '☠',
	warning: '⚠',
	info: '🛰️',
};

export interface NotifyInput {
	kind: NotificationKind;
	title: string;
	detail?: string;
	icon?: string;
}

export interface NotificationController extends Readable<AppNotification[]> {
	/** Append an event. Returns its id. Caps the list at NOTIFICATION_CAP. */
	notify(input: NotifyInput): number;
	/** Mark every entry as read. */
	markAllRead(): void;
	/** Remove all entries. */
	clear(): void;
	/** Number of unread entries. */
	readonly unread: Readable<number>;
}

export function createNotificationStore(): NotificationController {
	const { subscribe, update } = writable<AppNotification[]>([]);
	let nextId = 0;

	function notify(input: NotifyInput): number {
		const id = ++nextId;
		const entry: AppNotification = {
			id,
			kind: input.kind,
			title: input.title,
			detail: input.detail,
			icon: input.icon ?? KIND_ICON[input.kind],
			time: Date.now(),
			read: false,
		};
		update((list) => [entry, ...list].slice(0, NOTIFICATION_CAP));
		return id;
	}

	function markAllRead(): void {
		update((list) => list.map((n) => (n.read ? n : { ...n, read: true })));
	}

	function clear(): void {
		update(() => []);
	}

	const unread = derived({ subscribe }, ($list) => $list.reduce((acc, n) => acc + (n.read ? 0 : 1), 0));

	return { subscribe, notify, markAllRead, clear, unread };
}

/** App-wide singleton — one inbox shared across Hub and Play. */
export const notifications = createNotificationStore();
