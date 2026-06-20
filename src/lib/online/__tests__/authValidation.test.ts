import { describe, it, expect } from 'vitest';
import { isValidUsername, isValidPassword, isValidDisplayName } from '../authValidation';

describe('authValidation', () => {
	describe('isValidUsername', () => {
		it('should accept valid usernames', () => {
			expect(isValidUsername('player123')).toBe(true);
			expect(isValidUsername('player_name')).toBe(true);
			expect(isValidUsername('ABC')).toBe(true);
			expect(isValidUsername('   trimmed_user   ')).toBe(true);
		});

		it('should reject invalid usernames', () => {
			expect(isValidUsername('ab')).toBe(false); // too short
			expect(isValidUsername('a'.repeat(25))).toBe(false); // too long
			expect(isValidUsername('invalid-char')).toBe(false); // hyphen is invalid
			expect(isValidUsername('user name')).toBe(false); // space is invalid
		});
	});

	describe('isValidPassword', () => {
		it('should accept passwords with 10 or more characters', () => {
			expect(isValidPassword('1234567890')).toBe(true);
			expect(isValidPassword('superSecretPassword')).toBe(true);
		});

		it('should reject passwords with less than 10 characters', () => {
			expect(isValidPassword('short')).toBe(false);
			expect(isValidPassword('')).toBe(false);
		});
	});

	describe('isValidDisplayName', () => {
		it('should accept empty or valid display names', () => {
			expect(isValidDisplayName('')).toBe(true);
			expect(isValidDisplayName('  ')).toBe(true);
			expect(isValidDisplayName('Flatland Player')).toBe(true);
			expect(isValidDisplayName('User-Name_1')).toBe(true);
		});

		it('should reject invalid characters or newlines', () => {
			expect(isValidDisplayName('Name\nWithNewline')).toBe(false);
			expect(isValidDisplayName('a'.repeat(33))).toBe(false); // too long
		});
	});
});
