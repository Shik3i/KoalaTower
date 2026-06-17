<script lang="ts">
</script>

<main class="imprint-page">
	<div class="bg-grid"></div>
	<a href="/" class="back-link">← Back to GeoCore TD</a>
	<div class="imprint-card glass-panel">
		<div class="imprint-header">
			<h1>Imprint / Impressum</h1>
			<p class="last-updated">Last updated: June 2026</p>
		</div>

		<section>
			<h2>📋 Operator</h2>
			<p>
				<strong>Timo</strong><br>
				Private Individual<br>
				Germany
			</p>
		</section>

		<section>
			<h2>📬 Contact</h2>
			<p>
				Mastodon: <a href="https://hachyderm.io/@koalastuff" target="_blank" rel="noopener">@koalastuff</a><br>
				GitHub Issues: <a href="https://github.com/Shik3i/GeoCoreTD/issues" target="_blank" rel="noopener">Shik3i/GeoCoreTD</a><br>
				Email: <a href="mailto:admin@koalastuff.net">admin@koalastuff.net</a>
			</p>
		</section>

		<section>
			<h2>🔒 Private Project Notice</h2>
			<p>
				GeoCore TD is a purely private, non-commercial hobby project. It is operated
				voluntarily and transparently for the public. As a private individual with no
				commercial purpose, there is no obligation to provide an imprint under
				<a href="https://www.gesetze-im-internet.de/ddg/__5.html" target="_blank" rel="noopener">§ 5 DDG</a>
				(formerly § 5 TMG). This information is provided voluntarily.
			</p>
		</section>

		<section>
			<h2>⚖️ Liability</h2>
			<p>
				The content of this project has been prepared with the utmost care. However,
				no guarantee can be given for the accuracy, completeness, or timeliness of the
				content. As a private service provider, we are responsible for our own content
				on these pages in accordance with <a href="https://www.gesetze-im-internet.de/ddg/__7.html" target="_blank" rel="noopener">§ 7 Abs.1 DDG</a>
				under general law. According to <a href="https://www.gesetze-im-internet.de/ddg/__8.html" target="_blank" rel="noopener">§§ 8 to 10 DDG</a>,
				we are not obliged to monitor transmitted or stored third-party information or
				to investigate circumstances that indicate illegal activity.
			</p>
			<p>
				This project may contain links to external third-party websites. We have no
				influence over the content and design of those pages. The respective provider
				is always responsible for the content of linked pages.
			</p>
		</section>

		<section>
			<h2>© Copyright</h2>
			<p>
				The content, layout, and code of this project are subject to German copyright
				law. The reproduction, editing, distribution, and any kind of exploitation
				beyond the scope of the
				<a href="https://opensource.org/licenses/MIT" target="_blank" rel="noopener">MIT license</a>
				require the written consent of the author.
			</p>
		</section>

		<section>
			<h2>🔗 External Links</h2>
			<p>
				This project may link to external websites over which we have no control.
				Therefore, we cannot accept any liability for their content. The respective
				provider or operator of the linked pages is always responsible for their own
				content.
			</p>
		</section>
	</div>
</main>

<style>
	.imprint-page {
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

	.imprint-card {
		padding: 2.5rem;
		position: relative;
		z-index: 1;
	}

	.imprint-header {
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

	a {
		color: var(--cyan);
		text-decoration: underline;
		text-underline-offset: 3px;
		text-decoration-color: rgba(0, 255, 255, 0.2);
	}

	@media (max-width: 767px) {
		.imprint-page {
			padding: 1rem;
		}
		.imprint-card {
			padding: 1.5rem;
		}
		h1 {
			font-size: 1.4rem;
		}
	}
</style>
