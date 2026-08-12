<script lang="ts">
	import { formatCommunityBuffPercent } from '$lib/online/communityBuffClient';
	import { APP_VERSION } from '$lib/version';
	import { CURRENT_SCHEMA_VERSION } from '$lib/game/save/saveTypes';
	import { isValidUsername, isValidPassword, isValidDisplayName } from '$lib/online/authValidation';
	import Icon from '$lib/components/Icon.svelte';
	import { tooltip } from '$lib/components/tooltip';
	import type { LocalPlayerIdentity } from '$lib/online/localIdentity';
	import type { AccountInfo, AuthFormResult } from '$lib/online/accountClient';
	import type { CloudSaveMetadata } from '$lib/online/cloudSaveClient';

	let {
		// Bindables
		localProfileName = $bindable(),
		loginUsername = $bindable(),
		loginPassword = $bindable(),
		regUsername = $bindable(),
		regDisplayName = $bindable(),
		regPassword = $bindable(),
		regConfirm = $bindable(),
		authMode = $bindable(),
		showLoginPassword = $bindable(),
		showRegPassword = $bindable(),
		showRegConfirm = $bindable(),
		showRestoreConfirm = $bindable(),
		authError = $bindable(),

		// Plain props
		communityBuff,
		nowTick,
		localProfile,
		localProfileStatus,
		account,
		accountLoaded,
		authBusy,
		cloudChecked,
		cloudExists,
		cloudMeta,
		cloudError,
		cloudBusy,
		cloudSyncStatus,
		supportCode,
		supportCodeCopied,

		// Callbacks
		saveLocalProfile,
		handleLogout,
		refreshCloudStatus,
		confirmUploadCloud,
		handleLogin,
		handleRegister,
		copySupportCode,
		handleDeleteAccount
	}: {
		// Bindable Form Fields
		localProfileName: string;
		loginUsername: string;
		loginPassword: string;
		regUsername: string;
		regDisplayName: string;
		regPassword: string;
		regConfirm: string;
		authMode: 'login' | 'register';
		showLoginPassword: boolean;
		showRegPassword: boolean;
		showRegConfirm: boolean;
		showRestoreConfirm: boolean;
		authError: string | null;

		// Plain State
		communityBuff: any;
		nowTick: number;
		localProfile: LocalPlayerIdentity | null;
		localProfileStatus: string;
		account: AccountInfo | null;
		accountLoaded: boolean;
		authBusy: boolean;
		cloudChecked: boolean;
		cloudExists: boolean;
		cloudMeta: CloudSaveMetadata | null;
		cloudError: string | null;
		cloudBusy: boolean;
		cloudSyncStatus: { type: string; text: string; icon: string; color: string };
		supportCode: { code: string; ownerType: string } | null;
		supportCodeCopied: boolean;

		// Callback Functions
		saveLocalProfile: () => void;
		handleLogout: () => void;
		refreshCloudStatus: () => void;
		confirmUploadCloud: () => void;
		handleLogin: () => void;
		handleRegister: () => void;
		copySupportCode: () => void;
		handleDeleteAccount: (password: string) => Promise<AuthFormResult>;
	} = $props();

	// Local Form Validation Derived Info
	let localProfileNameValid = $derived(isValidDisplayName(localProfileName));
	let showLocalProfileNameWarn = $derived(localProfileName.length > 0 && !localProfileNameValid);

	let regUsernameValid = $derived(isValidUsername(regUsername));
	let showRegUsernameWarn = $derived(regUsername.length > 0 && !regUsernameValid);

	let regDisplayNameValid = $derived(regDisplayName.length === 0 || isValidDisplayName(regDisplayName));
	let showRegDisplayNameWarn = $derived(regDisplayName.length > 0 && !regDisplayNameValid);

	let regConfirmMatch = $derived(regPassword === regConfirm);
	let showRegConfirmWarn = $derived(regConfirm.length > 0 && !regConfirmMatch);

	let canSubmitLogin = $derived(loginUsername.trim().length > 0 && loginPassword.trim().length > 0 && !authBusy);
	let canSubmitRegister = $derived(regUsernameValid && regDisplayNameValid && isValidPassword(regPassword) && regConfirmMatch && !authBusy);

	// Password strength heuristic
	function getPasswordStrength(p: string): { score: number; label: string; color: string } {
		if (p.length === 0) return { score: 0, label: '', color: '' };
		if (p.length < 10) return { score: 1, label: 'Too short', color: 'var(--red)' };
		
		let score = 2;
		const hasUpper = /[A-Z]/.test(p);
		const hasLower = /[a-z]/.test(p);
		const hasDigit = /[0-9]/.test(p);
		const hasSpecial = /[^A-Za-z0-9]/.test(p);
		
		const varieties = [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;
		if (varieties >= 3 && p.length >= 12) {
			score = 4;
		} else if (varieties >= 2 || p.length >= 12) {
			score = 3;
		}
		
		if (score === 2) return { score, label: 'Weak', color: 'var(--orange)' };
		if (score === 3) return { score, label: 'Medium', color: 'var(--yellow)' };
		return { score, label: 'Strong', color: 'var(--green)' };
	}

	let regPasswordStrength = $derived(getPasswordStrength(regPassword));
	let showDeleteAccount = $state(false);
	let deletePassword = $state('');
	let deleteAcknowledged = $state(false);
	let deleteError = $state('');
	let deleteBusy = $state(false);

	function switchAuthMode(mode: 'login' | 'register') {
		authMode = mode;
		authError = null;
		loginUsername = '';
		loginPassword = '';
		regUsername = '';
		regDisplayName = '';
		regPassword = '';
		regConfirm = '';
		showLoginPassword = false;
		showRegPassword = false;
		showRegConfirm = false;
	}

	function formatDuration(ms: number): string {
		const totalMinutes = Math.ceil(Math.max(0, ms) / 60000);
		const days = Math.floor(totalMinutes / 1440);
		const hours = Math.floor((totalMinutes % 1440) / 60);
		const minutes = totalMinutes % 60;
		if (days > 0) return `${days}d ${hours}h`;
		if (hours > 0) return `${hours}h ${minutes}m`;
		return `${minutes}m`;
	}

	function cancelDeleteAccount() {
		showDeleteAccount = false;
		deletePassword = '';
		deleteAcknowledged = false;
		deleteError = '';
	}

	async function submitDeleteAccount() {
		if (!deleteAcknowledged || deletePassword.length === 0 || deleteBusy) return;
		deleteBusy = true;
		deleteError = '';
		try {
			const result = await handleDeleteAccount(deletePassword);
			if (result.ok) cancelDeleteAccount();
			else deleteError = result.message;
		} finally {
			deleteBusy = false;
		}
	}
</script>

<div class="hs">
	<h2 class="hst">👤 Profile</h2>
	
	{#if communityBuff.loaded && communityBuff.percent > 0}
		{@const buffRemaining = communityBuff.activeUntil ? Math.max(0, Date.parse(communityBuff.activeUntil) - nowTick) : 0}
		<div class="community-buff" use:tooltip={'Community Alloy Boost\nFueled by Ko-fi community support. Applies to every player, every deployment.\nOffline? You simply get the base Alloy — nothing breaks.'}>
			<span class="cb-icon">🛰️</span>
			<div class="cb-body">
				<div class="cb-title">Community Alloy Boost <span class="cb-pct">{formatCommunityBuffPercent(communityBuff.percent)}</span></div>
				<div class="cb-desc">Fueled by Ko-fi support. Applies to all players.{#if buffRemaining > 0} Active for {formatDuration(buffRemaining)}.{/if}</div>
			</div>
		</div>
	{/if}

	<div class="local-profile">
		<div class="local-profile-copy">
			<h3>Local Profile</h3>
			<p>Used for local play and unverified online features.</p>
			<p>Register later to keep badges, cloud saves, guilds, and verified challenge scores across devices.</p>
		</div>
		<form class="local-profile-form" onsubmit={(e) => { e.preventDefault(); saveLocalProfile(); }}>
			<label class="local-profile-label" for="local-profile-name">Display name</label>
			<div class="local-profile-row">
				<input id="local-profile-name" bind:value={localProfileName} maxlength="32" autocomplete="nickname" />
				<button class="hub-action" type="submit" disabled={!localProfileNameValid || localProfileName.trim().length === 0}>Save</button>
			</div>
			{#if showLocalProfileNameWarn}
				<span class="auth-hint-err" style="margin-top: 0; margin-bottom: 0.2rem;">Display name must be 1-32 safe characters.</span>
			{/if}
			<div class="local-profile-status">
				<span>{localProfile?.displayName ?? 'Flatland Player'}</span>
				<span>{localProfileStatus === 'synced' ? 'Optional online sync ready' : localProfileStatus === 'offline' ? 'Offline/local only' : localProfileStatus === 'rejected' ? 'Local only' : 'Not logged in'}</span>
			</div>
		</form>
	</div>

	<div class="account-panel">
		{#if account}
			<h3>Account: {account.displayName}</h3>
			<p class="acct-status">Logged in as <strong>{account.username}</strong>. Cloud saves and future verified features use this account. Local play keeps working if you log out or go offline.</p>
			<button class="hub-action" onclick={handleLogout} disabled={authBusy}>{authBusy ? 'Working…' : 'Log out'}</button>
			<div class="account-delete">
				<h4>Delete Account</h4>
				<p class="cloud-desc">Permanently deletes the account, sessions, cloud save, supporter links, and linked server identity data. Existing community leaderboard rows remain only as <strong>Deleted account</strong>.</p>
				{#if !showDeleteAccount}
					<button class="hub-action hub-danger" onclick={() => showDeleteAccount = true} disabled={authBusy}>Delete account…</button>
				{:else}
					<form class="delete-form" onsubmit={(event) => { event.preventDefault(); void submitDeleteAccount(); }}>
						<label class="local-profile-label">Current password
							<input type="password" bind:value={deletePassword} autocomplete="current-password" placeholder="Confirm with password" />
						</label>
						<label class="delete-check"><input type="checkbox" bind:checked={deleteAcknowledged} /> I understand this cannot be undone.</label>
						{#if deleteError}<p class="auth-err">{deleteError}</p>{/if}
						<div class="cloud-actions">
							<button class="hub-action hub-danger" type="submit" disabled={!deleteAcknowledged || deletePassword.length === 0 || deleteBusy || authBusy}>{deleteBusy ? 'Deleting…' : 'Delete permanently'}</button>
							<button class="hub-action" type="button" onclick={cancelDeleteAccount} disabled={deleteBusy}>Cancel</button>
						</div>
					</form>
				{/if}
			</div>
			<div class="cloud-section">
				<h4>Cloud Save</h4>
				<p class="cloud-desc">Manual backup/sync. Cloud save never auto-overwrites your local data — you choose when to upload or restore.</p>
				
				<div class="cloud-status-block" style="border-color: {cloudSyncStatus.color}; background: rgba({cloudSyncStatus.type === 'error' ? '255,68,68' : cloudSyncStatus.type === 'success' ? '68,255,136' : '255,221,68'}, 0.05)">
					<span class="cloud-status-icon">{cloudSyncStatus.icon}</span>
					<span class="cloud-status-text" style="color: {cloudSyncStatus.color}">{cloudSyncStatus.text}</span>
				</div>

				<details class="cloud-details">
					<summary>Technical Details</summary>
					<div class="cloud-meta">
						<div class="ir"><span class="il">Local save</span><span class="iv">Schema v{CURRENT_SCHEMA_VERSION} · {APP_VERSION || 'DEV'}</span></div>
						<div class="ir"><span class="il">Cloud backup</span><span class="iv">{cloudChecked ? (cloudExists ? 'Exists' : 'None') : 'Not checked yet'}</span></div>
						{#if cloudMeta}
							<div class="ir"><span class="il">Cloud updated</span><span class="iv">{new Date(cloudMeta.updatedAt).toLocaleString()}</span></div>
							<div class="ir"><span class="il">Cloud schema</span><span class="iv">v{cloudMeta.schemaVersion} · {cloudMeta.gameVersion}</span></div>
						{/if}
					</div>
				</details>

				{#if cloudError}<p class="cloud-err">{cloudError}</p>{/if}
				<div class="cloud-actions">
					<button class="hub-action" onclick={() => refreshCloudStatus()} disabled={cloudBusy}>{cloudBusy ? 'Working…' : 'Refresh Status'}</button>
					<button class="btn-primary" onclick={confirmUploadCloud} disabled={cloudBusy}>Upload Local Save</button>
					<button class="hub-action hub-danger" onclick={() => showRestoreConfirm = true} disabled={cloudBusy || !cloudExists}>Restore Cloud Save</button>
				</div>
			</div>
		{:else if accountLoaded}
			<h3>Account (optional)</h3>
			<p class="acct-status">Account login is optional. Normal play stays local-first. Use an account for cloud saves and future verified/guild features.</p>
			<div class="auth-tabs">
				<button class="auth-tab" class:on={authMode === 'login'} onclick={() => switchAuthMode('login')}>Log in</button>
				<button class="auth-tab" class:on={authMode === 'register'} onclick={() => switchAuthMode('register')}>Register</button>
			</div>
			{#if authMode === 'login'}
				<form class="auth-form" onsubmit={(e) => { e.preventDefault(); void handleLogin(); }}>
					<label class="local-profile-label">
						Username
						<div class="auth-input-wrapper">
							<Icon name="user" class="auth-prefix-icon" size={16} />
							<input bind:value={loginUsername} autocomplete="username" placeholder="Username" />
						</div>
					</label>
					<label class="local-profile-label">
						Password
						<div class="auth-input-wrapper">
							<Icon name="lock" class="auth-prefix-icon" size={16} />
							<input type={showLoginPassword ? 'text' : 'password'} bind:value={loginPassword} autocomplete="current-password" placeholder="Password" />
							<button type="button" class="auth-suffix-btn" onclick={() => showLoginPassword = !showLoginPassword} aria-label={showLoginPassword ? 'Hide password' : 'Show password'}>
								<Icon name={showLoginPassword ? 'eyeOff' : 'eye'} size={16} />
							</button>
						</div>
					</label>
					<div class="auth-forgot-password-wrap">
						<button type="button" class="auth-forgot-password-btn" use:tooltip={'Password recovery is coming soon!\nContact support if you need immediate assistance.'}>
							Forgot password?
						</button>
					</div>
					{#if authError}<p class="auth-err">{authError}</p>{/if}
					<button class="btn-primary" type="submit" style="margin-top:0.5rem;" disabled={!canSubmitLogin}>{authBusy ? 'Working…' : 'Log in'}</button>
					<p class="auth-session-hint">ℹ️ Stays logged in on this browser (via secure session cookie).</p>
				</form>
			{:else}
				<form class="auth-form" onsubmit={(e) => { e.preventDefault(); void handleRegister(); }}>
					<label class="local-profile-label">
						Username
						<div class="auth-input-wrapper">
							<Icon name="user" class="auth-prefix-icon" size={16} />
							<input bind:value={regUsername} autocomplete="username" placeholder="Username (letters, numbers, underscores)" />
						</div>
						{#if showRegUsernameWarn}
							<span class="auth-hint-err">Username must be 3-24 characters using letters, numbers, or underscores.</span>
						{:else if regUsername.length > 0 && regUsernameValid}
							<span class="auth-hint-ok">Username format valid.</span>
						{/if}
					</label>
					<label class="local-profile-label">
						Display name (optional)
						<div class="auth-input-wrapper">
							<Icon name="user" class="auth-prefix-icon" size={16} />
							<input bind:value={regDisplayName} autocomplete="nickname" maxlength="32" placeholder="Public display name" />
						</div>
						{#if showRegDisplayNameWarn}
							<span class="auth-hint-err">Display name must be 1-32 safe characters.</span>
						{/if}
					</label>
					<label class="local-profile-label">
						Password
						<div class="auth-input-wrapper">
							<Icon name="lock" class="auth-prefix-icon" size={16} />
							<input type={showRegPassword ? 'text' : 'password'} bind:value={regPassword} autocomplete="new-password" placeholder="Password (min 10 characters)" />
							<button type="button" class="auth-suffix-btn" onclick={() => showRegPassword = !showRegPassword} aria-label={showRegPassword ? 'Hide password' : 'Show password'}>
								<Icon name={showRegPassword ? 'eyeOff' : 'eye'} size={16} />
							</button>
						</div>
						{#if regPassword.length > 0 && regPassword.length < 10}
							<span class="auth-hint-err">Password must be at least 10 characters.</span>
						{/if}
						{#if regPassword.length > 0}
							<div class="strength-meter">
								<div class="strength-bar-track">
									<div class="strength-bar-fill" style="width: {regPasswordStrength.score * 25}%; background-color: {regPasswordStrength.color}"></div>
								</div>
								<span class="strength-label" style="color: {regPasswordStrength.color}">{regPasswordStrength.label}</span>
							</div>
						{/if}
					</label>
					<label class="local-profile-label">
						Confirm password
						<div class="auth-input-wrapper">
							<Icon name="lock" class="auth-prefix-icon" size={16} />
							<input type={showRegConfirm ? 'text' : 'password'} bind:value={regConfirm} autocomplete="new-password" placeholder="Confirm password" />
							<button type="button" class="auth-suffix-btn" onclick={() => showRegConfirm = !showRegConfirm} aria-label={showRegConfirm ? 'Hide password' : 'Show password'}>
								<Icon name={showRegConfirm ? 'eyeOff' : 'eye'} size={16} />
							</button>
						</div>
						{#if showRegConfirmWarn}
							<span class="auth-hint-err">Passwords do not match.</span>
						{:else if regConfirm.length > 0 && regConfirmMatch}
							<span class="auth-hint-ok">Passwords match.</span>
						{/if}
					</label>
					{#if authError}<p class="auth-err">{authError}</p>{/if}
					<button class="btn-primary" type="submit" style="margin-top:0.5rem;" disabled={!canSubmitRegister}>{authBusy ? 'Working…' : 'Register'}</button>
				</form>
			{/if}
		{:else}
			<p class="acct-status">Checking account status…</p>
		{/if}
	</div>

	<div class="support-code">
		<h3>Supporter Identity</h3>
		<p class="sc-desc">Paste this code into your Ko-fi message if you support Flatland TD and want future supporter cosmetics or badges linked to your game profile.</p>
		<p class="sc-note">The Community Alloy Boost applies to everyone even without a code. Register first if you want future supporter rewards to survive browser data deletion.</p>
		{#if supportCode}
			<div class="sc-row">
				<code class="sc-code">{supportCode.code}</code>
				<button class="hub-action" onclick={copySupportCode}>{supportCodeCopied ? 'Copied' : 'Copy'}</button>
			</div>
			<p class="sc-owner">{supportCode.ownerType === 'account' ? '✓ Linked to your account.' : 'Local anonymous identity — register above to make it account-linked.'}</p>
		{:else}
			<p class="sc-owner">Generating…</p>
		{/if}
	</div>
</div>

<style>
	.hs { animation:fi .2s ease; }
	.hst { font-size:var(--fs-heading); color:var(--cyan); margin-bottom:.4rem; }
	
	/* Community Alloy Boost widget */
	.community-buff { display:flex; align-items:center; gap:.6rem; max-width:760px; margin-bottom:1rem; padding:.6rem .8rem; background:linear-gradient(135deg,rgba(0,255,136,.05),rgba(0,0,0,.04)); border:1px solid rgba(0,255,136,.22); border-radius:var(--radius-sm); }
	.cb-icon { font-size:var(--fs-mono-lg); }
	.cb-title { font-size:var(--fs-body-sm); color:var(--text-primary); font-family:var(--font-display); }
	.cb-pct { color:var(--green); font-family:var(--font-mono); margin-left:.25rem; }
	.cb-desc { font-size:var(--fs-caption-sm); color:var(--text-secondary); margin-top:.1rem; }
	
	.local-profile { display:grid; grid-template-columns:minmax(0,1fr) minmax(240px,320px); gap:1rem; max-width:800px; margin-bottom:1rem; padding:.85rem; background:rgba(0,0,0,.14); border:1px solid var(--border-neon); border-radius:var(--radius-sm); }
	.local-profile h3 { margin:0 0 .25rem; font-size:var(--fs-body); color:var(--text-primary); font-family:var(--font-display); }
	.local-profile p { margin:.15rem 0; color:var(--text-secondary); font-size:var(--fs-caption); line-height:1.35; }
	
	.local-profile-form { display:flex; flex-direction:column; gap:.35rem; }
	.local-profile-label { color:var(--text-secondary); font-size:var(--fs-caption); font-family:var(--font-mono); }
	
	.local-profile-row { display:flex; gap:.45rem; align-items:center; }
	.local-profile-row input { min-width:0; flex:1; background:var(--bg-primary); color:var(--text-primary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); padding:.45rem .55rem; font:inherit; }
	.local-profile-row .hub-action { margin:0; }
	
	.local-profile-status { display:flex; justify-content:space-between; gap:.5rem; color:var(--text-dim); font-size:var(--fs-caption-sm); font-family:var(--font-mono); }
	
	/* Support code + account + cloud save panels */
	.support-code, .account-panel, .cloud-section { max-width:760px; margin-top:1rem; padding:.85rem 1rem; background:var(--bg-tertiary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); }
	.support-code h3, .account-panel h3, .cloud-section h4 { margin:0 0 .35rem; font-size:var(--fs-body); color:var(--text-primary); font-family:var(--font-display); }
	.support-code p, .account-panel p, .cloud-section p { margin:.15rem 0; color:var(--text-secondary); font-size:var(--fs-caption); line-height:1.5; }
	.sc-note, .cloud-desc { color:var(--text-dim); font-size:var(--fs-caption-sm); }
	
	.sc-row { display:flex; align-items:center; gap:.5rem; margin:.4rem 0 .2rem; }
	.sc-code { font-family:var(--font-mono); font-size:var(--fs-mono); color:var(--cyan); background:rgba(0,0,0,.3); padding:.3rem .55rem; border-radius:var(--radius-sm); border:1px solid var(--border-neon); user-select:all; }
	.sc-owner { color:var(--text-dim); font-size:var(--fs-caption-sm); font-family:var(--font-mono); }
	.acct-status { color:var(--text-secondary); font-size:var(--fs-caption); }
	
	/* Cloud status layout and collapsible details */
	.cloud-status-block { display:flex; align-items:center; gap:.5rem; padding:.55rem .75rem; border:1px solid var(--border-neon); border-radius:var(--radius-sm); margin-bottom:.75rem; font-size:var(--fs-body-sm); }
	.cloud-status-icon { font-size:var(--fs-body); }
	.cloud-status-text { font-family:var(--font-display); font-weight:500; }
	
	.cloud-details { border:1px solid var(--border-neon); border-radius:var(--radius-sm); margin-bottom:.75rem; background:rgba(0,0,0,.1); }
	.cloud-details summary { padding:.5rem .75rem; font-size:var(--fs-body-sm); font-family:var(--font-display); cursor:pointer; color:var(--text-secondary); user-select:none; }
	.cloud-details summary:hover { color:var(--cyan); }
	.cloud-details[open] summary { border-bottom:1px solid var(--border-neon); }
	.cloud-details .cloud-meta { margin:0; padding:.3rem 0; }
	.cloud-meta { display:grid; gap:3px; margin:.5rem 0; }
	.ir { display:flex; justify-content:space-between; padding:.4rem .55rem; font-size:var(--fs-mono); border-radius:3px; }
	.ir:nth-child(odd) { background:rgba(0,0,0,.1); }
	.il { color:var(--text-secondary); }
	.iv { color:var(--text-primary); font-family:var(--font-mono); font-weight:500; }
	
	.cloud-err { color:var(--red); font-size:var(--fs-caption-sm); margin:.25rem 0; }
	.cloud-actions { display:flex; gap:.5rem; flex-wrap:wrap; margin-top:.35rem; }
	.cloud-actions .hub-action { margin:0; }
	.account-delete { max-width:760px; margin-top:1rem; padding:.85rem 1rem; background:rgba(255,68,68,.04); border:1px solid rgba(255,68,68,.25); border-radius:var(--radius-sm); }
	.account-delete h4 { margin:0 0 .35rem; color:var(--red); font-family:var(--font-display); }
	.account-delete strong { color:var(--text-primary); }
	.delete-form { max-width:340px; margin-top:.65rem; }
	.delete-form input[type='password'] { display:block; box-sizing:border-box; width:100%; margin-top:.2rem; padding:.45rem .55rem; background:var(--bg-primary); color:var(--text-primary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); font-family:var(--font-mono); }
	.delete-check { display:flex; gap:.45rem; align-items:flex-start; margin:.65rem 0; color:var(--text-secondary); font-size:var(--fs-caption); line-height:1.4; }
	
	.auth-tabs { display:flex; gap:.25rem; margin:.5rem 0; }
	.auth-tab { padding:.35rem .9rem; font-size:var(--fs-caption); color:var(--text-secondary); background:transparent; border:1px solid var(--border-neon); border-radius:var(--radius-sm); cursor:pointer; }
	.auth-tab.on { color:var(--cyan); border-color:var(--cyan); background:rgba(0,255,255,.06); }
	
	.auth-form { display:flex; flex-direction:column; gap:.4rem; max-width:340px; }
	.auth-form .local-profile-label input, .auth-form input { display:block; margin-top:.2rem; width:100%; box-sizing:border-box; background:var(--bg-primary); color:var(--text-primary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); padding:.4rem .55rem; font-family:var(--font-mono); font-size:var(--fs-mono-sm); }
	.auth-err { color:var(--red); font-size:var(--fs-caption-sm); margin:.25rem 0; }
	
	/* Auth input wrappers with prefix icons and visibility toggles */
	.auth-input-wrapper { display:flex; align-items:center; background:var(--bg-primary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); position:relative; margin-top:.2rem; width:100%; box-sizing:border-box; }
	.auth-input-wrapper:focus-within { border-color:var(--cyan); box-shadow:0 0 8px rgba(0,255,255,.25); }
	:global(.auth-prefix-icon) { margin-left:.6rem; color:var(--text-dim); pointer-events:none; }
	.auth-input-wrapper input { border:none !important; margin-top:0 !important; background:transparent !important; flex:1; min-width:0; padding:.45rem .55rem .45rem .45rem !important; }
	.auth-input-wrapper input:focus { outline:none; }
	.auth-suffix-btn { background:transparent; border:none; color:var(--text-dim); cursor:pointer; padding:0 .6rem; display:flex; align-items:center; justify-content:center; transition:color var(--transition-fast); }
	.auth-suffix-btn:hover { color:var(--cyan); }
	
	/* Form validation and password strength indicators */
	.auth-hint-err { color:var(--red); font-size:var(--fs-caption-sm); margin-top:.2rem; display:block; line-height:1.3; }
	.auth-hint-ok { color:var(--green); font-size:var(--fs-caption-sm); margin-top:.2rem; display:block; line-height:1.3; }
	.strength-meter { display:flex; align-items:center; gap:.5rem; margin-top:.3rem; }
	.strength-bar-track { flex:1; height:4px; background:rgba(255,255,255,.1); border-radius:2px; overflow:hidden; }
	.strength-bar-fill { height:100%; transition:width var(--transition-fast), background-color var(--transition-fast); }
	.strength-label { font-size:var(--fs-caption-sm); font-family:var(--font-mono); font-weight:600; min-width:65px; text-align:right; }
	
	/* Forgot password and session hints */
	.auth-forgot-password-wrap { display:flex; justify-content:flex-end; margin-top:.2rem; margin-bottom:.3rem; }
	.auth-forgot-password-btn { background:transparent; border:none; color:var(--text-dim); font-size:var(--fs-caption-sm); font-family:var(--font-mono); text-decoration:underline; cursor:pointer; padding:0; transition:color var(--transition-fast); }
	.auth-forgot-password-btn:hover { color:var(--cyan); }
	.auth-session-hint { color:var(--text-dim); font-size:var(--fs-caption-sm); font-family:var(--font-mono); margin-top:.5rem; text-align:center; line-height:1.3; }

	.hub-action { padding:.55rem 1.2rem; font-size:var(--fs-body-sm); border-radius:var(--radius-sm); background:transparent; border:1px solid var(--border-neon); color:var(--text-secondary); cursor:pointer; transition:all var(--transition-fast); margin-right:.5rem; }
	.hub-action:hover { border-color:var(--cyan); color:var(--text-primary); }
	.hub-action:disabled { opacity:.45; cursor:default; pointer-events:none; }
	.hub-danger:hover { border-color:var(--red); color:var(--red); }
	
	.btn-primary { padding:.55rem 1.2rem; font-size:var(--fs-body-sm); border-radius:var(--radius-sm); background:var(--cyan); border:1px solid var(--cyan); color:var(--bg-primary); font-weight:600; cursor:pointer; transition:all var(--transition-fast); margin-right:.5rem; }
	.btn-primary:hover { box-shadow:0 0 10px rgba(0,255,255,0.4); }
	.btn-primary:disabled { opacity:.45; cursor:default; pointer-events:none; }
	
	@media(max-width:767px){
		.local-profile { grid-template-columns:1fr; }
		.local-profile-status { flex-direction:column; gap:.25rem; }
	}

	@keyframes fi { from{opacity:0} to{opacity:1} }
</style>
