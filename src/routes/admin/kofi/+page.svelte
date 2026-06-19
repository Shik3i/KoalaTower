<script lang="ts">
	let { data } = $props();

	function fmtDate(value: string | null): string {
		if (!value) return '—';
		const t = Date.parse(value);
		return Number.isFinite(t) ? new Date(t).toLocaleString() : value;
	}
</script>

<h2 class="admin-section-title">Ko-fi events ({data.events.length})</h2>

{#if data.dbError}
	<div class="admin-error">Database unavailable — Ko-fi events cannot be loaded right now.</div>
{:else if data.events.length === 0}
	<div class="admin-empty">No Ko-fi events recorded.</div>
{:else}
	<div class="admin-table-wrap">
		<table class="admin-table">
			<thead>
				<tr>
					<th>Created</th>
					<th>Message ID</th>
					<th>Amount</th>
					<th>Currency</th>
					<th>Support code</th>
					<th>Matched owner</th>
					<th>Buff created</th>
				</tr>
			</thead>
			<tbody>
				{#each data.events as e (e.message_id)}
					<tr>
						<td>{fmtDate(e.created_at)}</td>
						<td>{e.message_id}</td>
						<td>{e.amount}</td>
						<td>{e.currency || '—'}</td>
						<td>{e.support_code ?? '—'}</td>
						<td>{e.matched_owner_type ?? '—'}</td>
						<td>
							<span class="admin-badge" class:yes={e.buff_created === 1}>
								{e.buff_created === 1 ? 'yes' : 'no'}
							</span>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<p class="admin-empty" style="text-align:left; padding:0.75rem 0 0;">
		Verification tokens and raw payload fields are never shown. Idempotency is enforced by a unique
		message id, so duplicate webhooks are not stored.
	</p>
{/if}
