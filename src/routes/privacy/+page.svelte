<script lang="ts">
</script>

<div class="privacy-page">
	<div class="bg-grid"></div>
	<a href="/" class="back-link">← Back to KoalaTower</a>
	<div class="privacy-card glass-panel">
		<div class="privacy-header">
			<h1>Privacy Policy</h1>
			<p class="last-updated">Last updated: June 2026</p>
		</div>

		<section>
			<h2>🔒 Your Data Stays With You</h2>
			<p>KoalaTower does <strong>not</strong> collect, transmit, or store any personal data on external servers. There are no analytics, no cookies, no tracking scripts, and no backend services whatsoever.</p>
		</section>

		<section>
			<h2>💾 Local Storage Only</h2>
			<p>All game data — including your save progress, settings, and statistics — is stored exclusively in your browser's IndexedDB database. This data <strong>never leaves your device</strong>.</p>
		</section>

		<section>
			<h2>📦 What We Store</h2>
			<ul>
				<li>Your current save data (coins, upgrade levels, progress)</li>
				<li>Game settings (reduced motion, effects preferences)</li>
				<li>Milestone and achievement progress</li>
				<li>Challenge high scores</li>
			</ul>
			<p>We do <strong>not</strong> store any personally identifiable information, email addresses, or authentication data.</p>
		</section>

		<section>
			<h2>📤 Export & Import</h2>
			<p>You can export your save data as a formatted JSON file at any time from the in-game settings menu. This allows you to create backups or transfer your progress between devices. Importing a previously exported save will replace your current progress.</p>
		</section>

		<section>
			<h2>🗑 Reset Your Data</h2>
			<p>You can reset all game data at any time from the settings menu. This will permanently delete all progress from your browser's local storage. Export your save first if you want to keep a backup.</p>
		</section>

		<section>
			<h2>🌐 No External Resources</h2>
			<p>KoalaTower does not load any external fonts, scripts, images, or other resources from content delivery networks (CDNs) or third-party servers. All assets are bundled with the application. The app functions entirely offline after the initial page load.</p>
		</section>

		<section>
			<h2>📡 No Network Requests</h2>
			<p>During normal gameplay, KoalaTower makes <strong>zero</strong> network requests. There is no telemetry, no error reporting, no analytics pings, and no update checks. The application is fully self-contained.</p>
		</section>

		<section>
			<h2>📬 Contact</h2>
			<p>If you have questions about this privacy policy, please open an issue on the project's repository.</p>
		</section>

		<div class="privacy-footer">
			<p>Built with privacy by design. No tracking. No compromises.</p>
		</div>
	</div>
</div>

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
		section {
			margin-bottom: 1.5rem;
		}
	}
</style>
