<script lang="ts">
	let { data } = $props();

	function fmtDate(value: string | null): string {
		if (!value) return '—';
		const t = Date.parse(value);
		return Number.isFinite(t) ? new Date(t).toLocaleString() : value;
	}
</script>

<h2 class="admin-section-title">Users ({data.users.length})</h2>

{#if data.dbError}
	<div class="admin-error">Database unavailable — user list cannot be loaded right now.</div>
{:else if data.users.length === 0}
	<div class="admin-empty">No registered users yet.</div>
{:else}
	<div class="admin-table-wrap">
		<table class="admin-table">
			<thead>
				<tr>
					<th>Username</th>
					<th>Created</th>
					<th>Last login</th>
					<th>Cloud save</th>
					<th>Save updated</th>
					<th>Status</th>
				</tr>
			</thead>
			<tbody>
				{#each data.users as u (u.username)}
					<tr>
						<td>{u.username}</td>
						<td>{fmtDate(u.created_at)}</td>
						<td>{fmtDate(u.last_login_at)}</td>
						<td>
							<span class="admin-badge" class:yes={u.has_cloud_save === 1}>
								{u.has_cloud_save === 1 ? 'yes' : 'no'}
							</span>
						</td>
						<td>{fmtDate(u.cloud_save_updated_at)}</td>
						<td>
							{#if u.disabled_at}
								<span class="admin-badge warn">disabled</span>
							{:else}
								<span class="admin-badge">active</span>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
