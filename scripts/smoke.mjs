#!/usr/bin/env node
/**
 * Flatland TD — optional online foundation smoke test.
 *
 * Runs inside the Docker container against http://127.0.0.1:8080.
 * Requires the container to be running with valid env vars.
 *
 * Usage (after `docker run -d ...`):
 *   docker exec <container> node scripts/smoke.mjs
 *
 * Or from the host:
 *   docker exec flatland-td node scripts/smoke.mjs
 *
 * This script is OPTIONAL.  The app is not broken if this is never run.
 * It exists so that deployers can quickly verify the online stack.
 */

const BASE = 'http://127.0.0.1:' + (process.env.PORT || '8080');
const KOFI_SECRET = process.env.KOFI_WEBHOOK_SECRET || 'smoke-test-secret';

let failures = 0;

function check(name, ok, detail = '') {
	const mark = ok ? 'PASS' : 'FAIL';
	console.log(`  ${mark}  ${name}${!ok && detail ? '  [' + detail + ']' : ''}`);
	if (!ok) failures++;
}

async function get(path, expectStatus = 200) {
	const c = new AbortController();
	const t = setTimeout(() => c.abort(), 5000);
	try {
		const r = await fetch(BASE + path, { signal: c.signal });
		const text = await r.text();
		clearTimeout(t);
		return { ok: r.status === expectStatus, status: r.status, text };
	} catch (e) {
		clearTimeout(t);
		return { ok: false, status: 0, text: e.message };
	}
}

async function postForm(path, body, expectStatus) {
	const c = new AbortController();
	const t = setTimeout(() => c.abort(), 5000);
	try {
		const r = await fetch(BASE + path, {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({ data: JSON.stringify(body) }).toString(),
			signal: c.signal
		});
		const text = await r.text();
		clearTimeout(t);
		return { ok: r.status === expectStatus, status: r.status, text };
	} catch (e) {
		clearTimeout(t);
		return { ok: false, status: 0, text: e.message };
	}
}

async function postJson(path, body, expectStatus) {
	const c = new AbortController();
	const t = setTimeout(() => c.abort(), 5000);
	try {
		const r = await fetch(BASE + path, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body),
			signal: c.signal
		});
		const text = await r.text();
		clearTimeout(t);
		// Return full info for auth tests (set-cookie etc.)
		return { ok: r.status === expectStatus, status: r.status, text, headers: r.headers };
	} catch (e) {
		clearTimeout(t);
		return { ok: false, status: 0, text: e.message, headers: new Headers() };
	}
}

