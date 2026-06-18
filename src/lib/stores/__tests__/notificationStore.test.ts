import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { createNotificationStore, NOTIFICATION_CAP } from '../notificationStore';

describe('notificationStore', () => {
	it('adds an item, newest first, unread by default', () => {
		const s = createNotificationStore();
		s.notify({ kind: 'research', title: 'Research complete' });
		s.notify({ kind: 'bestWave', title: 'New best wave' });
		const list = get(s);
		expect(list).toHaveLength(2);
		expect(list[0]!.title).toBe('New best wave'); // newest first
		expect(list[0]!.read).toBe(false);
	});

	it('supplies a default icon per kind but lets callers override', () => {
		const s = createNotificationStore();
		s.notify({ kind: 'boss', title: 'Boss sighted' });
		s.notify({ kind: 'info', title: 'Custom', icon: '✨' });
		const list = get(s);
		expect(list[1]!.icon).toBe('☠');
		expect(list[0]!.icon).toBe('✨');
	});

	it('caps the history length at NOTIFICATION_CAP', () => {
		const s = createNotificationStore();
		for (let i = 0; i < NOTIFICATION_CAP + 25; i++) {
			s.notify({ kind: 'info', title: `event ${i}` });
		}
		const list = get(s);
		expect(list).toHaveLength(NOTIFICATION_CAP);
		// The newest event survives; the oldest fell off.
		expect(list[0]!.title).toBe(`event ${NOTIFICATION_CAP + 24}`);
	});

	it('tracks unread count and markAllRead clears it', () => {
		const s = createNotificationStore();
		s.notify({ kind: 'info', title: 'a' });
		s.notify({ kind: 'info', title: 'b' });
		s.notify({ kind: 'info', title: 'c' });
		expect(get(s.unread)).toBe(3);
		s.markAllRead();
		expect(get(s.unread)).toBe(0);
		expect(get(s).every((n) => n.read)).toBe(true);
	});

	it('unread count ignores entries added before markAllRead but counts new ones', () => {
		const s = createNotificationStore();
		s.notify({ kind: 'info', title: 'old' });
		s.markAllRead();
		expect(get(s.unread)).toBe(0);
		s.notify({ kind: 'info', title: 'new' });
		expect(get(s.unread)).toBe(1);
	});

	it('clear empties the history', () => {
		const s = createNotificationStore();
		s.notify({ kind: 'info', title: 'a' });
		s.notify({ kind: 'info', title: 'b' });
		s.clear();
		expect(get(s)).toHaveLength(0);
		expect(get(s.unread)).toBe(0);
	});
});
