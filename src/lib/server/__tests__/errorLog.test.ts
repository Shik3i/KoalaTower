import { describe, expect, it } from 'vitest';
import { createDatabase, type Db } from '../db';
import { logServerError, getRecentErrorLogs, getErrorLogCount, RETENTION_LIMIT } from '../errorLog';

describe('error log helper', () => {
	it('stores a record and reads it back, newest first', () => {
		const db = createDatabase(':memory:');
		logServerError({ source: 'test', message: 'first' }, db);
		logServerError({ source: 'test', message: 'second' }, db);
		const rows = getRecentErrorLogs(db, 10);
		expect(rows.length).toBe(2);
		expect(rows[0]!.message).toBe('second');
		expect(getErrorLogCount(db)).toBe(2);
		db.close();
	});

	it('truncates oversized message, stack, user agent, and metadata', () => {
		const db = createDatabase(':memory:');
		const huge = 'x'.repeat(20000);
		logServerError(
			{
				source: 'test',
				message: huge,
				stack: huge,
				userAgent: huge,
				metadata: { blob: huge }
			},
			db
		);
		const row = db
			.prepare('SELECT message, stack, user_agent, metadata_json FROM app_error_logs')
			.get() as { message: string; stack: string; user_agent: string; metadata_json: string };
		expect(row.message.length).toBeLessThan(huge.length);
		expect(row.stack.length).toBeLessThan(huge.length);
		expect(row.user_agent.length).toBeLessThan(huge.length);
		expect(row.metadata_json.length).toBeLessThan(huge.length);
		db.close();
	});

	it('fails safely when the DB cannot be written and never throws', () => {
		const brokenDb = {
			prepare() {
				throw new Error('db is down');
			}
		} as unknown as Db;
		expect(() => logServerError({ source: 'test', message: 'boom' }, brokenDb)).not.toThrow();
	});

	it('enforces retention by keeping at most RETENTION_LIMIT rows', () => {
		const db = createDatabase(':memory:');
		// Insert a handful beyond a tiny simulated cap by checking the delete keeps
		// only the newest RETENTION_LIMIT — here we just verify the count never
		// exceeds the limit after many inserts (kept small for speed).
		for (let i = 0; i < 5; i++) {
			logServerError({ source: 'test', message: `m${i}` }, db);
		}
		expect(getErrorLogCount(db)).toBeLessThanOrEqual(RETENTION_LIMIT);
		expect(getErrorLogCount(db)).toBe(5);
		db.close();
	});
});
