<script lang="ts">
	import { GITHUB_ISSUES_URL } from '$lib/version';
</script>

<svelte:head>
	<title>Privacy Policy — Flatland TD · FLTD</title>
	<meta name="description" content="Flatland TD privacy policy: local-first gameplay, optional online features, no tracking, and short-lived server logs." />
	<meta name="robots" content="index, follow" />
</svelte:head>

<main class="privacy-page">
	<div class="bg-grid"></div>
	<a href="/" class="back-link">← Back to Flatland TD</a>
	<div class="privacy-card glass-panel">
		<div class="privacy-header">
			<h1>Privacy Policy / Datenschutzerklärung</h1>
			<p class="last-updated">Last updated: June 2026</p>
		</div>

		<section>
			<h2>🔒 Overview</h2>
			<p>
				Flatland TD is a <strong>local-first</strong> game. Normal gameplay, local saves,
				settings, and progression are processed and stored in your browser. No login is
				required for normal play, and the game remains playable when optional online
				APIs are unavailable after the app has loaded.
			</p>
		</section>

		<section>
			<h2>📁 Local Storage (IndexedDB)</h2>
			<p>
				Flatland TD uses your browser's <strong>IndexedDB</strong> to store:
			</p>
			<ul>
				<li>Your game save data (Alloy, upgrade levels, progress, settings)</li>
				<li>Research Deck progress (timestamps, levels)</li>
				<li>Game settings (reduced motion, effects preferences)</li>
				<li>High scores and statistics</li>
			</ul>
			<p>
				This data <strong>never leaves your device</strong>. You can export it as JSON,
				import previously exported saves, or reset all data at any time from the
				in-game settings menu or the Hub.
			</p>
		</section>

		<section>
			<h2>🛰 Optional Online Features</h2>
			<p>
				Optional online features may include accounts, session cookies, anonymous local
				profile sync, unverified leaderboards, cloud-save scaffolding, and community
				buff APIs. These features are not required for normal play and are designed to
				fail closed into local/offline behavior.
			</p>
			<ul>
				<li>No login is required for normal gameplay</li>
				<li>Local saves are not overwritten automatically</li>
				<li>Unverified leaderboard scores are community/fun only</li>
				<li>Deleting an account removes sessions, cloud saves, supporter links, and linked server identity data</li>
				<li>Historical leaderboard rows linked to a deleted account are retained only as <strong>Deleted account</strong> with identifiers removed</li>
				<li>Verified challenge leaderboards will require stricter validation later</li>
			</ul>
		</section>

		<section>
			<h2>🌐 Hosting & Server Logs</h2>
			<p>
				The website is hosted as a static site and served via a standard web server.
				When you access the site, the server may temporarily record:
			</p>
			<ul>
				<li>Your IP address</li>
				<li>Browser type and version</li>
				<li>Date and time of access</li>
				<li>Pages accessed</li>
			</ul>
			<p>
				These are standard server access logs. They are:
			</p>
			<ul>
				<li><strong>Not linked</strong> to individual identities</li>
				<li>Used solely for operational stability and security</li>
				<li><strong>Automatically deleted after 7 days</strong></li>
				<li>Never shared with third parties</li>
			</ul>
		</section>

		<section>
			<h2>🍪 Cookies</h2>
			<p>
				Flatland TD does <strong>not</strong> use tracking or analytics cookies. If you
				register or log in for optional online features, the server uses an
				<strong>httpOnly</strong> session cookie. The application is fully functional
				for normal play without logging in.
			</p>
		</section>

		<section>
			<h2>📡 No Third-Party Services</h2>
			<p>
				Flatland TD does <strong>not</strong> integrate any third-party services:
			</p>
			<ul>
				<li>No analytics (no Google Analytics, no Plausible, no Fathom, etc.)</li>
				<li>No tracking pixels or beacons</li>
				<li>No advertising or affiliate links</li>
				<li>No social media embeds or widgets</li>
				<li>No external font requests (fonts are bundled with the app)</li>
				<li>No external CDN resources</li>
				<li>No external images or assets</li>
			</ul>
		</section>

		<section>
			<h2>📤 No Network Requests</h2>
			<p>
				During normal gameplay, Flatland TD does <strong>not</strong> send telemetry,
				error reports, analytics pings, or tracking beacons. Optional online API
				requests are limited to explicit online features and are not required for
				local play. The application works offline after the initial page load and
				cache, except for optional online features.
			</p>
		</section>

		<section>
			<h2>🧒 Children's Privacy</h2>
			<p>
				Flatland TD does not knowingly collect any personal data from children under
				the age of 16. Since no personal data is collected at all, this is inherently
				compliant with children's privacy regulations.
			</p>
		</section>

		<section>
			<h2>🔐 Data Security</h2>
			<p>
				Local save data resides in your browser's IndexedDB and is protected by your
				browser's security model. Optional account passwords are hashed server-side
				with bcrypt-compatible hashing and a server-only pepper. Session tokens are
				stored as hashes, never as raw tokens.
			</p>
		</section>

		<section>
			<h2>📤 Your Rights</h2>
			<p>
				Under applicable data protection law, you have the right to:
			</p>
			<ul>
				<li>Information about what data is stored</li>
				<li>Export your data (use the Export Save function)</li>
				<li>Delete your data (use the Reset Save function)</li>
			</ul>
			<p>
				Since we do not store any personal data on servers, we cannot link any data
				to individuals. Your game save is yours alone and under your full control.
			</p>
		</section>

		<section>
			<h2>📬 Contact</h2>
			<p>
				If you have questions about this privacy policy, please open an issue on
				<a href={GITHUB_ISSUES_URL} target="_blank" rel="noopener">GitHub</a>,
				contact via Mastodon:
				<a href="https://hachyderm.io/@koalastuff" target="_blank" rel="noopener">@koalastuff</a>,
				or email:
				<a href="mailto:admin@koalastuff.net">admin@koalastuff.net</a>
			</p>
		</section>

		<div class="privacy-footer">
			<p>Built with privacy by design. No tracking. No compromises.</p>
		</div>
	</div>
