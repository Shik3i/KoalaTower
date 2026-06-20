<script lang="ts">
	import { onMount } from 'svelte';
	import { getDailyArticles, getNextDispatchMs } from '$lib/content/newsEngine';
	import type { NewsItem } from '$lib/content/newsTypes';

	let articles = $state<NewsItem[]>([]);
	let countdown = $state('');

	function formatCountdown(ms: number): string {
		if (ms <= 0) return 'New reports arriving...';
		const totalMin = Math.floor(ms / 60000);
		const hours = Math.floor(totalMin / 60);
		const minutes = totalMin % 60;
		if (hours > 0) {
			return `New reports in ${hours}h ${minutes}m`;
		}
		return `New reports in ${minutes}m`;
	}

	function updateCountdown() {
		countdown = formatCountdown(getNextDispatchMs());
	}

	onMount(() => {
		articles = getDailyArticles();
		updateCountdown();
		const interval = setInterval(updateCountdown, 60000);
		return () => clearInterval(interval);
	});
</script>

<div class="news-section">
	<div class="news-header">
		<div class="news-badge">LIVE</div>
		<h2 class="news-title">Flatland Wars News</h2>
		<span class="news-orbital">{countdown}</span>
	</div>
	<div class="news-grid">
		{#each articles as item}
			<article class="news-card">
				<div class="nc-thumb" aria-hidden="true">
					{#if item.thumbnail === 'triangle'}
						<svg viewBox="0 0 48 48" class="nc-svg"><polygon points="24,6 44,42 4,42" fill="none" stroke="var(--orange)" stroke-width="1.5" opacity="0.7"/><polygon points="24,6 44,42 4,42" fill="rgba(255,152,0,0.06)"/></svg>
					{:else if item.thumbnail === 'tower'}
						<svg viewBox="0 0 48 48" class="nc-svg"><rect x="18" y="8" width="12" height="20" fill="none" stroke="var(--cyan)" stroke-width="1.2" opacity="0.7"/><rect x="14" y="28" width="20" height="4" fill="none" stroke="var(--cyan)" stroke-width="1" opacity="0.5"/><line x1="24" y1="8" x2="24" y2="4" stroke="var(--cyan)" stroke-width="1.2" opacity="0.5"/><circle cx="24" cy="4" r="2" fill="none" stroke="var(--cyan)" stroke-width="1" opacity="0.4"/></svg>
					{:else if item.thumbnail === 'warning'}
						<svg viewBox="0 0 48 48" class="nc-svg"><polygon points="24,6 44,42 4,42" fill="none" stroke="var(--yellow)" stroke-width="1.5" opacity="0.7"/><line x1="24" y1="18" x2="24" y2="30" stroke="var(--yellow)" stroke-width="1.5" opacity="0.5"/><circle cx="24" cy="36" r="1.5" fill="var(--yellow)" opacity="0.5"/></svg>
					{:else if item.thumbnail === 'radar'}
						<svg viewBox="0 0 48 48" class="nc-svg"><circle cx="24" cy="24" r="18" fill="none" stroke="var(--cyan)" stroke-width="1" opacity="0.4"/><circle cx="24" cy="24" r="12" fill="none" stroke="var(--cyan)" stroke-width="0.5" opacity="0.3"/><circle cx="24" cy="24" r="6" fill="none" stroke="var(--cyan)" stroke-width="0.5" opacity="0.2"/><line x1="24" y1="24" x2="40" y2="12" stroke="var(--green)" stroke-width="1.5" opacity="0.6"/><circle cx="36" cy="16" r="2" fill="none" stroke="var(--green)" stroke-width="0.8" opacity="0.7"/></svg>
					{:else if item.thumbnail === 'hexagon'}
						<svg viewBox="0 0 48 48" class="nc-svg"><polygon points="24,4 42,14 42,34 24,44 6,34 6,14" fill="none" stroke="var(--violet)" stroke-width="1.5" opacity="0.7"/><polygon points="24,4 42,14 42,34 24,44 6,34 6,14" fill="rgba(136,68,255,0.06)"/></svg>
					{:else if item.thumbnail === 'classified'}
						<svg viewBox="0 0 48 48" class="nc-svg"><rect x="8" y="10" width="32" height="28" rx="3" fill="none" stroke="var(--red)" stroke-width="1.2" opacity="0.6"/><line x1="14" y1="18" x2="34" y2="18" stroke="var(--red)" stroke-width="1.2" opacity="0.5"/><line x1="14" y1="24" x2="30" y2="24" stroke="var(--red)" stroke-width="1.2" opacity="0.5"/><line x1="14" y1="30" x2="26" y2="30" stroke="var(--red)" stroke-width="1.2" opacity="0.5"/><text x="24" y="42" text-anchor="middle" font-size="5" fill="var(--red)" opacity="0.4" font-weight="bold">CLASSIFIED</text></svg>
					{:else if item.thumbnail === 'square'}
						<svg viewBox="0 0 48 48" class="nc-svg"><rect x="6" y="6" width="36" height="36" rx="2" fill="none" stroke="var(--cyan)" stroke-width="1.5" opacity="0.7"/><rect x="6" y="6" width="36" height="36" rx="2" fill="rgba(0,255,255,0.06)"/></svg>
					{:else if item.thumbnail === 'boss'}
						<svg viewBox="0 0 48 48" class="nc-svg"><polygon points="24,4 36,12 40,26 34,40 24,44 14,40 8,26 12,12" fill="none" stroke="var(--pink)" stroke-width="1.5" opacity="0.7"/><polygon points="24,4 36,12 40,26 34,40 24,44 14,40 8,26 12,12" fill="rgba(255,68,170,0.06)"/><circle cx="24" cy="24" r="3" fill="none" stroke="var(--pink)" stroke-width="0.8" opacity="0.5"/></svg>
					{/if}
				</div>
				<div class="nc-body">
					<div class="nc-meta">
						<span class="nc-cat">{item.category}</span>
						<span class="nc-class" class:approved={item.classification === 'Approved'} class:sanitized={item.classification === 'Sanitized'} class:morale={item.classification === 'Morale-Safe'} class:advisory={item.classification === 'Geometry Advisory'}>{item.classification}</span>
					</div>
					<h3 class="nc-headline">{item.headline}</h3>
					<p class="nc-snippet">{item.snippet}</p>
					<div class="nc-footer">
						<span class="nc-cycle">{item.cycle}</span>
						<span class="nc-divider" aria-hidden="true">·</span>
						<span class="nc-timestamp">{item.timestamp}</span>
						<span class="nc-divider" aria-hidden="true">·</span>
						<span class="nc-author">{item.author}</span>
					</div>
					<span class="nc-refid">{item.refId}</span>
				</div>
			</article>
		{/each}
	</div>
</div>

<style>
	.news-section {
		width: 100%;
		max-width: var(--content-max);
		padding: 0 clamp(1rem, 3vw, 2rem) 2.5rem;
		z-index: 1;
		position: relative;
	}

	.news-header {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		margin-bottom: 0.85rem;
		flex-wrap: wrap;
	}

	.news-badge {
		font-size: var(--fs-caption-sm);
		font-weight: 700;
		font-family: var(--font-tech);
		padding: 0.15rem 0.45rem;
		border-radius: 3px;
		background: rgba(255, 68, 68, 0.12);
		color: #FF5555;
		border: 1px solid rgba(255, 68, 68, 0.2);
		letter-spacing: 0;
		animation: newsPulse 1.6s ease-in-out infinite;
	}

	@keyframes newsPulse {
		0%, 100% { opacity: 0.7; }
		50% { opacity: 1; }
	}

	.news-title {
		font-size: var(--fs-subheading);
		color: var(--text-primary);
		font-weight: 700;
		font-family: var(--font-display);
	}

	.news-orbital {
		font-size: var(--fs-caption-sm);
		color: var(--text-dim);
		font-family: var(--font-tech);
		font-weight: 600;
		margin-left: auto;
	}

	.news-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.85rem;
	}

	.news-card {
		display: flex;
		gap: 0.8rem;
		padding: 0.85rem;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.025), transparent),
			var(--bg-glass);
		border: 1px solid var(--border-neon);
		border-radius: var(--radius-sm);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		position: relative;
		overflow: hidden;
		cursor: default;
	}

	.news-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 1px;
		background: linear-gradient(90deg, transparent, var(--cyan), transparent);
		opacity: 0.2;
	}

	.nc-thumb {
		flex-shrink: 0;
		width: 3rem;
		height: 3rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		background: rgba(24, 25, 56, 0.78);
		border: 1px solid rgba(0, 255, 255, 0.08);
		overflow: hidden;
	}

	.nc-svg {
		width: 2.35rem;
		height: 2.35rem;
	}

	.nc-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.34rem;
		min-width: 0;
	}

	.nc-meta {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		flex-wrap: wrap;
	}

	.nc-cat {
		font-size: var(--fs-caption-sm);
		color: var(--cyan);
		font-family: var(--font-tech);
		font-weight: 700;
		letter-spacing: 0;
		text-transform: uppercase;
	}

	.nc-class {
		font-size: var(--fs-caption-sm);
		font-weight: 600;
		padding: 0.08rem 0.38rem;
		border-radius: 100px;
		letter-spacing: 0;
		line-height: 1.15;
	}

	.nc-class.approved {
		background: rgba(68, 255, 136, 0.08);
		color: var(--green);
	}

	.nc-class.sanitized {
		background: rgba(255, 221, 68, 0.08);
		color: var(--yellow);
	}

	.nc-class.morale {
		background: rgba(0, 255, 255, 0.08);
		color: var(--cyan);
	}

	.nc-class.advisory {
		background: rgba(255, 68, 170, 0.08);
		color: var(--pink);
	}

	.nc-headline {
		font-family: var(--font-display);
		font-size: clamp(0.88rem, 0.85rem + 0.12vw, 0.95rem);
		color: var(--text-primary);
		font-weight: 600;
		line-height: 1.22;
		padding: 0;
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.nc-snippet {
		font-size: clamp(0.7rem, 0.69rem + 0.04vw, 0.76rem);
		color: var(--text-secondary);
		line-height: 1.48;
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.nc-footer {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		flex-wrap: wrap;
		margin-top: auto;
		padding-top: 0.2rem;
	}

	.nc-cycle {
		font-size: var(--fs-caption-sm);
		color: var(--text-dim);
		font-family: var(--font-tech);
		font-weight: 600;
	}

	.nc-divider {
		font-size: var(--fs-caption-sm);
		color: rgba(255, 255, 255, 0.12);
	}

	.nc-timestamp {
		font-size: var(--fs-caption-sm);
		color: var(--text-dim);
		font-family: var(--font-mono);
		font-weight: 500;
	}

	.nc-author {
		font-size: var(--fs-caption-sm);
		color: var(--text-dim);
		font-style: italic;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 12ch;
	}

	.nc-refid {
		font-size: 0.6rem;
		color: rgba(255, 255, 255, 0.08);
		font-family: var(--font-mono);
		letter-spacing: 0.05em;
		margin-top: 0.1rem;
	}

	@media (max-width: 767px) {
		.news-section {
			padding: 0 1rem 1.5rem;
		}

		.news-grid {
			grid-template-columns: 1fr;
			gap: 0.65rem;
		}

		.news-header {
			gap: 0.4rem;
		}

		.news-orbital {
			display: none;
		}

		.news-card {
			padding: 0.78rem;
		}

		.nc-headline {
			-webkit-line-clamp: 3;
			line-clamp: 3;
		}
	}

	@media (min-width: 768px) and (max-width: 1023px) {
		.news-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (min-width: 1440px) {
		.news-grid {
			grid-template-columns: repeat(3, minmax(18rem, 1fr));
		}
	}
</style>
