<script lang="ts">
	import type { GameSettings } from '$lib/game/engine/gameTypes';

	let {
		settings,
		importTriggerEl = $bindable(),
		resetTriggerEl = $bindable(),
		onToggleSetting,
		onExportSave,
		onOpenImportDialog,
		onOpenResetDialog
	}: {
		settings: GameSettings;
		importTriggerEl?: HTMLElement | null;
		resetTriggerEl?: HTMLElement | null;
		onToggleSetting: (key: keyof GameSettings) => void;
		onExportSave: () => void;
		onOpenImportDialog: () => void;
		onOpenResetDialog: () => void;
	} = $props();

	const settingsList = [
		{ key: 'reducedMotion' as keyof GameSettings, label: 'Reduced Motion', desc: 'Minimize animations' },
		{ key: 'screenShake' as keyof GameSettings, label: 'Screen Shake', desc: 'Shake on damage' },
		{ key: 'particles' as keyof GameSettings, label: 'Particles', desc: 'Death & hit effects' },
		{ key: 'damageNumbers' as keyof GameSettings, label: 'Damage Numbers', desc: 'Show floating numbers' },
		{ key: 'lowEffectsMode' as keyof GameSettings, label: 'Low Effects Mode', desc: 'Reduce visual effects' },
		{ key: 'bloom' as keyof GameSettings, label: 'Neon Bloom', desc: 'Glow post-processing (off for low-end GPUs)' },
		{ key: 'sfx' as keyof GameSettings, label: 'Sound Effects', desc: 'Combat & UI sounds' },
		{ key: 'music' as keyof GameSettings, label: 'Music', desc: 'Ambient background loop' },
		{ key: 'browserNotifications' as keyof GameSettings, label: 'Lab Notifications', desc: 'Browser notification when research finishes' },
	];
</script>

<div class="hs"><h2 class="hst">⚙ Systems</h2>
	<div class="sg">
		{#each settingsList as s}
			<div class="sr" role="group" aria-label={s.label}><div class="si"><span class="sl">{s.label}</span><span class="sd">{s.desc}</span></div>
				<div class="tg" class:on={settings[s.key]} role="switch" aria-checked={settings[s.key]} aria-label={s.label} tabindex="0" onclick={() => onToggleSetting(s.key)} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleSetting(s.key); } }}>
					<div class="tgk"></div>
				</div>
			</div>
		{/each}
	</div>
	<div class="hsd" style="margin-top:1rem;">
		<button class="hub-action" onclick={onExportSave}>📋 Export Save</button>
		<button class="hub-action" bind:this={importTriggerEl} onclick={onOpenImportDialog}>📂 Import Save</button>
		<button class="hub-action hub-danger" bind:this={resetTriggerEl} onclick={onOpenResetDialog}>🗑 Reset Save</button>
	</div>
	<div class="save-note">
		<p class="save-note-flavor">Orbital Command cannot stop you from rewriting reality. It can only confirm that doing so makes the war considerably less interesting.</p>
	</div>
</div>

<style>
	.sg { display:flex; flex-direction:column; gap:2px; max-width:600px; }
	.sr { display:flex; justify-content:space-between; align-items:center; padding:.55rem .55rem; border-radius:var(--radius-sm); cursor:pointer; }
	.sr:hover { background:rgba(255,255,255,.02); }
	.si { display:flex; flex-direction:column; gap:.08rem; }
	.sl { font-size:var(--fs-body-sm); color:var(--text-primary); } .sd { font-size:var(--fs-caption); color:var(--text-secondary); }
	.tg { width:38px; height:22px; border-radius:11px; background:var(--bg-tertiary); border:1px solid var(--border-neon); position:relative; transition:all var(--transition-fast); flex-shrink:0; cursor:pointer; }
	.tg:focus-visible { outline:2px solid var(--cyan); outline-offset:3px; }
	.tg.on { background:rgba(0,255,255,.12); border-color:var(--cyan); }
	.tgk { position:absolute; top:2px; left:2px; width:16px; height:16px; border-radius:50%; background:var(--text-dim); transition:all var(--transition-fast); }
	.tg.on .tgk { left:18px; background:var(--cyan); box-shadow:0 0 6px rgba(0,255,255,.4); }
	.save-note { margin-top:1.25rem; padding:.75rem 1rem; background:rgba(255,221,68,.04); border:1px solid rgba(255,221,68,.12); border-radius:var(--radius-sm); max-width:800px; }
	.save-note-flavor { font-size:var(--fs-caption-sm); color:rgba(255,221,68,.45); font-style:italic; line-height:1.4; margin:0; }
</style>