</main>

<style>
	.privacy-page {
		min-height: 100vh;
		padding: 2rem 1.5rem;
		max-width: 680px;
		margin: 0 auto;
		overflow-y: auto;
		position: relative;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--text-dim);
		margin-bottom: 1.5rem;
		font-size: var(--fs-body-sm);
		transition: all var(--transition-fast);
		position: relative;
		z-index: 1;
		padding: 0.35rem 0.75rem;
		border-radius: var(--radius-sm);
		border: 1px solid transparent;
		text-decoration: none;
	}

	.back-link:hover {
		color: var(--cyan);
		border-color: var(--border-neon);
		background: rgba(0, 255, 255, 0.04);
	}

	.privacy-card {
		padding: 2.5rem;
		position: relative;
		z-index: 1;
	}

	.privacy-header {
		margin-bottom: 2.5rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--border-neon);
	}

	h1 {
		font-size: var(--fs-hero);
		margin-bottom: 0.5rem;
		background: linear-gradient(135deg, var(--cyan), var(--blue));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.last-updated {
		color: var(--text-dim);
		font-size: var(--fs-caption);
		font-family: var(--font-mono);
	}

	section {
		margin-bottom: 2rem;
	}

	h2 {
		font-size: var(--fs-subheading);
		color: var(--text-primary);
		margin-bottom: 0.6rem;
		font-weight: 500;
	}

	p {
		color: var(--text-secondary);
		font-size: var(--fs-body);
		line-height: 1.8;
	}

	strong {
		color: var(--text-primary);
		font-weight: 500;
	}

	ul {
		list-style: none;
		padding: 0;
		margin: 0.5rem 0;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	ul li {
		color: var(--text-dim);
		font-size: var(--fs-body-sm);
		padding: 0.25rem 0 0.25rem 1.5rem;
		position: relative;
		line-height: 1.5;
	}

	ul li::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0.6rem;
		width: 6px;
		height: 6px;
		background: var(--cyan-dim);
		border-radius: 50%;
	}

	a {
		color: var(--cyan);
		text-decoration: underline;
		text-underline-offset: 3px;
		text-decoration-color: rgba(0, 255, 255, 0.2);
	}

	.privacy-footer {
		margin-top: 2.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--border-neon);
		text-align: center;
	}

	.privacy-footer p {
		color: var(--text-dim);
		font-size: var(--fs-caption);
		font-style: italic;
	}

	@media (max-width: 767px) {
		.privacy-page {
			padding: 1rem;
		}
		.privacy-card {
			padding: 1.5rem;
		}
		h1 {
			font-size: 1.4rem;
		}
	}
</style>
