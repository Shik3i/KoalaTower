<script lang="ts">
	/**
	 * NotificationCenter.svelte — bell button + dropdown showing the session
	 * notification history (see stores/notificationStore.ts).
	 *
	 * Accessible: keyboard open/close, Escape closes, focus-visible, an
	 * aria-label that announces the unread count, and a badge that shows the
	 * number (not colour-only). Reduced motion is honoured via the global
	 * prefers-reduced-motion CSS rule plus local guards.
	 */
	import Icon from '$lib/components/Icon.svelte';
	import { notifications } from '$lib/stores/notificationStore';

	const unread = notifications.unread;

	let open = $state(false);
	let wrapEl = $state<HTMLDivElement | null>(null);

	function relTime(t: number): string {
		const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
		if (s < 60) return 'just now';
		const m = Math.floor(s / 60);
		if (m < 60) return `${m}m ago`;
		const h = Math.floor(m / 60);
		return `${h}h ago`;
	}

	function toggle(): void {
		open = !open;
		if (open) notifications.markAllRead();
	}

	function close(): void {
		open = false;
	}

	function onKeydown(e: KeyboardEvent): void {
		if (e.key === 'Escape' && open) {
			close();
			(wrapEl?.querySelector('.nc-bell') as HTMLButtonElement | null)?.focus();
		}
	}

	function onPointerDown(e: PointerEvent): void {
		if (!open) return;
		if (e.target instanceof Node && wrapEl && wrapEl.contains(e.target)) return;
		close();
	}
</script>

<svelte:window onkeydown={onKeydown} onpointerdown={onPointerDown} />

<div class="nc-wrap" bind:this={wrapEl}>
	<button
		class="nc-bell"
		onclick={toggle}
		aria-haspopup="true"
		aria-expanded={open}
		aria-label={$unread > 0 ? `Notifications, ${$unread} unread` : 'Notifications'}
	>
		<Icon name="bell" size={17} />
		{#if $unread > 0}
			<span class="nc-badge" aria-hidden="true">{$unread > 99 ? '99+' : $unread}</span>
		{/if}
	</button>

	{#if open}
		<div class="nc-panel" role="dialog" aria-label="Notification history">
			<div class="nc-head">
				<span class="nc-title">Transmissions</span>
				{#if $notifications.length > 0}
					<button class="nc-clear" onclick={() => notifications.clear()}>Clear</button>
				{/if}
			</div>
			<div class="nc-list">
				{#each $notifications as n (n.id)}
					<div class="nc-item nc-{n.kind}">
						<span class="nc-icon" aria-hidden="true">{n.icon}</span>
						<div class="nc-body">
							<div class="nc-it">{n.title}</div>
							{#if n.detail}<div class="nc-id">{n.detail}</div>{/if}
						</div>
						<span class="nc-time">{relTime(n.time)}</span>
					</div>
				{:else}
					<div class="nc-empty">
						<div class="nc-empty-icon" aria-hidden="true">🛰️</div>
						<p class="nc-empty-t">No transmissions logged</p>
						<p class="nc-empty-s">Achievements, unlocks and research updates will appear here.</p>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.nc-wrap { position:relative; display:inline-flex; }
	.nc-bell { position:relative; display:inline-flex; align-items:center; justify-content:center; min-width:44px; min-height:44px; padding:.3rem; color:var(--text-secondary); background:transparent; border:1px solid transparent; border-radius:var(--radius-sm); cursor:pointer; transition:color var(--transition-fast),border-color var(--transition-fast); }
	.nc-bell:hover { color:var(--cyan); }
	.nc-bell:focus-visible { outline:2px solid var(--cyan); outline-offset:2px; }
	.nc-badge { position:absolute; top:1px; right:1px; min-width:16px; height:16px; padding:0 3px; display:flex; align-items:center; justify-content:center; font-family:var(--font-mono); font-size:10px; font-weight:700; line-height:1; color:var(--bg-primary); background:var(--pink); border-radius:8px; box-shadow:0 0 6px rgba(255,68,170,.5); }

	.nc-panel { position:absolute; top:calc(100% + .4rem); right:0; width:min(20rem,86vw); max-height:min(24rem,70vh); display:flex; flex-direction:column; background:var(--bg-glass-strong); border:1px solid var(--border-neon-strong); border-radius:var(--radius-md); box-shadow:0 8px 30px rgba(0,0,0,.5),0 0 14px var(--cyan-glow); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); z-index:600; animation:ncIn .16s ease; overflow:hidden; }
	@media (prefers-reduced-motion: reduce) { .nc-panel { animation:none; } }
	@keyframes ncIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
	.nc-head { display:flex; align-items:center; justify-content:space-between; padding:.55rem .7rem; border-bottom:1px solid var(--border-neon); flex-shrink:0; }
	.nc-title { font-family:var(--font-mono); font-size:var(--fs-caption); letter-spacing:.06em; text-transform:uppercase; color:var(--text-dim); }
	.nc-clear { font-family:var(--font-mono); font-size:var(--fs-caption-sm); color:var(--text-dim); background:transparent; border:none; cursor:pointer; transition:color var(--transition-fast); }
	.nc-clear:hover { color:var(--red); }
	.nc-clear:focus-visible { outline:2px solid var(--cyan); outline-offset:2px; }

	.nc-list { overflow-y:auto; padding:.25rem; }
	.nc-item { display:grid; grid-template-columns:auto minmax(0,1fr) auto; gap:.5rem; align-items:start; padding:.45rem .5rem; border-radius:var(--radius-sm); border-left:2px solid transparent; }
	.nc-item + .nc-item { margin-top:2px; }
	.nc-item:hover { background:rgba(255,255,255,.03); }
	.nc-icon { font-size:1rem; line-height:1.3; }
	.nc-body { min-width:0; }
	.nc-it { font-size:var(--fs-body-sm); color:var(--text-primary); line-height:1.3; }
	.nc-id { font-size:var(--fs-caption-sm); color:var(--text-secondary); font-family:var(--font-mono); line-height:1.3; margin-top:1px; }
	.nc-time { font-size:var(--fs-caption-sm); color:var(--text-dim); font-family:var(--font-mono); white-space:nowrap; }
	.nc-achievement { border-left-color:var(--yellow); }
	.nc-bestWave { border-left-color:var(--green); }
	.nc-frontUnlock { border-left-color:var(--cyan); }
	.nc-blackMarket { border-left-color:var(--pink); }
	.nc-shipment, .nc-contract { border-left-color:var(--pink); }
	.nc-research { border-left-color:var(--cyan); }
	.nc-boss { border-left-color:var(--red); }
	.nc-warning { border-left-color:var(--red); }

	.nc-empty { text-align:center; padding:1.6rem 1rem; }
	.nc-empty-icon { font-size:1.8rem; opacity:.5; margin-bottom:.4rem; }
	.nc-empty-t { font-size:var(--fs-body-sm); color:var(--text-secondary); margin:0 0 .2rem; }
	.nc-empty-s { font-size:var(--fs-caption-sm); color:var(--text-dim); margin:0; line-height:1.4; }
</style>
