<script lang="ts">
	import { page } from '$app/state';
	import { APP_VERSION } from '$lib/version';

	let { data, children } = $props();

	const nav = [
		{ href: '/admin/', label: 'Overview' },
		{ href: '/admin/users/', label: 'Users' },
		{ href: '/admin/kofi/', label: 'Ko-fi' },
		{ href: '/admin/community-buff/', label: 'Community Buff' },
		{ href: '/admin/errors/', label: 'Error Log' }
	];

	const current = $derived(page.url.pathname);
</script>

<svelte:head>
	<title>Admin · Flatland TD</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="admin">
	<header class="admin-head glass-panel">
		<div class="admin-title">
			<h1>Operations</h1>
			<span class="admin-ver">FLTD {APP_VERSION}</span>
		</div>
		<div class="admin-who">
			Signed in as <strong>{data.admin.displayName}</strong>
			<span class="admin-readonly">read-only</span>
		</div>
	</header>

	<nav class="admin-nav" aria-label="Admin sections">
		{#each nav as item (item.href)}
			<a href={item.href} class="admin-link" class:active={current === item.href}>{item.label}</a>
		{/each}
	</nav>

	<main class="admin-body">
		{@render children()}
	</main>
</div>

<style>
	.admin {
		max-width: 1100px;
		margin: 0 auto;
		padding: 1.5rem 1.25rem 3rem;
		color: var(--text-primary);
		min-height: 100vh;
	}

	.admin-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 1.25rem;
		flex-wrap: wrap;
	}

	.admin-title {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
	}

	.admin-title h1 {
		font-size: var(--fs-heading, 1.5rem);
		margin: 0;
		background: linear-gradient(135deg, var(--cyan), var(--blue));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.admin-ver {
		font-family: var(--font-mono);
		font-size: var(--fs-caption);
		color: var(--text-dim);
	}

	.admin-who {
		font-size: var(--fs-body-sm);
		color: var(--text-secondary);
	}

	.admin-who strong {
		color: var(--text-primary);
	}

	.admin-readonly {
		margin-left: 0.5rem;
		font-family: var(--font-mono);
		font-size: var(--fs-caption-sm, 0.7rem);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 0.1rem 0.4rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-neon);
		color: var(--cyan);
	}

	.admin-nav {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
		margin: 1rem 0 1.25rem;
	}

	.admin-link {
		padding: 0.45rem 0.9rem;
		font-size: var(--fs-body-sm);
		font-family: var(--font-mono);
		text-decoration: none;
		color: var(--text-secondary);
		background: var(--bg-tertiary);
		border: 1px solid var(--border-neon);
		border-radius: var(--radius-md);
		transition: all var(--transition-fast);
	}

	.admin-link:hover {
		color: var(--cyan);
		border-color: var(--border-neon-strong);
	}

	.admin-link.active {
		color: var(--bg-primary);
		background: var(--cyan);
		border-color: var(--cyan);
	}

	/* Shared, global building blocks for the admin pages (scoped CSS does not
	   cross into child route components, so these are intentionally :global). */
	:global(.admin-section-title) {
		font-size: var(--fs-subheading, 1.1rem);
		margin: 0 0 0.75rem;
		color: var(--text-primary);
		font-weight: 500;
	}

	:global(.admin-cards) {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	:global(.admin-card) {
		padding: 0.9rem 1rem;
		background: var(--bg-tertiary);
		border: 1px solid var(--border-neon);
		border-radius: var(--radius-md);
	}

	:global(.admin-card .label) {
		display: block;
		font-size: var(--fs-caption);
		color: var(--text-dim);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.3rem;
	}

	:global(.admin-card .value) {
		font-family: var(--font-tech, var(--font-mono));
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--cyan);
		line-height: 1.1;
	}

	:global(.admin-card .sub) {
		display: block;
		font-size: var(--fs-caption-sm, 0.72rem);
		color: var(--text-dim);
		font-family: var(--font-mono);
		margin-top: 0.25rem;
		word-break: break-word;
	}

	:global(.admin-table-wrap) {
		overflow-x: auto;
		border: 1px solid var(--border-neon);
		border-radius: var(--radius-md);
	}

	:global(.admin-table) {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--fs-body-sm);
		font-family: var(--font-mono);
	}

	:global(.admin-table th),
	:global(.admin-table td) {
		text-align: left;
		padding: 0.5rem 0.7rem;
		border-bottom: 1px solid var(--border-neon);
		white-space: nowrap;
		vertical-align: top;
	}

	:global(.admin-table th) {
		color: var(--text-dim);
		text-transform: uppercase;
		font-size: var(--fs-caption);
		letter-spacing: 0.04em;
		position: sticky;
		top: 0;
		background: var(--bg-secondary, var(--bg-tertiary));
	}

	:global(.admin-table tbody tr:hover) {
		background: rgba(0, 255, 255, 0.04);
	}

	:global(.admin-table td.wrap) {
		white-space: normal;
		max-width: 32rem;
	}

	:global(.admin-badge) {
		font-size: var(--fs-caption-sm, 0.72rem);
		padding: 0.05rem 0.4rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-neon);
		color: var(--text-secondary);
	}

	:global(.admin-badge.yes) {
		color: var(--cyan);
		border-color: var(--border-neon-strong);
	}

	:global(.admin-badge.warn) {
		color: var(--pink, #ff44aa);
		border-color: rgba(255, 68, 170, 0.5);
	}

	:global(.admin-empty) {
		padding: 1.25rem;
		text-align: center;
		color: var(--text-dim);
		font-family: var(--font-mono);
		font-size: var(--fs-body-sm);
	}

	:global(.admin-error) {
		padding: 1rem 1.25rem;
		margin-bottom: 1.25rem;
		border: 1px solid rgba(255, 68, 170, 0.5);
		border-radius: var(--radius-md);
		color: var(--pink, #ff44aa);
		font-family: var(--font-mono);
		font-size: var(--fs-body-sm);
	}

	:global(.admin-details) {
		cursor: pointer;
	}

	:global(.admin-details pre) {
		white-space: pre-wrap;
		word-break: break-word;
		margin: 0.4rem 0 0;
		font-size: var(--fs-caption);
		color: var(--text-secondary);
		max-width: 40rem;
	}
</style>
