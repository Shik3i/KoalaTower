<script lang="ts">
	let { data } = $props();

	function fmtDate(value: string | null): string {
		if (!value) return '—';
		const t = Date.parse(value);
		return Number.isFinite(t) ? new Date(t).toLocaleString() : value;
	}
</script>

{#if data.dbError || !data.overview}
	<div class="admin-error">Database unavailable — operational metrics cannot be loaded right now.</div>
{:else}
	{@const o = data.overview}
	<section>
		<h2 class="admin-section-title">Accounts &amp; sessions</h2>
		<div class="admin-cards">
			<div class="admin-card">
				<span class="label">Registered users</span>
				<span class="value">{o.totalUsers}</span>
			</div>
			<div class="admin-card">
				<span class="label">Active sessions</span>
				<span class="value">{o.activeSessions}</span>
				<span class="sub">non-expired</span>
			</div>
			<div class="admin-card">
				<span class="label">Cloud saves</span>
				<span class="value">{o.cloudSaves}</span>
				<span class="sub">latest {fmtDate(o.latestCloudSaveAt)}</span>
			</div>
		</div>
	</section>

	<section>
		<h2 class="admin-section-title">Community buff</h2>
		<div class="admin-cards">
			<div class="admin-card">
				<span class="label">Active buff</span>
				<span class="value">{o.communityBuff.activePercent}%</span>
				<span class="sub">cap {o.communityBuff.capPercent}%</span>
			</div>
			<div class="admin-card">
				<span class="label">Active events</span>
				<span class="value">{o.communityBuff.activeEvents}</span>
				<span class="sub">until {fmtDate(o.communityBuff.activeUntil)}</span>
			</div>
		</div>
	</section>

	<section>
		<h2 class="admin-section-title">Ko-fi &amp; health</h2>
		<div class="admin-cards">
			<div class="admin-card">
				<span class="label">Ko-fi events</span>
				<span class="value">{o.totalKofiEvents}</span>
				<span class="sub">latest {fmtDate(o.latestKofiEventAt)}</span>
			</div>
			<div class="admin-card">
				<span class="label">Error logs</span>
				<span class="value">{o.totalErrorLogs}</span>
				<span class="sub">stored records</span>
			</div>
			<div class="admin-card">
				<span class="label">Database</span>
				<span class="value">{o.dbReachable ? 'OK' : 'DOWN'}</span>
				<span class="sub">app {o.appVersion}</span>
			</div>
		</div>
	</section>
{/if}