(async () => {
	console.log('Flatland TD online smoke test');
	console.log('BASE =', BASE);
	console.log('');

	// ── HTML routes ───────────────────────────────────────────
	for (const p of ['/', '/play/', '/help/', '/hub/', '/privacy/']) {
		const r = await get(p);
		const hasHtml = r.text.includes('<html') || r.text.includes('<!doctype');
		check('GET ' + p, r.ok && hasHtml, 'status=' + r.status + (hasHtml ? '' : ' no-html'));
	}

	// ── API routes ────────────────────────────────────────────
	{
		const r = await get('/api/health');
		check('GET /api/health', r.ok && r.text.includes('"ok":true'), r.text.slice(0, 60));
	}
	{
		const r = await get('/api/version');
		check('GET /api/version', r.ok, r.text.slice(0, 60));
	}
	{
		const r = await get('/api/leaderboard/verified');
		check('GET /api/leaderboard/verified', r.ok && r.text.includes('"leaderboardType":"verified"'), r.text.slice(0, 80));
	}
	{
		const r = await postJson('/api/leaderboard/verified/start', { challengeId: 'fastSwarm' }, 401);
		check('Verified challenge start without account → 401', r.ok, 'status=' + r.status);
	}
	{
		const r = await get('/api/community-buff');
		check('GET /api/community-buff', r.ok, r.text.slice(0, 60));
	}

	// ── Ko-fi webhook ─────────────────────────────────────────
	{
		const r = await postForm('/api/kofi/webhook', {
			message_id: 'smoke-reject',
			verification_token: 'WRONG',
			amount: '5',
			currency: 'EUR'
		}, 403);
		check('Ko-fi bad token → 403', r.ok, 'status=' + r.status);
	}

	const GOOD_ID = 'smoke-good-' + Date.now();
	{
		const r = await postForm('/api/kofi/webhook', {
			message_id: GOOD_ID,
			verification_token: KOFI_SECRET,
			amount: '3',
			currency: 'EUR'
		}, 200);
		const json = r.text ? JSON.parse(r.text) : {};
		check('Ko-fi verified EUR → buff', r.ok && json.communityBuffEventCreated === true, 'status=' + r.status);
	}
	{
		const r = await postForm('/api/kofi/webhook', {
			message_id: GOOD_ID,
			verification_token: KOFI_SECRET,
			amount: '3',
			currency: 'EUR'
		}, 200);
		const json = r.text ? JSON.parse(r.text) : {};
		check('Ko-fi duplicate → idempotent', json.recorded === false && json.communityBuffEventCreated === false, JSON.stringify(json));
	}

	// ── Auth ──────────────────────────────────────────────────
	const uname = 'smoke' + Math.floor(Math.random() * 1e6);
	let cookie = '';

	const reg = await postJson('/api/auth/register', {
		username: uname,
		password: 'correct-horse-battery',
		displayName: 'Smoke'
	}, 201);
	check('POST /api/auth/register', reg.ok, 'status=' + reg.status);
	if (reg.headers) cookie = reg.headers.get('set-cookie')?.split(';')[0] || '';

	const me1 = await (async () => {
		const c = new AbortController(); const t = setTimeout(() => c.abort(), 3000);
		const r = await fetch(BASE + '/api/auth/me', { signal: c.signal, headers: cookie ? { cookie } : {} });
		const text = await r.text(); clearTimeout(t);
		const json = text ? JSON.parse(text) : {};
		return { ok: r.status === 200 && json.account?.username === uname, status: r.status, detail: json.account?.username };
	})();
	check('GET /api/auth/me (logged in)', me1.ok, 'status=' + me1.status + ' user=' + me1.detail);

	// ── Cloud save ────────────────────────────────────────────
	const cs0 = await (async () => {
		const c = new AbortController(); const t = setTimeout(() => c.abort(), 3000);
		const r = await fetch(BASE + '/api/cloud-save', { signal: c.signal, headers: cookie ? { cookie } : {} });
		const text = await r.text(); clearTimeout(t);
		const json = text ? JSON.parse(text) : {};
		return { ok: r.status === 200 && json.exists === false, status: r.status, detail: JSON.stringify(json) };
	})();
	check('GET /api/cloud-save (empty)', cs0.ok, 'status=' + cs0.status + ' ' + cs0.detail);

	const put = await (async () => {
		const c = new AbortController(); const t = setTimeout(() => c.abort(), 5000);
		const r = await fetch(BASE + '/api/cloud-save', {
			method: 'PUT',
			headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
			body: JSON.stringify({ saveJson: { totalAlloy: 42 }, schemaVersion: 17, gameVersion: 'smoke' }),
			signal: c.signal
		});
		const text = await r.text(); clearTimeout(t);
		return { ok: r.status === 200, status: r.status, detail: text };
	})();
	check('PUT /api/cloud-save', put.ok, 'status=' + put.status);

	const cs1 = await (async () => {
		const c = new AbortController(); const t = setTimeout(() => c.abort(), 3000);
		const r = await fetch(BASE + '/api/cloud-save?includeSave=1', { signal: c.signal, headers: cookie ? { cookie } : {} });
		const text = await r.text(); clearTimeout(t);
		const json = text ? JSON.parse(text) : {};
		return { ok: r.status === 200 && json.exists === true && json.saveJson?.totalAlloy === 42, status: r.status };
	})();
	check('GET /api/cloud-save?includeSave=1', cs1.ok, 'status=' + cs1.status);

	// ── Logout ────────────────────────────────────────────────
	const lo = await postJson('/api/auth/logout', {}, 200);
	check('POST /api/auth/logout', lo.ok, 'status=' + lo.status);

	// ── Unauth cloud ──────────────────────────────────────────
	const csNo = await get('/api/cloud-save', 401);
	check('GET /api/cloud-save (unauth) → 401', csNo.ok, 'status=' + csNo.status);

	console.log('');
	if (failures === 0) {
		console.log('ALL SMOKE TESTS PASSED');
	} else {
		console.log(failures + ' TEST(S) FAILED');
		process.exit(1);
	}
})();
