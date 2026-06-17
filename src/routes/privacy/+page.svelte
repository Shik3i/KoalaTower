<script lang="ts">
</script>

<svelte:head>
	<title>Privacy Policy — GeoCore TD</title>
	<meta name="description" content="GeoCore TD privacy policy: all data stored locally in your browser. No cookies, no tracking, no backend. Server logs deleted after 7 days." />
	<meta name="robots" content="index, follow" />
</svelte:head>

<main class="privacy-page">
	<div class="bg-grid"></div>
	<a href="/" class="back-link">← Back to GeoCore TD</a>
	<div class="privacy-card glass-panel">
		<div class="privacy-header">
			<h1>Privacy Policy / Datenschutzerklärung</h1>
			<p class="last-updated">Last updated: June 2026</p>
		</div>

		<section>
			<h2>🔒 Overview</h2>
			<p>
				GeoCore TD is a static web application. It does <strong>not</strong> operate any backend servers,
				databases, or user accounts. All game data is processed and stored exclusively
				in your browser. No personal data is transmitted to us or to any third party.
			</p>
		</section>

		<section>
			<h2>📁 Local Storage (IndexedDB)</h2>
			<p>
				GeoCore TD uses your browser's <strong>IndexedDB</strong> to store:
			</p>
			<ul>
				<li>Your game save data (coins, upgrade levels, progress, settings)</li>
				<li>Lab research progress (timestamps, levels)</li>
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
				GeoCore TD does <strong>not</strong> use cookies. No tracking cookies, no
				session cookies, no analytics cookies. The application is fully functional
				without any cookies.
			</p>
		</section>

		<section>
			<h2>📡 No Third-Party Services</h2>
			<p>
				GeoCore TD does <strong>not</strong> integrate any third-party services:
			</p>
			<ul>
				<li>No analytics (no Google Analytics, no Plausible, no Fathom, etc.)</li>
				<li>No tracking pixels or beacons</li>
				<li>No advertising or affiliate links</li>
				<li>No social media embeds or widgets</li>
				<li>No external fonts (all fonts are system fonts)</li>
				<li>No external CDN resources</li>
				<li>No external images or assets</li>
			</ul>
		</section>

		<section>
			<h2>📤 No Network Requests</h2>
			<p>
				During normal gameplay, GeoCore TD makes <strong>zero</strong> network requests.
				There is no telemetry, no error reporting, no update checks, and no analytics
				pings. The application is fully self-contained and works offline after the
				initial page load (except for the initial load of the static files).
			</p>
		</section>

		<section>
			<h2>🧒 Children's Privacy</h2>
			<p>
				GeoCore TD does not knowingly collect any personal data from children under
				the age of 16. Since no personal data is collected at all, this is inherently
				compliant with children's privacy regulations.
			</p>
		</section>

		<section>
			<h2>🔐 Data Security</h2>
			<p>
				Since all data resides exclusively in your browser's IndexedDB, data security
				is handled by your browser's built-in security model. No data is transmitted
				over the network, eliminating common attack vectors such as man-in-the-middle
				interception or server-side breaches.
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
				<a href="https://github.com/Shik3i/GeoCoreTD/issues" target="_blank" rel="noopener">GitHub</a>,
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

	.bg-grid {
		position: fixed;
		inset: 0;
		background-image:
			linear-gradient(rgba(0, 255, 255, 0.02) 1px, transparent 1px),
			linear-gradient(90deg, rgba(0, 255, 255, 0.02) 1px, transparent 1px);
		background-size: 60px 60px;
		pointer-events: none;
		z-index: 0;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--text-dim);
		margin-bottom: 1.5rem;
		font-size: 0.85rem;
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
		font-size: 1.8rem;
		margin-bottom: 0.5rem;
		background: linear-gradient(135deg, var(--cyan), var(--blue));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.last-updated {
		color: var(--text-dim);
		font-size: 0.78rem;
		font-family: var(--font-mono);
	}

	section {
		margin-bottom: 2rem;
	}

	h2 {
		font-size: 1rem;
		color: var(--text-primary);
		margin-bottom: 0.6rem;
		font-weight: 500;
	}

	p {
		color: var(--text-secondary);
		font-size: 0.85rem;
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
		font-size: 0.82rem;
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
		font-size: 0.78rem;
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
