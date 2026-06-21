<script lang="ts">
	import { cubicIn, backOut } from 'svelte/easing';

	let {
		count,
		tier,
		reduced = false,
	}: {
		count: number;
		tier: number;
		reduced?: boolean;
	} = $props();

	const burning = $derived(tier >= 6);
	const flameCount = $derived(tier >= 8 ? 8 : tier >= 7 ? 7 : 6);
	const frontFlames = $derived(tier >= 8 ? 6 : tier >= 7 ? 5 : 4);
	const formatted = $derived(count.toLocaleString('en-US'));
	// Split the readout into per-character slots so each digit is its own
	// odometer column. Only the columns whose digit actually changed re-key and
	// roll — bumping the ones place rolls a single digit, not the whole number.
	// Separators (commas) are inert: they never animate. Fixed-width tabular
	// slots keep the layout from jittering left/right as digits flip.
	const slots = $derived(
		formatted.split('').map((ch) => ({ ch, sep: ch < '0' || ch > '9' })),
	);

	// Shatter debris: fixed radial vectors (px) + spin + stagger. Hard-coded so
	// the burst reads the same every time — no per-frame randomness, no GC churn.
	const shards = [
		{ tx: -46, ty: -34, r: -220, d: 0,  s: 1.15 },
		{ tx: -18, ty: -52, r: 180,  d: 18, s: .85 },
		{ tx: 20,  ty: -50, r: 260,  d: 6,  s: 1.0 },
		{ tx: 52,  ty: -30, r: -180, d: 24, s: .9 },
		{ tx: 64,  ty: 4,   r: 300,  d: 12, s: 1.1 },
		{ tx: 50,  ty: 36,  r: -260, d: 30, s: .8 },
		{ tx: 16,  ty: 54,  r: 200,  d: 8,  s: 1.05 },
		{ tx: -22, ty: 52,  r: -300, d: 22, s: .9 },
		{ tx: -54, ty: 30,  r: 240,  d: 14, s: 1.0 },
		{ tx: -64, ty: -4,  r: -200, d: 4,  s: .85 },
		{ tx: 0,   ty: -64, r: 160,  d: 28, s: .7 },
		{ tx: 0,   ty: 64,  r: -160, d: 16, s: .7 },
	];

	// Per-kill spark flick: a fixed fan of sparks that fire off the changing
	// (ones) digit each time the count ticks. Hard-coded vectors → identical
	// burst every time, no per-frame randomness, no GC churn.
	const sparks = [
		{ x: 8,   y: -14, d: 0  },
		{ x: 16,  y: -4,  d: 14 },
		{ x: 14,  y: 8,   d: 6  },
		{ x: 2,   y: 16,  d: 20 },
		{ x: -10, y: 12,  d: 10 },
		{ x: 18,  y: 2,   d: 24 },
	];

	// Punchy comic shout per tier crossed. Index mirrors getKillstreakTier()
	// (tier 6 = 1000+ = the fire tier). Cosmetic flavour only.
	const TIER_WORDS = [
		'STREAK!', 'RAMPAGE!', 'DOMINATING!', 'UNSTOPPABLE!', 'GODLIKE!',
		'LEGENDARY!', 'INFERNO!', 'ANNIHILATION!', 'TRANSCENDENT!',
	];

	let rollEl: HTMLElement | undefined = $state();
	// Baseline for tier-cross detection. Left undefined so the first effect run
	// only records the starting tier (no spurious pop on mount); set every run after.
	let prevTier: number | undefined;
	// Tier-up word pop. `popKey` bumps on every cross so the keyed element
	// remounts and replays its one-shot animation even on the same word.
	let popWord = $state('');
	let popKey = $state(0);

	// Big level-up punch when a tier is crossed (the per-kill feedback is the
	// odometer roll itself). One-shot CSS animation, cleaned up on end so it
	// never blocks the burning-shake / heat loops underneath. Also fires the
	// tier-up word pop ("INFERNO!" etc.).
	$effect(() => {
		const t = tier;
		const el = rollEl;
		if (prevTier !== undefined && !reduced && el && t > prevTier) {
			el.classList.remove('levelup');
			void el.offsetWidth;
			el.classList.add('levelup');
			el.addEventListener('animationend', () => el.classList.remove('levelup'), { once: true });
			if (t >= 0 && t < TIER_WORDS.length) {
				popWord = TIER_WORDS[t]!;
				popKey++;
			}
		}
		prevTier = t;
	});

	// Odometer roll for an INCREASING counter: the new digit rises up from below
	// into place and the old one lifts up and out the top — the chain climbs, so
	// the digits climb with it. backOut gives the incoming digit a tiny
	// settle-bounce as it locks in, like a mechanical counter seating.
	function rollIn(_node: HTMLElement) {
		return {
			duration: 280, easing: backOut,
			css: (t: number) =>
				`transform: translateY(${(1 - t) * 95}%) rotateX(${(1 - t) * 60}deg); opacity: ${Math.min(1, t)};`,
		};
	}
	function rollOut(node: HTMLElement) {
		// Pull the outgoing copy out of flow so the incoming one defines the slot.
		node.style.position = 'absolute';
		node.style.left = '0';
		node.style.right = '0';
		node.style.top = '0';
		return {
			duration: 240, easing: cubicIn,
			css: (t: number, u: number) =>
				`transform: translateY(${-u * 95}%) rotateX(${-u * 60}deg); opacity: ${t};`,
		};
	}

	// Outro: shatter the number into spinning shards + a smoke puff, unless the
	// player prefers reduced motion (then a plain quick fade).
	function shatter(node: HTMLElement, opts: { reduced?: boolean } = {}) {
		if (opts.reduced) return { duration: 160, css: (u: number) => `opacity:${u}` };
		node.classList.add('out');
		return { duration: 640, css: () => '' };
	}
