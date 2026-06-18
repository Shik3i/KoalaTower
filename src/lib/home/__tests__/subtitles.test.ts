import { describe, expect, it } from 'vitest';
import { HOME_SUBTITLE_RESERVED_LINES, HOME_SUBTITLE_ROTATION_MS, HOME_SUBTITLES } from '../subtitles';

describe('Home subtitle polish', () => {
	it('rotates slowly enough to avoid jumpy hero controls', () => {
		expect(HOME_SUBTITLE_ROTATION_MS).toBe(60_000);
	});

	it('reserves room for multiline subtitle copy', () => {
		expect(HOME_SUBTITLE_RESERVED_LINES).toBeGreaterThanOrEqual(2);
		expect(HOME_SUBTITLES.length).toBeGreaterThan(1);
	});
});
