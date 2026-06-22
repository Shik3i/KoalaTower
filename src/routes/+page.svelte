<script lang="ts">
	import { onMount } from 'svelte';
	import { alloyStore, loadedStore } from '$lib/stores/gameUiStore';
	import { SITE_URL } from '$lib/version';
	import FlatlandNews from '$lib/components/FlatlandNews.svelte';
	import { HOME_SUBTITLES, HOME_SUBTITLE_ROTATION_MS, HOME_SUBTITLE_RESERVED_LINES } from '$lib/home/subtitles';

	const jsonLdApp = {
		'@context': 'https://schema.org',
		'@type': 'WebApplication',
		name: 'Flatland TD',
		applicationCategory: 'GameApplication',
		operatingSystem: 'Any',
		description: 'A neon cyber idle tower defense game. Defend your tower against endless waves of digital enemies.',
		url: SITE_URL,
		author: { '@type': 'Person', name: 'Timo' },
		offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
	};

	const jsonLdSite = {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: 'Flatland TD',
		url: SITE_URL,
		description: 'Open source neon cyber idle tower defense. Local-first, offline-friendly, and no tracking.',
		potentialAction: {
			'@type': 'SearchAction',
			target: { '@type': 'EntryPoint', urlTemplate: SITE_URL + '/help/?q={search_term_string}' },
			'query-input': 'required name=search_term_string',
		},
	};

	let coins = $state(0);
	let saveLoaded = $state(false);

	onMount(() => {
		const unsub1 = alloyStore.subscribe(c => coins = c);
		const unsub2 = loadedStore.subscribe(l => saveLoaded = l);
		return () => { unsub1(); unsub2(); };
	});

	let stars = Array.from({length: 60}, () => ({
		x: Math.random() * 100,
		y: Math.random() * 100,
		size: 0.5 + Math.random() * 2,
		delay: Math.random() * 5,
	}));

	let subtitleIdx = $state(0);

	onMount(() => {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const interval = setInterval(() => {
			subtitleIdx = (subtitleIdx + 1) % HOME_SUBTITLES.length;
		}, HOME_SUBTITLE_ROTATION_MS);
		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Flatland TD · FLTD — Open Source Neon Cyber Idle Tower Defense</title>
	<meta name="description" content="Deploy towers from orbit into hostile geometric fronts. Research permanent upgrades on your Orbital Command. Open source neon cyber idle tower defense. No tracking." />
	<meta property="og:title" content="Flatland TD — Deploy Now" />
	<meta property="og:description" content="Deploy towers from orbit into hostile geometric fronts. Research permanent upgrades on your Orbital Command." />
	<script type="application/ld+json">{JSON.stringify(jsonLdApp)}</script>
	<script type="application/ld+json">{JSON.stringify(jsonLdSite)}</script>
</svelte:head>

<main class="home">
	<div class="bg-grid" aria-hidden="true"></div>
	{#each stars as star}
		<div
			class="star"
			aria-hidden="true"
			style="left: {star.x}%; top: {star.y}%; width: {star.size}px; height: {star.size}px; animation-delay: {star.delay}s;"
		></div>
	{/each}

	<div class="hero">
		<div class="hero-content">
			<h1 class="title">
				<img class="hero-logo" src="/branding/flatland-logo-large.svg" alt="Flatland TD logo" />
			</h1>
			<p class="subtitle" style="--subtitle-lines:{HOME_SUBTITLE_RESERVED_LINES}">{HOME_SUBTITLES[subtitleIdx]}</p>
			<p class="description">
				Flatland is at war. Deploy towers from orbit onto hostile geometric fronts,
				harvest energy from destroyed shapes to overclock your tower,
				and refine alloy for permanent upgrades aboard Orbital Command.
				Each front is a new battlefield. The tower is lost with every drop.
			</p>
			<div class="cta-buttons">
				<a href="/play" class="btn-primary" class:btn-disabled={!saveLoaded} aria-disabled={!saveLoaded}>
					<span class="btn-icon">{saveLoaded ? '▶' : ''}</span>
					<span class="btn-label">Deploy</span>
					{#if !saveLoaded}<span class="btn-spinner"></span>{/if}
				</a>
				<a href="/hub" class="btn-primary btn-accent" class:btn-disabled={!saveLoaded} aria-disabled={!saveLoaded}>
					<span class="btn-icon">{saveLoaded ? '🛰️' : ''}</span>
					<span class="btn-label">Orbital Command</span>
					{#if !saveLoaded}<span class="btn-spinner"></span>{/if}
				</a>
				<a href="/help" class="btn-secondary">
					<span>❓</span> Help
				</a>
			</div>
			{#if coins > 0}
				<div class="alloy-display">
					<span class="alloy-icon">🔩</span>
					<span class="alloy-amount">{coins.toLocaleString()}</span>
					<span class="alloy-label">Alloy</span>
				</div>
			{/if}
		</div>
	</div>

	<div class="features">
		<div class="feature-card">
			<div class="feature-icon-wrap">
				<div class="feature-icon-bg" style="background: linear-gradient(135deg, rgba(0,255,255,0.15), rgba(68,136,255,0.05));"></div>
				<span class="feature-icon">🏗️</span>
			</div>
			<h3>Build & Upgrade</h3>
			<p>Overclock your Tower with temporary Field Upgrades mid-deployment. Permanent Forge improvements between deployments. Procurement approves this spending. Mostly.</p>
		</div>
		<div class="feature-card">
			<div class="feature-icon-wrap">
				<div class="feature-icon-bg" style="background: linear-gradient(135deg, rgba(68,255,136,0.15), rgba(0,255,255,0.05));"></div>
				<span class="feature-icon">🌊</span>
			</div>
			<h3>Endless Waves</h3>
			<p>Hostile geometry scales indefinitely. Five shape types, increasing density, and the distinct sensation that the swarm has a plan. It does not. Probably.</p>
		</div>
		<div class="feature-card">
			<div class="feature-icon-wrap">
				<div class="feature-icon-bg" style="background: linear-gradient(135deg, rgba(136,68,255,0.15), rgba(255,68,170,0.05));"></div>
				<span class="feature-icon">🔬</span>
			</div>
			<h3>Research & Progress</h3>
			<p>Unlock new Fronts, run orbital Research Deck projects (results sanitized for morale), and attempt Simulations that may not be simulations. The war waits for nobody. Especially not Accounting.</p>
		</div>
	</div>

	<FlatlandNews />

	<div class="signal-strip" aria-label="Project values">
		<span><strong>Free</strong> open source</span>
		<span><strong>Zero</strong> tracking</span>
		<span><strong>Local</strong> saves</span>
	</div>
</main>

<style>
	.home {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		background:
			linear-gradient(180deg, rgba(7, 8, 18, 0.72) 0%, var(--bg-primary) 34rem),
			linear-gradient(115deg, rgba(68, 255, 136, 0.08), transparent 32rem),
			linear-gradient(245deg, rgba(255, 136, 68, 0.07), transparent 28rem),
			var(--bg-primary);
		overflow-y: auto;
		position: relative;
	}



	.star {
		position: fixed;
		border-radius: 50%;
		background: var(--cyan);
		pointer-events: none;
		z-index: 0;
		animation: twinkle 3s ease-in-out infinite;
		opacity: 0;
	}

	@keyframes twinkle {
		0%, 100% { opacity: 0; }
		30% { opacity: 0.4; }
		60% { opacity: 0.8; }
	}

	.hero {
		position: relative;
		width: 100%;
		padding: clamp(3rem, 7vh, 5.75rem) clamp(1rem, 3vw, 2rem) clamp(2rem, 5vh, 3.5rem);
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		overflow: hidden;
		z-index: 1;
	}

	.hero-content {
		position: relative;
		z-index: 1;
		width: min(var(--content-max), 100%);
		animation: fadeInUp 0.6s ease;
	}

	.title {
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 0.75rem;
	}

	.hero-logo {
		width: 100%;
		max-width: clamp(18rem, 45vw, 40rem);
		height: auto;
		filter: drop-shadow(0 0 20px rgba(0, 255, 255, 0.15));
	}

	.subtitle {
		font-size: var(--fs-heading);
		color: var(--text-secondary);
		font-family: var(--font-display);
		font-weight: 600;
		margin: 0 auto 1.35rem;
		max-width: 48rem;
		min-height: calc(var(--subtitle-lines, 2) * 1.25em);
		display: flex;
		align-items: center;
		justify-content: center;
		letter-spacing: 0;
		line-height: 1.25;
		animation: fadeInUp 0.4s ease;
		transition: opacity 0.3s ease;
	}

	.description {
		color: var(--text-secondary);
		font-size: var(--fs-body);
		line-height: 1.72;
		margin-bottom: 1.15rem;
		max-width: var(--measure);
		margin-left: auto;
		margin-right: auto;
	}

	.signal-strip {
		display: inline-grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1px;
		margin: 0 auto 1.6rem;
		border: 1px solid rgba(0, 255, 255, 0.18);
		background: rgba(0, 255, 255, 0.12);
		border-radius: 8px;
		overflow: hidden;
	}

	.signal-strip span {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: clamp(7.5rem, 16vw, 11rem);
		padding: 0.55rem 0.75rem;
		background: rgba(7, 8, 18, 0.76);
		color: var(--text-secondary);
		font-size: var(--fs-caption);
		line-height: 1.2;
	}

	.signal-strip strong {
		color: var(--green);
		font-family: var(--font-display);
		font-size: var(--fs-body);
		line-height: 1;
	}

	.cta-buttons {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
		flex-wrap: wrap;
		margin-bottom: 1.5rem;
	}

	.btn-primary {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		min-height: 2.9rem;
		padding: 0.78rem clamp(1.15rem, 2vw, 1.7rem);
		border-radius: 8px;
		font-weight: 700;
		font-size: var(--fs-btn);
		font-family: var(--font-display);
		transition: all var(--transition-normal);
		text-decoration: none;
		cursor: pointer;
		background: linear-gradient(135deg, var(--cyan), var(--blue));
		color: var(--bg-primary);
		box-shadow: 0 0 24px rgba(0, 255, 255, 0.25);
		position: relative;
		overflow: hidden;
	}

	.btn-primary::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent);
		opacity: 0;
		transition: opacity var(--transition-normal);
	}

	.btn-primary:hover {
		box-shadow: 0 0 40px rgba(0, 255, 255, 0.4);
		transform: translateY(-2px);
	}

	.btn-disabled {
		pointer-events: none;
		opacity: 0.55;
	}

	.btn-spinner {
		display: inline-block;
		width: 14px;
		height: 14px;
		border: 2px solid rgba(7,8,18,.4);
		border-top-color: var(--bg-primary);
		border-radius: 50%;
		animation: btnSpin .6s linear infinite;
		margin-left: 4px;
	}

	@keyframes btnSpin {
		to { transform: rotate(360deg); }
	}

	.btn-primary:hover::before {
		opacity: 1;
	}

	.btn-secondary {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		min-height: 2.9rem;
		padding: 0.78rem clamp(1.15rem, 2vw, 1.7rem);
		border-radius: 8px;
		font-weight: 600;
		font-size: var(--fs-btn);
		font-family: var(--font-display);
		transition: all var(--transition-normal);
		text-decoration: none;
		cursor: pointer;
		background: rgba(0, 255, 255, 0.05);
		color: var(--text-secondary);
		border: 1px solid var(--border-neon);
	}

	.btn-secondary:hover {
		border-color: var(--cyan);
		color: var(--text-primary);
		background: rgba(0, 255, 255, 0.08);
		box-shadow: 0 0 20px rgba(0, 255, 255, 0.15);
		transform: translateY(-2px);
	}

	.btn-accent { background: linear-gradient(135deg, var(--violet), var(--pink)); box-shadow: 0 0 20px rgba(136, 68, 255, 0.2); }

	.btn-icon {
		font-size: 0.9rem;
	}

	.alloy-display {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 1.25rem;
		background: rgba(255, 221, 68, 0.06);
		border: 1px solid rgba(255, 221, 68, 0.2);
		border-radius: 100px;
		font-family: var(--font-mono);
		font-size: var(--fs-body);
		animation: fadeInUp 0.4s ease;
	}

	.alloy-icon {
		font-size: var(--fs-icon-md);
	}

	.alloy-amount {
		color: var(--yellow);
		font-weight: 600;
	}

	.alloy-label {
		color: var(--text-dim);
		font-size: var(--fs-body-sm);
	}

	.features {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1rem;
		padding: 1rem clamp(1rem, 3vw, 2rem) 3rem;
		max-width: var(--content-max);
		width: 100%;
		z-index: 1;
	}

	.feature-card {
		background: var(--bg-glass);
		border: 1px solid var(--border-neon);
		border-radius: 8px;
		padding: 1.35rem;
		text-align: left;
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		transition: all var(--transition-normal);
		position: relative;
		overflow: hidden;
	}

	.feature-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 1px;
		background: linear-gradient(90deg, transparent, var(--cyan), transparent);
		opacity: 0.3;
	}

	.feature-card:hover {
		border-color: var(--border-neon-strong);
		transform: translateY(-3px);
		box-shadow: var(--shadow-neon-md);
	}

	.feature-icon-wrap {
		position: relative;
		width: 56px;
		height: 56px;
		margin: 0 0 1rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.feature-icon-bg {
		position: absolute;
		inset: 0;
		border-radius: 8px;
	}

	.feature-icon {
		font-size: var(--fs-icon-xl);
		position: relative;
		z-index: 1;
	}

	.feature-card h3 {
		font-size: var(--fs-subheading);
		margin-bottom: 0.5rem;
		color: var(--cyan);
		font-family: var(--font-display);
	}

	.feature-card p {
		font-size: var(--fs-body-sm);
		color: var(--text-secondary);
		line-height: 1.62;
	}

	@media (max-width: 767px) {
		.hero {
			padding: 1.5rem 1rem 1rem;
		}
		.title {
			margin-bottom: 0.5rem;
		}
		.hero-logo {
			max-width: min(15.5rem, 82vw);
		}
		.subtitle {
			margin-bottom: 0.8rem;
			min-height: calc(var(--subtitle-lines, 2) * 1.3em);
			line-height: 1.3;
		}
		.description {
			line-height: 1.58;
			margin-bottom: 0.85rem;
		}
		.signal-strip {
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			width: min(100%, 22rem);
			margin-bottom: 1rem;
		}
		.signal-strip span {
			min-width: 0;
			padding: 0.45rem 0.35rem;
		}
		.cta-buttons {
			display: grid;
			grid-template-columns: 1fr;
			gap: 0.55rem;
			margin-bottom: 1rem;
		}
		.btn-primary,
		.btn-secondary {
			width: 100%;
			justify-content: center;
			min-height: 2.65rem;
			padding: 0.65rem 0.75rem;
		}
		.features {
			padding: 1rem 1rem 1.5rem;
			grid-template-columns: 1fr;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.subtitle {
			animation: none;
			transition: none;
		}
	}

	@media (min-width: 768px) and (max-width: 1023px) {
		.features {
			grid-template-columns: 1fr;
			max-width: 42rem;
		}
	}
</style>