</script>

<div
	class="ks"
	data-tier={tier}
	class:reduced
	class:burning={burning && !reduced}
	out:shatter={{ reduced }}
	aria-label="Killstreak ×{count}"
>
	{#if !reduced}
		{#key tier}
			<div class="ks-flash" aria-hidden="true"></div>
			<div class="ks-shock" aria-hidden="true"></div>
			<div class="ks-rays" aria-hidden="true"></div>
		{/key}
	{/if}

	{#if burning && !reduced}
		<div class="ks-fire" aria-hidden="true">
			<span class="ks-firebed"></span>
			{#each Array(flameCount) as _, i}<span class="ks-flame" style="--fi:{i}; --fn:{flameCount}"></span>{/each}
		</div>
		<div class="ks-embers" aria-hidden="true">
			{#each Array(9) as _, i}<span class="ks-ember" style="--ei:{i}"></span>{/each}
		</div>
	{/if}

	<!-- Outro-only effects: inert until the root gets the `out` class. -->
	<div class="ks-debris" aria-hidden="true">
		{#each shards as s}
			<span class="ks-shard" style="--tx:{s.tx}px; --ty:{s.ty}px; --r:{s.r}deg; --d:{s.d}ms; --ss:{s.s}"></span>
		{/each}
	</div>
	<div class="ks-puff" aria-hidden="true"></div>

	<span class="ks-readout">
		<span class="ks-x">×</span>
		<span class="ks-roll" bind:this={rollEl}>
			{#if reduced}
				<span class="ks-num"><span class="ks-glyph">{formatted}</span></span>
			{:else}
				<span class="ks-num">
					{#each slots as slot, i (i)}
						{#if slot.sep}
							<span class="ks-glyph ks-sep">{slot.ch}</span>
						{:else}
							<span class="ks-digit">
								{#key slot.ch}
									<span class="ks-glyph ks-d" in:rollIn out:rollOut>{slot.ch}</span>
								{/key}
							</span>
						{/if}
					{/each}
				</span>
				<!-- Per-kill spark flick off the ones digit (the column that ticks
				     every kill). Remounts on each count change to replay. -->
				{#if !reduced}
					{#key count}
						<span class="ks-sparks" aria-hidden="true">
							{#each sparks as s}
								<span class="ks-spark" style="--sx:{s.x}px; --sy:{s.y}px; --sd:{s.d}ms"></span>
							{/each}
						</span>
					{/key}
				{/if}
			{/if}
		</span>
	</span>

	{#if !reduced && popWord}
		{#key popKey}
			<span class="ks-word" data-tier={tier} aria-hidden="true">{popWord}</span>
		{/key}
	{/if}

	{#if burning && !reduced}
		<!-- Foreground flames licking up over the number itself — the digits
		     read as being on fire, not just sitting above a flame strip. -->
		<div class="ks-fire-front" aria-hidden="true">
			{#each Array(frontFlames) as _, i}<span class="ks-flame-front" style="--fi:{i}; --fn:{frontFlames}"></span>{/each}
		</div>
	{/if}
</div>

<style>
	/* ═══ Killstreak counter — pure 2.5D comic number, max juice ══════════════
	   No plate, no label: the number IS the readout. A chunky comic numeral
	   with a fat black outline, hard cell-shaded colour bands and a thick
	   extruded side for fake-3D depth. It rolls up smoothly, punches on every
	   kill, detonates a "POW" shockwave at each tier, bursts into flame from
	   tier 6 (1000+), and shatters into spinning shards when the streak drops.
	   Cosmetic only — never grants anything. */

	.ks {
		position: absolute; top: 2.9rem; right: 1.1rem;
		z-index: 8; pointer-events: none;
		isolation: isolate;
		transform-origin: 70% 50%;
		animation: ksIn .42s cubic-bezier(.3,1.8,.5,1);
		--ks-ink: #08080f;
	}

	/* ── The hero number ──────────────────────────────────────────────────── */
	.ks-readout {
		display: inline-flex; align-items: baseline; gap: .02em;
		font-family: var(--font-display); font-weight: 900;
		line-height: .8;
		transform: rotate(-3deg);
		transform-origin: 70% 60%;
		will-change: transform;
		/* Subtle idle-breath so the number feels alive between kills (not a dead
		   static glyph). Suspended while burning — the heat-shake takes over. */
		animation: ksBreath 3.4s ease-in-out infinite;
	}
	/* Odometer stage: gives the in/out roll a 3D hinge and holds the layout
	   while the outgoing copy is yanked out of flow during its roll-out. */
	.ks-roll {
		position: relative; display: inline-block;
		perspective: 360px;
	}
	.ks-x {
		font-size: 1.5rem;
		color: var(--ks-lit);
		-webkit-text-stroke: 2.5px var(--ks-ink); paint-order: stroke fill;
		text-shadow: 2px 3px 0 var(--ks-edge), 3px 4px 0 var(--ks-ink);
		transform: translateY(-.18em);
		opacity: .95;
	}
	/* Odometer container: a row of fixed-width digit slots. Tabular figures +
	   per-slot width (--ks-dw, one '0' advance) mean the readout never shifts
	   left/right as digits flip — only the changing column rolls. */
	.ks-num {
		display: inline-flex; align-items: baseline;
		font-size: 3.3rem;
		font-variant-numeric: tabular-nums;
		--ks-dw: .92ch;
	}
	/* One odometer column. Holds the layout while the outgoing digit is yanked
	   out of flow during its roll, and gives the roll its 3D hinge. */
	.ks-digit {
		position: relative; display: inline-block;
		width: var(--ks-dw); text-align: center;
		perspective: 360px;
	}
	.ks-sep { width: calc(var(--ks-dw) * .42); text-align: center; }
	/* The comic glyph: chunky cell-shaded face + hard extruded 2.5D side. */
	.ks-glyph {
		display: inline-block;
		color: transparent;
		font-variant-numeric: tabular-nums;
		/* Two BRIGHT cell-shade bands on the front face (specular cap → light).
		   All the dark tones live on the extruded side only, so the face stays
		   as readable as the solid-coloured "×". A thinner 2.5px outline keeps
		   the comic edge without swallowing the fill on thin digits. */
		background: linear-gradient(168deg,
			var(--ks-hi)  0%,  var(--ks-hi)  42%,
			var(--ks-lit) 42%, var(--ks-lit) 100%);
		-webkit-background-clip: text; background-clip: text;
		-webkit-text-stroke: 2.5px var(--ks-ink); paint-order: stroke fill;
		/* Long stack of silhouettes = a chunky extruded side pushed down-right,
		   stepping tone → edge → black back-face for a hard comic 2.5D block. */
		text-shadow:
			1px 1px 0 var(--ks-tone), 2px 2px 0 var(--ks-tone), 3px 3px 0 var(--ks-tone),
			4px 4px 0 var(--ks-edge), 5px 5px 0 var(--ks-edge), 6px 6px 0 var(--ks-edge),
			7px 7px 0 var(--ks-edge), 8px 8px 0 var(--ks-edge), 9px 9px 0 var(--ks-edge),
			10px 10px 0 var(--ks-ink), 11px 11px 0 var(--ks-ink), 12px 12px 0 var(--ks-ink),
			0 0 18px var(--ks-glow);
		transform-origin: 50% 50%;
		backface-visibility: hidden;
		will-change: transform;
	}

	/* Per-tier level-up punch (one-shot, re-triggered + cleaned up in JS). */
	.ks-roll:global(.levelup) { animation: ksLevel .5s cubic-bezier(.3,1.7,.5,1); }

	/* ── Tier palette ─────────────────────────────────────────────────────────
	   --ks-hi specular cap  --ks-lit light band  --ks-tone main  --ks-edge side
	   --ks-glow halo.  Cyan → teal → gold → pink → magenta → violet → fire. */
	.ks[data-tier="0"] { --ks-hi:#EAFFFF; --ks-lit:#7FF4FF; --ks-tone:#16C2D4; --ks-edge:#0A5C66; --ks-glow:rgba(0,255,255,.5); }
	.ks[data-tier="1"] { --ks-hi:#EBFFFA; --ks-lit:#86FFE6; --ks-tone:#1ED0B2; --ks-edge:#0A5F54; --ks-glow:rgba(0,255,200,.55); }
	.ks[data-tier="2"] { --ks-hi:#FFFBE0; --ks-lit:#FFE684; --ks-tone:#FFB81F; --ks-edge:#8A5A00; --ks-glow:rgba(255,200,40,.6); }
	.ks[data-tier="3"] { --ks-hi:#FFEAF5; --ks-lit:#FF9DCB; --ks-tone:#F23C8E; --ks-edge:#85194B; --ks-glow:rgba(255,70,160,.7); }
	.ks[data-tier="4"] { --ks-hi:#FFE6FB; --ks-lit:#FF94EA; --ks-tone:#E62EC0; --ks-edge:#72145F; --ks-glow:rgba(255,60,210,.8); }
	.ks[data-tier="5"] { --ks-hi:#F1EAFF; --ks-lit:#C4A4FF; --ks-tone:#8A4BFF; --ks-edge:#3D1B7C; --ks-glow:rgba(150,80,255,.9); }
	.ks[data-tier="6"] { --ks-hi:#FFF6E0; --ks-lit:#FFCE7A; --ks-tone:#FF8A1E; --ks-edge:#7A3300; --ks-glow:rgba(255,120,0,.95); }
	.ks[data-tier="7"] { --ks-hi:#FFFBE8; --ks-lit:#FFD86A; --ks-tone:#FFA916; --ks-edge:#7E3E00; --ks-glow:rgba(255,150,20,1); }
	.ks[data-tier="8"] { --ks-hi:#FFFFFA; --ks-lit:#FFEC8A; --ks-tone:#FFD223; --ks-edge:#8A4E00; --ks-glow:rgba(255,210,70,1); }

	/* ── Tier-up detonation: white flash + shockwave ring + radial "POW" rays ─ */
	.ks-flash {
		position: absolute; inset: -40px; border-radius: 50%;
		background: radial-gradient(circle, #fff 0%, var(--ks-glow) 30%, transparent 60%);
		opacity: 0; mix-blend-mode: screen; z-index: -1;
		animation: ksFlash .45s ease-out forwards;
	}
	.ks-shock {
		position: absolute; inset: 50% 50% 50% 50%; width: 0; height: 0;
		border-radius: 50%; border: 3px solid var(--ks-lit);
		transform: translate(-50%, -50%); opacity: 0; z-index: -1;
		animation: ksShock .6s cubic-bezier(.2,.7,.3,1) forwards;
	}
	.ks-rays {
		position: absolute; inset: -34px; z-index: -2;
		background: var(--ks-lit); mix-blend-mode: screen; opacity: 0;
		clip-path: polygon(
			50% 0%, 58% 30%, 80% 10%, 70% 38%, 100% 40%, 72% 52%, 95% 78%,
			62% 62%, 66% 98%, 50% 70%, 34% 98%, 38% 62%, 5% 78%, 28% 52%,
			0% 40%, 30% 38%, 20% 10%, 42% 30%);
		animation: ksRays .55s cubic-bezier(.2,.7,.3,1) forwards;
	}

	/* ── Fire (tier 6+) ──────────────────────────────────────────────────────
	   Big flames that engulf the number: tall tongues rise from below and lick
	   up PAST the top of the digits, with a second translucent layer drawn over
	   the number so it reads as actually burning. White-hot core → gold →
	   orange → red gradient; the container is blurred so the tongues melt into
	   one continuous body of fire. An ember bed glows at the base. */
	.ks-fire {
		position: absolute; left: -8%; right: -8%; top: -34px; bottom: -8px;
		z-index: -1; pointer-events: none;
		/* Light blur only — keeps each tongue a distinct lick instead of melting
		   them into one orange blob. A soft drop-shadow gives the whole body a
		   warm halo without the muddy screen-stack. */
		filter: blur(1px) brightness(1.06)
			drop-shadow(0 0 10px rgba(255,120,20,.45));
	}
	.ks-firebed {
		position: absolute; left: 8%; right: 8%; bottom: 6px; height: 14px;
		background: radial-gradient(ellipse 55% 100% at 50% 100%,
			rgba(255,200,80,.75) 0%, rgba(255,120,0,.4) 50%, transparent 78%);
		mix-blend-mode: screen;
		animation: ksFirebed .6s ease-in-out infinite alternate;
	}
	.ks-flame {
		position: absolute; bottom: 2px;
		left: calc(6% + var(--fi) * (88% / (var(--fn) - 1)));
		width: 22px; height: 76px; margin-left: -11px;
		/* Wispy tongue: transparent root → hot orange body → bright gold →
		   white-hot tip that fades to nothing, so it reads as a real flame
		   licking up rather than a solid bar. */
		background: linear-gradient(to top,
			rgba(220,40,0,0) 0%, rgba(255,70,0,.45) 12%, rgba(255,120,10,.78) 34%,
			rgba(255,180,50,.92) 58%, rgba(255,235,170,.96) 80%,
			rgba(255,255,255,.6) 92%, transparent 100%);
		/* Tall, pointed tip + rounded base. */
		border-radius: 50% 50% 44% 44% / 94% 94% 6% 6%;
		transform-origin: 50% 100%; mix-blend-mode: screen; opacity: .88;
		animation: ksFlame .4s ease-in-out infinite alternate;
		animation-delay: calc(var(--fi) * -.067s);
	}
	/* Foreground tongues that ENGULF the digits: translucent over the digit
	   bodies (so the glyphs read through, tinted by fire) and white-hot at the
	   tips that lick up past the top edge — the number stands inside the flames
	   rather than sitting in front of a backdrop. */
	.ks-fire-front {
		position: absolute; left: 4%; right: 4%; top: -26px; bottom: 2px;
		z-index: 2; pointer-events: none;
		filter: blur(1.1px) brightness(1.05);
	}
	.ks-flame-front {
		position: absolute; bottom: 0;
		left: calc(8% + var(--fi) * (84% / (var(--fn) - 1)));
		width: 22px; height: 80px; margin-left: -11px;
		background: linear-gradient(to top,
			rgba(255,80,0,0) 0%, rgba(255,110,10,.26) 24%, rgba(255,160,40,.5) 50%,
			rgba(255,215,120,.78) 74%, rgba(255,250,230,.94) 90%, transparent 100%);
		border-radius: 50% 50% 46% 46% / 94% 94% 6% 6%;
		transform-origin: 50% 100%; mix-blend-mode: screen; opacity: .72;
		animation: ksFlameFront .52s ease-in-out infinite alternate;
		animation-delay: calc(var(--fi) * -.0934s);
	}
	.ks-embers { position: absolute; inset: 0; z-index: -1; }
	.ks-ember {
		position: absolute; bottom: 4px; left: calc(8% + var(--ei) * 13%);
		width: 4px; height: 4px; border-radius: 50%;
		background: radial-gradient(circle, #FFE7A0, #FF7A1A 70%, transparent);
		mix-blend-mode: screen; opacity: 0;
		animation: ksEmber 1.4s ease-out infinite;
		animation-delay: calc(var(--ei) * -.28s);
	}
	.ks[data-tier="7"] .ks-flame { height: 90px; width: 33px; }
	.ks[data-tier="8"] .ks-flame { height: 104px; width: 36px; }
	.ks[data-tier="7"] .ks-fire,
	.ks[data-tier="8"] .ks-fire { top: -54px; }
	.ks.burning .ks-readout { animation: ksBurnShake 1.4s ease-in-out infinite; }
	.ks[data-tier="8"].burning .ks-readout { animation: ksBurnShake .85s ease-in-out infinite; }
	/* The digits flicker hot while burning — a cheap brightness/hue pulse. */
	.ks.burning .ks-num { animation: ksHeat .22s steps(2, end) infinite alternate; }
	/* …and the glyphs themselves become molten: the cell-shade fill is replaced
	   by a live fire gradient (dark ember base → orange → gold → white-hot tip)
	   that shimmers, so the NUMBER itself is on fire, not sitting before a
	   backdrop of flames. The black stroke + extruded side stay for comic depth. */
	.ks.burning .ks-glyph {
		background: linear-gradient(to top,
			#6e1300 0%, #B81B00 12%, #FF4400 30%, #FF8410 50%,
			#FFBE38 68%, #FFE49A 84%, #FFFFFF 98%);
		background-size: 100% 220%;
		-webkit-background-clip: text; background-clip: text;
		animation: ksFireFill .5s ease-in-out infinite alternate;
	}

	/* ── Per-kill spark flick (fires off the ones digit each tick) ─────────── */
	.ks-sparks {
		position: absolute; right: -2px; top: 44%;
		width: 0; height: 0; z-index: 4; pointer-events: none;
	}
	.ks-spark {
		position: absolute; width: 3px; height: 3px; border-radius: 50%;
		background: radial-gradient(circle, #fff 0%, var(--ks-lit) 65%, transparent 100%);
		box-shadow: 0 0 5px var(--ks-glow);
		opacity: 0; mix-blend-mode: screen;
		animation: ksSpark .42s ease-out forwards;
		animation-delay: var(--sd);
	}

	/* ── Tier-up word pop ("INFERNO!" etc.) — one-shot, sits under the number ─ */
	.ks-word {
		position: absolute; top: 3.05rem; right: .3rem;
		font-family: var(--font-display); font-weight: 900;
		font-size: 1.2rem; letter-spacing: .02em;
		white-space: nowrap; text-align: right;
		color: var(--ks-lit);
		-webkit-text-stroke: 2px var(--ks-ink); paint-order: stroke fill;
		text-shadow: 2px 2px 0 var(--ks-edge), 0 0 12px var(--ks-glow);
		transform-origin: 100% 0; pointer-events: none; z-index: 5;
		animation: ksWord 1.1s cubic-bezier(.2,1.5,.4,1) forwards;
	}
	.ks[data-tier="6"] .ks-word,
	.ks[data-tier="7"] .ks-word,
	.ks[data-tier="8"] .ks-word { font-size: 1.45rem; }

	/* ── Shatter debris + smoke puff (outro only — inert until `.out`) ──────── */
	.ks-debris { position: absolute; inset: 0; z-index: 3; }
	.ks-shard {
		position: absolute; top: 42%; left: 42%;
		width: calc(13px * var(--ss)); height: calc(15px * var(--ss));
		background: linear-gradient(150deg, var(--ks-lit) 0 55%, var(--ks-tone) 55% 100%);
		clip-path: polygon(50% 0%, 100% 72%, 18% 100%);
		filter: drop-shadow(0 0 1px var(--ks-ink));
		opacity: 0;
	}
	.ks-puff {
		position: absolute; inset: 50% 50% 50% 50%; width: 54px; height: 54px;
		margin: -27px 0 0 -27px; border-radius: 50%;
		background: radial-gradient(circle, rgba(220,225,245,.5) 0%, rgba(150,160,200,.18) 45%, transparent 70%);
		opacity: 0; z-index: 2;
	}
	.ks:global(.out) { animation: none; }
	.ks:global(.out) .ks-readout { animation: ksImplode .34s cubic-bezier(.5,-0.4,.7,.3) forwards; }
	.ks:global(.out) .ks-fire,
	.ks:global(.out) .ks-embers { animation: ksFireOut .18s ease forwards; opacity: 0; }
	.ks:global(.out) .ks-shard { animation: ksShard .62s cubic-bezier(.25,.6,.4,1) forwards; animation-delay: var(--d); }
	.ks:global(.out) .ks-puff { animation: ksPuff .6s ease-out .08s forwards; }

	/* ── Keyframes ─────────────────────────────────────────────────────────── */
	@keyframes ksIn {
		0%   { opacity: 0; transform: translateY(-16px) scale(.55) rotate(-12deg); }
		70%  { opacity: 1; transform: translateY(0) scale(1.12) rotate(2deg); }
		100% { opacity: 1; transform: translateY(0) scale(1) rotate(0); }
	}
	@keyframes ksSpark {
		0%   { opacity: 0; transform: translate(0,0) scale(.5); }
		20%  { opacity: 1; }
		100% { opacity: 0; transform: translate(var(--sx), var(--sy)) scale(.2); }
	}
	@keyframes ksWord {
		0%   { opacity: 0; transform: rotate(-3deg) scale(.4) translateY(6px); }
		20%  { opacity: 1; transform: rotate(-3deg) scale(1.14) translateY(0); }
		35%  { transform: rotate(-3deg) scale(1) translateY(0); }
		80%  { opacity: 1; }
		100% { opacity: 0; transform: rotate(-3deg) scale(1) translateY(-12px); }
	}
	@keyframes ksBreath {
		0%, 100% { transform: rotate(-3deg) scale(1); }
		50%      { transform: rotate(-3deg) scale(1.028); }
	}
	@keyframes ksLevel {
		0%   { transform: scale(1.7); }
		35%  { transform: scale(.82); }
		60%  { transform: scale(1.14); }
		100% { transform: scale(1); }
	}
	@keyframes ksFlash {
		0% { opacity: 0; transform: scale(.4); } 25% { opacity: .95; transform: scale(1); }
		100% { opacity: 0; transform: scale(1.7); }
	}
	@keyframes ksShock {
		0%   { width: 0; height: 0; opacity: .9; border-width: 5px; }
		100% { width: 150px; height: 150px; opacity: 0; border-width: 1px; }
	}
	@keyframes ksRays {
		0%   { opacity: 0; transform: scale(.3) rotate(-30deg); }
		35%  { opacity: .85; transform: scale(1.05) rotate(6deg); }
		100% { opacity: 0; transform: scale(1.6) rotate(40deg); }
	}
	@keyframes ksFlame {
		0%   { transform: translateX(-2px) scaleY(.62) scaleX(1.12) rotate(-5deg); opacity: .68; }
		50%  { transform: translateX(0) scaleY(1.32) scaleX(.82) rotate(2deg); opacity: 1; }
		100% { transform: translateX(2px) scaleY(.9) scaleX(1.02) rotate(6deg); opacity: .8; }
	}
	@keyframes ksFlameFront {
		0%   { transform: translateX(-3px) scaleY(.7) scaleX(1.1) rotate(-7deg); opacity: .55; }
		50%  { transform: translateX(2px) scaleY(1.28) scaleX(.84) rotate(3deg); opacity: .85; }
		100% { transform: translateX(4px) scaleY(.92) scaleX(1) rotate(9deg); opacity: .6; }
	}
	@keyframes ksFirebed {
		0%   { opacity: .65; transform: scaleX(.94); }
		100% { opacity: 1; transform: scaleX(1.06); }
	}
	@keyframes ksHeat {
		from { filter: brightness(1.02) saturate(1.06) drop-shadow(0 0 6px rgba(255,110,0,.75)); }
		to   { filter: brightness(1.28) saturate(1.22) drop-shadow(0 0 14px rgba(255,150,25,.95)); }
	}
	/* Molten shimmer: slide the fire gradient up through the glyphs. */
	@keyframes ksFireFill {
		from { background-position: 50% 100%; }
		to   { background-position: 50% 64%; }
	}
	@keyframes ksEmber {
		0% { opacity: 0; transform: translate(0,0) scale(.6); } 15% { opacity: 1; }
		100% { opacity: 0; transform: translate(calc(var(--ei) * 1.4px - 4px), -30px) scale(1.1); }
	}
	@keyframes ksBurnShake {
		0%,100% { transform: rotate(-3deg) translate(0,0); }
		25%     { transform: rotate(-3.7deg) translate(-.7px,.5px); }
		75%     { transform: rotate(-2.3deg) translate(.7px,-.6px); }
	}
	@keyframes ksImplode {
		0%   { opacity: 1; transform: rotate(-3deg) scale(1); }
		28%  { opacity: 1; transform: rotate(-7deg) scale(1.22); filter: brightness(1.6); }
		100% { opacity: 0; transform: rotate(14deg) scale(.1); filter: brightness(2.4); }
	}
	@keyframes ksShard {
		0%   { opacity: 0; transform: translate(0,0) rotate(0) scale(1.2); }
		12%  { opacity: 1; }
		100% { opacity: 0; transform: translate(var(--tx), calc(var(--ty) + 34px)) rotate(var(--r)) scale(.5); }
	}
	@keyframes ksPuff {
		0%   { opacity: 0; transform: scale(.4); }
		30%  { opacity: .8; transform: scale(1); }
		100% { opacity: 0; transform: scale(1.7); }
	}
	@keyframes ksFireOut { to { opacity: 0; } }

	/* ── Reduced motion / low effects: static, readable, no particles ──────── */
	.ks.reduced { animation: none; }
	.ks.reduced .ks-readout { animation: none; }
	.ks.reduced .ks-flash,
	.ks.reduced .ks-shock,
	.ks.reduced .ks-rays,
	.ks.reduced .ks-fire,
	.ks.reduced .ks-embers,
	.ks.reduced .ks-debris,
	.ks.reduced .ks-puff { display: none; }

	@media (max-width: 899px) {
		.ks { top: 2.5rem; right: .6rem; }
		.ks-num { font-size: 2.5rem; }
		.ks-x { font-size: 1.2rem; }
	}
</style>
