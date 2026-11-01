<script lang="ts">
	import { onMount, tick } from 'svelte';

	import { stateFxLab, setPacingPreset, setCoinFacePreset, setCoinFaceFillLook, setCoinFaceMidCrease, resetCoinArtNudge, resetCoinFaceGradient, resetMultiFaceGradient, resetBagFaceGradient, setCoinDigitLab, setCoinCharLab, setMascotClip, resetMascotNudge, setBackgroundLook, MASCOT_CLIPS } from '../game/fxLab.svelte';
	import type { BackgroundLook } from '../game/fxLab.svelte';
	import {
		COIN_FACE_VALUES,
		cancelFxLabPreview,
		previewBonusHearChrome,
		previewCenterCountUp50,
		previewCenterCountUp150,
		previewCenterCountUp500,
		previewCenterCountUpMax,
		previewClusterFloaterOne,
		previewClusterFloaterRemount,
		previewClusterFloatersMulti,
		previewClusterSticky,
		previewCoinBronze,
		previewCoinFullBoard,
		previewCoinGold,
		previewCoinAllTiers,
		previewCoinLitTiles,
		previewCoinSilver,
		previewCoinWithTotal,
		previewPowerCollector,
		previewPowerCombo,
		previewPowerMulti,
		previewFeatureSpinChrome,
		previewForceBonusSeeSpin,
		previewForceBonusHearSpin,
		previewForceBonusMadnessSpin,
		previewForceGambleHearSpin,
		previewForceCoinActivationSpin,
		previewForceFeatureSpinBook,
		previewForcePeakSpinBook,
		previewForceLiveCollectorBook,
		previewForceLiveMultiBook,
		previewForceAnticipationSpin,
		previewFrameGlowOff,
		previewFrameGlowOn,
		previewFsCounterMid,
		previewFullActivation,
		previewProgressFull,
		previewProgressStep,
		previewProgressWalk,
		previewTilesBronze,
		previewTilesFull,
		previewTilesGold,
		previewTilesAllTiers,
		previewTilesSilver,
		previewToolbarPulse,
	} from '../game/fxLabPreview';
	import { getPacingLabel } from '../game/fxLabRunner';
	import { COIN_FACE_COIN_AB_OPTIONS, COIN_FACE_FILL_OPTIONS, COIN_FACE_STYLE_OPTIONS, fromCssHex, toCssHex, type CoinFaceCoinAbFillId, type CoinFaceFillId, type CoinFaceStyleId } from '../game/coinFaceStyles';
	import type { PacingPreset } from '../game/winPresentationTempo';

	const pacingPresets: { id: PacingPreset; label: string }[] = [
		{ id: 'snappy', label: 'Snappy' },
		{ id: 'standard', label: 'Standard' },
		{ id: 'cinematic', label: 'Cinematic' },
	];

	/** Start open so WIP tools are obvious; Hide collapses to a right-edge FAB. */
	let collapsed = $state(false);
	let openSection = $state<string>('coins');
	let panelEl = $state<HTMLElement | null>(null);

	const toggleSection = (id: string) => {
		openSection = openSection === id ? '' : id;
	};

	onMount(() => {
		void tick().then(() => {
			const el = panelEl;
			if (!el || el.parentElement === document.body) return;
			document.body.appendChild(el);
		});
		return () => {
			panelEl?.remove();
		};
	});

	const statusText = $derived.by(() => {
		if (stateFxLab.runnerStatus === 'running') {
			return `Running: ${stateFxLab.runnerLabel}`;
		}
		if (stateFxLab.runnerStatus === 'sticky') {
			return stateFxLab.runnerLabel || 'Sticky preview';
		}
		if (stateFxLab.runnerStatus === 'blocked') {
			return stateFxLab.runnerLabel || 'Blocked';
		}
		if (!stateFxLab.gameShellReady) {
			return 'Will auto-enter playfield on first preview';
		}
		return 'Ready';
	});

	const busy = $derived(stateFxLab.runnerStatus === 'running');

	type BandKey =
		| 'coinBandTopCB'
		| 'coinBandBotCB'
		| 'coinBandTopCS'
		| 'coinBandBotCS'
		| 'coinBandTopCG'
		| 'coinBandBotCG'
		| 'multiBandTopGreen'
		| 'multiBandBotGreen'
		| 'multiBandTopYellow'
		| 'multiBandBotYellow'
		| 'multiBandTopRed'
		| 'multiBandBotRed'
		| 'bagBandTop'
		| 'bagBandBot';

	const setBandHex = (key: BandKey, raw: string) => {
		const parsed = fromCssHex(raw);
		if (parsed == null) return;
		stateFxLab[key] = toCssHex(parsed);
	};
</script>

<aside
	bind:this={panelEl}
	class="fx-lab"
	class:collapsed
	aria-label="Monkey Mayhem WIP Debug"
>
	{#if collapsed}
		<button type="button" class="fx-lab__fab" onclick={() => (collapsed = false)}>
			MM DEBUG
		</button>
	{:else}
		<header class="fx-lab__head">
			<div class="fx-lab__title-row">
				<div>
					<strong>MM WIP Debug</strong>
					<span class="fx-lab__badge">local</span>
				</div>
				<button type="button" class="ghost" onclick={() => (collapsed = true)}>Hide</button>
			</div>
			<p
				class="fx-lab__status"
				class:running={stateFxLab.runnerStatus === 'running'}
				class:sticky={stateFxLab.runnerStatus === 'sticky'}
				class:blocked={stateFxLab.runnerStatus === 'blocked'}
			>
				{statusText}
			</p>
			<p class="fx-lab__hint">
				Sticky previews stay until Reset. Open via <code>?debug=true</code>.
			</p>
			<p class="fx-lab__hint">3 scatters = Sunny. 4 scatters = Midnight.</p>
			<div class="fx-lab__row wrap">
				{#each [{ id: 'day', label: 'Day' }, { id: 'sunny', label: 'Sunny' }, { id: 'midnight', label: 'Midnight' }] as option (option.id)}
					<button
						type="button"
						class={stateFxLab.backgroundLook === option.id ? 'primary' : ''}
						onclick={() => setBackgroundLook(option.id as BackgroundLook)}
					>
						{option.label}
					</button>
				{/each}
			</div>
		</header>

		<section class="fx-lab__section">
			<button type="button" class="section-head" onclick={() => toggleSection('quick')}>
				Quick {openSection === 'quick' ? '▾' : '▸'}
			</button>
			{#if openSection === 'quick'}
				<div class="fx-lab__row wrap">
					<button
						type="button"
						class="primary spawn"
						disabled={busy}
						onclick={() => previewFullActivation()}
					>
						Spawn coin game
					</button>
					<button type="button" class="primary" disabled={busy} onclick={() => previewCoinFullBoard()}>
						Full coin board
					</button>
					<button type="button" disabled={busy} onclick={() => previewPowerCombo()}>
						Power combo
					</button>
				</div>
			{/if}
		</section>

		<section class="fx-lab__section">
			<button type="button" class="section-head" onclick={() => toggleSection('coins')}>
				Coin collect <span class="wip">WIP</span>
				{openSection === 'coins' ? '▾' : '▸'}
			</button>
			{#if openSection === 'coins'}
				<p class="fx-lab__sub">
					Faces = bet multiples. Bronze {COIN_FACE_VALUES.CB.join('·')} · Silver
					{COIN_FACE_VALUES.CS.join('·')} · Gold {COIN_FACE_VALUES.CG.join('·')}
				</p>
				<p class="fx-lab__sub">
					Fill looks from Stake refs — Lime (1000) · Holo (x5) · Candy (500). Now = current metal.
					Production stays Now until you pick.
				</p>
				<div class="fx-lab__row wrap">
					{#each COIN_FACE_FILL_OPTIONS as option (option.id)}
						<button
							type="button"
							class={stateFxLab.coinFaceFillLook === option.id ? 'primary' : ''}
							onclick={() => setCoinFaceFillLook(option.id as CoinFaceFillId)}
						>
							{option.label}
						</button>
					{/each}
				</div>
				<p class="fx-lab__sub">
					Coin fill A/B — Enamel (light top) · Two-stop (raw bands) · Flat (almost no falloff). Coins
					only. Production stays Now until you pick.
				</p>
				<div class="fx-lab__row wrap">
					{#each COIN_FACE_COIN_AB_OPTIONS as option (option.id)}
						<button
							type="button"
							class={stateFxLab.coinFaceFillLook === option.id ? 'primary' : ''}
							onclick={() => setCoinFaceFillLook(option.id as CoinFaceCoinAbFillId)}
						>
							{option.label}
						</button>
					{/each}
				</div>
				<p class="fx-lab__sub">
					Mid crease — darker tint of each fill, slight blur so it fades. Lab only.
				</p>
				<div class="fx-lab__row wrap">
					<button
						type="button"
						class={stateFxLab.coinFaceMidCrease ? 'primary' : ''}
						onclick={() => setCoinFaceMidCrease(!stateFxLab.coinFaceMidCrease)}
					>
						{stateFxLab.coinFaceMidCrease ? 'Mid crease on' : 'Mid crease off'}
					</button>
				</div>
				<p class="fx-lab__sub">Number shadow — Hard / Tight / Soft (Now fill only).</p>
				<div class="fx-lab__row wrap">
					{#each COIN_FACE_STYLE_OPTIONS as option (option.id)}
						<button
							type="button"
							class={stateFxLab.coinFacePreset === option.id ? 'primary' : ''}
							onclick={() => setCoinFacePreset(option.id as CoinFaceStyleId)}
						>
							{option.label}
						</button>
					{/each}
				</div>
				<div class="fx-lab__row wrap">
					<button type="button" disabled={busy} onclick={() => previewCoinLitTiles()}>Lit tiles</button>
					<button type="button" class="primary" disabled={busy} onclick={() => previewCoinBronze()}>
						Bronze
					</button>
					<button type="button" disabled={busy} onclick={() => previewCoinSilver()}>Silver</button>
					<button type="button" disabled={busy} onclick={() => previewCoinGold()}>Gold</button>
					<button type="button" class="primary" disabled={busy} onclick={() => previewCoinFullBoard()}>
						Full board
					</button>
					<button type="button" disabled={busy} onclick={() => previewCoinAllTiers()}>All tiers</button>
					<button type="button" disabled={busy} onclick={() => previewCoinWithTotal()}>+ Total</button>
					<button type="button" class="primary" disabled={busy} onclick={() => previewFullActivation()}>
						Bar → coins
					</button>
				</div>
				<p class="fx-lab__sub">
					Letter fill gradient — top / bot bands on the numbers (not the outline). Spawn Full board,
					pick colors, send the readout.
				</p>
				<label class="fx-lab__color">
					<span>Br top</span>
					<input
						type="color"
						value={stateFxLab.coinBandTopCB}
						oninput={(e) => setBandHex('coinBandTopCB', e.currentTarget.value)}
					/>
					<input
						type="text"
						spellcheck="false"
						value={stateFxLab.coinBandTopCB}
						oninput={(e) => setBandHex('coinBandTopCB', e.currentTarget.value)}
					/>
				</label>
				<label class="fx-lab__color">
					<span>Br bot</span>
					<input
						type="color"
						value={stateFxLab.coinBandBotCB}
						oninput={(e) => setBandHex('coinBandBotCB', e.currentTarget.value)}
					/>
					<input
						type="text"
						spellcheck="false"
						value={stateFxLab.coinBandBotCB}
						oninput={(e) => setBandHex('coinBandBotCB', e.currentTarget.value)}
					/>
				</label>
				<label class="fx-lab__color">
					<span>Ag top</span>
					<input
						type="color"
						value={stateFxLab.coinBandTopCS}
						oninput={(e) => setBandHex('coinBandTopCS', e.currentTarget.value)}
					/>
					<input
						type="text"
						spellcheck="false"
						value={stateFxLab.coinBandTopCS}
						oninput={(e) => setBandHex('coinBandTopCS', e.currentTarget.value)}
					/>
				</label>
				<label class="fx-lab__color">
					<span>Ag bot</span>
					<input
						type="color"
						value={stateFxLab.coinBandBotCS}
						oninput={(e) => setBandHex('coinBandBotCS', e.currentTarget.value)}
					/>
					<input
						type="text"
						spellcheck="false"
						value={stateFxLab.coinBandBotCS}
						oninput={(e) => setBandHex('coinBandBotCS', e.currentTarget.value)}
					/>
				</label>
				<label class="fx-lab__color">
					<span>Au top</span>
					<input
						type="color"
						value={stateFxLab.coinBandTopCG}
						oninput={(e) => setBandHex('coinBandTopCG', e.currentTarget.value)}
					/>
					<input
						type="text"
						spellcheck="false"
						value={stateFxLab.coinBandTopCG}
						oninput={(e) => setBandHex('coinBandTopCG', e.currentTarget.value)}
					/>
				</label>
				<label class="fx-lab__color">
					<span>Au bot</span>
					<input
						type="color"
						value={stateFxLab.coinBandBotCG}
						oninput={(e) => setBandHex('coinBandBotCG', e.currentTarget.value)}
					/>
					<input
						type="text"
						spellcheck="false"
						value={stateFxLab.coinBandBotCG}
						oninput={(e) => setBandHex('coinBandBotCG', e.currentTarget.value)}
					/>
				</label>
				<p class="fx-lab__hint">
					<code>
						grad CB {stateFxLab.coinBandTopCB}/{stateFxLab.coinBandBotCB} CS
						{stateFxLab.coinBandTopCS}/{stateFxLab.coinBandBotCS} CG {stateFxLab.coinBandTopCG}/{stateFxLab.coinBandBotCG}
					</code>
				</p>
				<div class="fx-lab__row wrap">
					<button type="button" class="reset" onclick={() => resetCoinFaceGradient()}>
						Reset gradient
					</button>
				</div>
				<p class="fx-lab__sub">
					MULTI xN fill — same 2-stop as coins. Spawn Full board or Sit, pick Gn / Yl / Rd, send the
					readout.
				</p>
				<label class="fx-lab__color">
					<span>Gn top</span>
					<input
						type="color"
						value={stateFxLab.multiBandTopGreen}
						oninput={(e) => setBandHex('multiBandTopGreen', e.currentTarget.value)}
					/>
					<input
						type="text"
						spellcheck="false"
						value={stateFxLab.multiBandTopGreen}
						oninput={(e) => setBandHex('multiBandTopGreen', e.currentTarget.value)}
					/>
				</label>
				<label class="fx-lab__color">
					<span>Gn bot</span>
					<input
						type="color"
						value={stateFxLab.multiBandBotGreen}
						oninput={(e) => setBandHex('multiBandBotGreen', e.currentTarget.value)}
					/>
					<input
						type="text"
						spellcheck="false"
						value={stateFxLab.multiBandBotGreen}
						oninput={(e) => setBandHex('multiBandBotGreen', e.currentTarget.value)}
					/>
				</label>
				<label class="fx-lab__color">
					<span>Yl top</span>
					<input
						type="color"
						value={stateFxLab.multiBandTopYellow}
						oninput={(e) => setBandHex('multiBandTopYellow', e.currentTarget.value)}
					/>
					<input
						type="text"
						spellcheck="false"
						value={stateFxLab.multiBandTopYellow}
						oninput={(e) => setBandHex('multiBandTopYellow', e.currentTarget.value)}
					/>
				</label>
				<label class="fx-lab__color">
					<span>Yl bot</span>
					<input
						type="color"
						value={stateFxLab.multiBandBotYellow}
						oninput={(e) => setBandHex('multiBandBotYellow', e.currentTarget.value)}
					/>
					<input
						type="text"
						spellcheck="false"
						value={stateFxLab.multiBandBotYellow}
						oninput={(e) => setBandHex('multiBandBotYellow', e.currentTarget.value)}
					/>
				</label>
				<label class="fx-lab__color">
					<span>Rd top</span>
					<input
						type="color"
						value={stateFxLab.multiBandTopRed}
						oninput={(e) => setBandHex('multiBandTopRed', e.currentTarget.value)}
					/>
					<input
						type="text"
						spellcheck="false"
						value={stateFxLab.multiBandTopRed}
						oninput={(e) => setBandHex('multiBandTopRed', e.currentTarget.value)}
					/>
				</label>
				<label class="fx-lab__color">
					<span>Rd bot</span>
					<input
						type="color"
						value={stateFxLab.multiBandBotRed}
						oninput={(e) => setBandHex('multiBandBotRed', e.currentTarget.value)}
					/>
					<input
						type="text"
						spellcheck="false"
						value={stateFxLab.multiBandBotRed}
						oninput={(e) => setBandHex('multiBandBotRed', e.currentTarget.value)}
					/>
				</label>
				<p class="fx-lab__hint">
					<code>
						multi Gn {stateFxLab.multiBandTopGreen}/{stateFxLab.multiBandBotGreen} Yl
						{stateFxLab.multiBandTopYellow}/{stateFxLab.multiBandBotYellow} Rd
						{stateFxLab.multiBandTopRed}/{stateFxLab.multiBandBotRed}
					</code>
				</p>
				<div class="fx-lab__row wrap">
					<button type="button" class="reset" onclick={() => resetMultiFaceGradient()}>
						Reset MULTI
					</button>
				</div>
				<p class="fx-lab__sub">
					Bag / pot numbers — same 2-stop. Spawn Full board or Sit, pick Bag top / bot, send the
					readout.
				</p>
				<label class="fx-lab__color">
					<span>Bag top</span>
					<input
						type="color"
						value={stateFxLab.bagBandTop}
						oninput={(e) => setBandHex('bagBandTop', e.currentTarget.value)}
					/>
					<input
						type="text"
						spellcheck="false"
						value={stateFxLab.bagBandTop}
						oninput={(e) => setBandHex('bagBandTop', e.currentTarget.value)}
					/>
				</label>
				<label class="fx-lab__color">
					<span>Bag bot</span>
					<input
						type="color"
						value={stateFxLab.bagBandBot}
						oninput={(e) => setBandHex('bagBandBot', e.currentTarget.value)}
					/>
					<input
						type="text"
						spellcheck="false"
						value={stateFxLab.bagBandBot}
						oninput={(e) => setBandHex('bagBandBot', e.currentTarget.value)}
					/>
				</label>
				<p class="fx-lab__hint">
					<code>bag {stateFxLab.bagBandTop}/{stateFxLab.bagBandBot}</code>
				</p>
				<div class="fx-lab__row wrap">
					<button type="button" class="reset" onclick={() => resetBagFaceGradient()}>
						Reset bag
					</button>
				</div>
				<p class="fx-lab__sub">
					Locked: disc scale 1.10. Production sit is per digit count. Sliders below are extra on that
					(coins, pots, and MULTI xN). Spawn Full board, then send the readout.
				</p>
				<label class="fx-lab__slider">
					<span>Disc X {Number(stateFxLab.coinArtX).toFixed(1)}px</span>
					<input
						type="range"
						min="-24"
						max="24"
						step="0.5"
						value={stateFxLab.coinArtX}
						oninput={(e) => {
							stateFxLab.coinArtX = Number(e.currentTarget.value);
						}}
					/>
				</label>
				<label class="fx-lab__slider">
					<span>Disc Y {Number(stateFxLab.coinArtY).toFixed(1)}px</span>
					<input
						type="range"
						min="-24"
						max="24"
						step="0.5"
						value={stateFxLab.coinArtY}
						oninput={(e) => {
							stateFxLab.coinArtY = Number(e.currentTarget.value);
						}}
					/>
				</label>
				<label class="fx-lab__slider">
					<span>Disc scale {Number(stateFxLab.coinArtScale).toFixed(2)}</span>
					<input
						type="range"
						min="0.8"
						max="1.2"
						step="0.01"
						value={stateFxLab.coinArtScale}
						oninput={(e) => {
							stateFxLab.coinArtScale = Number(e.currentTarget.value);
						}}
					/>
				</label>
				{#each [1, 2, 3, 4, 5] as digits (digits)}
					<label class="fx-lab__slider">
						<span>{digits}d X {Number(stateFxLab.coinDigitX[digits - 1]).toFixed(1)}px</span>
						<input
							type="range"
							min="-24"
							max="24"
							step="0.5"
							value={stateFxLab.coinDigitX[digits - 1]}
							oninput={(e) => setCoinDigitLab(digits, 'x', Number(e.currentTarget.value))}
						/>
					</label>
					<label class="fx-lab__slider">
						<span>{digits}d Y {Number(stateFxLab.coinDigitY[digits - 1]).toFixed(1)}px</span>
						<input
							type="range"
							min="-24"
							max="24"
							step="0.5"
							value={stateFxLab.coinDigitY[digits - 1]}
							oninput={(e) => setCoinDigitLab(digits, 'y', Number(e.currentTarget.value))}
						/>
					</label>
				{/each}
				<p class="fx-lab__sub">Single-digit glyph sit — pick 1–9, then slide. 1d X/Y still moves every 1-digit face.</p>
				<div class="fx-lab__row wrap">
					{#each ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as glyph (glyph)}
						<button
							type="button"
							class:primary={stateFxLab.coinCharFocus === glyph}
							onclick={() => (stateFxLab.coinCharFocus = glyph)}
						>
							{glyph}
						</button>
					{/each}
				</div>
				<label class="fx-lab__slider">
					<span
						>{stateFxLab.coinCharFocus} X {Number(
							stateFxLab.coinCharX[Number(stateFxLab.coinCharFocus) - 1],
						).toFixed(1)}px</span
					>
					<input
						type="range"
						min="-24"
						max="24"
						step="0.5"
						value={stateFxLab.coinCharX[Number(stateFxLab.coinCharFocus) - 1]}
						oninput={(e) =>
							setCoinCharLab(stateFxLab.coinCharFocus, 'x', Number(e.currentTarget.value))}
					/>
				</label>
				<label class="fx-lab__slider">
					<span
						>{stateFxLab.coinCharFocus} Y {Number(
							stateFxLab.coinCharY[Number(stateFxLab.coinCharFocus) - 1],
						).toFixed(1)}px</span
					>
					<input
						type="range"
						min="-24"
						max="24"
						step="0.5"
						value={stateFxLab.coinCharY[Number(stateFxLab.coinCharFocus) - 1]}
						oninput={(e) =>
							setCoinCharLab(stateFxLab.coinCharFocus, 'y', Number(e.currentTarget.value))}
					/>
				</label>
				<p class="fx-lab__hint">
					<code>
						disc {stateFxLab.coinArtX.toFixed(1)}, {stateFxLab.coinArtY.toFixed(1)} scale
						{stateFxLab.coinArtScale.toFixed(2)} · sit
						{#each [1, 2, 3, 4, 5] as digits (digits)}
							{digits}d {stateFxLab.coinDigitX[digits - 1].toFixed(1)},{stateFxLab.coinDigitY[digits - 1].toFixed(1)}{digits < 5 ? ' · ' : ''}
						{/each}
						· glyph
						{#each ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as glyph (glyph)}
							{glyph} {stateFxLab.coinCharX[Number(glyph) - 1].toFixed(1)},{stateFxLab.coinCharY[Number(glyph) - 1].toFixed(1)}{glyph < '9' ? ' · ' : ''}
						{/each}
					</code>
				</p>
				<div class="fx-lab__row wrap">
					<button type="button" onclick={() => (stateFxLab.coinArtX -= 1)}>Disc ←</button>
					<button type="button" onclick={() => (stateFxLab.coinArtX += 1)}>Disc →</button>
					<button type="button" onclick={() => (stateFxLab.coinArtY -= 1)}>Disc ↑</button>
					<button type="button" onclick={() => (stateFxLab.coinArtY += 1)}>Disc ↓</button>
					<button type="button" class="reset" onclick={() => resetCoinArtNudge()}>Reset 0</button>
				</div>
			{/if}
		</section>

		<section class="fx-lab__section">
			<button type="button" class="section-head" onclick={() => toggleSection('mascot')}>
				Mascot
				{openSection === 'mascot' ? '▾' : '▸'}
			</button>
			{#if openSection === 'mascot'}
				<p class="fx-lab__sub">
					MM_Mascot_2 clips. Idle / random idle loop. Others play once, then idle.
				</p>
				<div class="fx-lab__row wrap">
					{#each MASCOT_CLIPS as clip (clip.id)}
						<button
							type="button"
							class:primary={stateFxLab.mascotClip === clip.id}
							onclick={() => setMascotClip(clip.id)}
						>
							{clip.label}
						</button>
					{/each}
				</div>
				<label class="fx-lab__slider">
					<span>X {stateFxLab.mascotX.toFixed(0)}px</span>
					<input
						type="range"
						min="-240"
						max="240"
						step="1"
						value={stateFxLab.mascotX}
						oninput={(e) => (stateFxLab.mascotX = Number(e.currentTarget.value))}
					/>
				</label>
				<label class="fx-lab__slider">
					<span>Y {stateFxLab.mascotY.toFixed(0)}px</span>
					<input
						type="range"
						min="-240"
						max="240"
						step="1"
						value={stateFxLab.mascotY}
						oninput={(e) => (stateFxLab.mascotY = Number(e.currentTarget.value))}
					/>
				</label>
				<label class="fx-lab__slider">
					<span>Speed {stateFxLab.mascotTimeScale.toFixed(2)}×</span>
					<input
						type="range"
						min="0.25"
						max="1.25"
						step="0.05"
						value={stateFxLab.mascotTimeScale}
						oninput={(e) => (stateFxLab.mascotTimeScale = Number(e.currentTarget.value))}
					/>
				</label>
				<label class="fx-lab__slider">
					<span>Scale {stateFxLab.mascotScale.toFixed(2)}</span>
					<input
						type="range"
						min="0.4"
						max="1.8"
						step="0.02"
						value={stateFxLab.mascotScale}
						oninput={(e) => (stateFxLab.mascotScale = Number(e.currentTarget.value))}
					/>
				</label>
				<p class="fx-lab__hint">
					<code>
						mascot {stateFxLab.mascotX.toFixed(0)}, {stateFxLab.mascotY.toFixed(0)} scale
						{stateFxLab.mascotScale.toFixed(2)} speed {stateFxLab.mascotTimeScale.toFixed(2)}
					</code>
				</p>
				<div class="fx-lab__row wrap">
					<button type="button" onclick={() => (stateFxLab.mascotX -= 4)}>←</button>
					<button type="button" onclick={() => (stateFxLab.mascotX += 4)}>→</button>
					<button type="button" onclick={() => (stateFxLab.mascotY -= 4)}>↑</button>
					<button type="button" onclick={() => (stateFxLab.mascotY += 4)}>↓</button>
					<button type="button" class="reset" onclick={() => resetMascotNudge()}>Reset 0</button>
				</div>
			{/if}
		</section>

		<section class="fx-lab__section">
			<button type="button" class="section-head" onclick={() => toggleSection('powers')}>
				Coin powers
				{openSection === 'powers' ? '▾' : '▸'}
			</button>
			{#if openSection === 'powers'}
				<p class="fx-lab__sub">
					Live in every mode (rare). Hollow head → eyes fade (green 2–4 · yellow 5/10 · red 20) → xN pops → distribute.
				</p>
				<div class="fx-lab__row wrap">
					<button type="button" class="primary" disabled={busy} onclick={() => previewPowerMulti()}>
						MULTI
					</button>
					<button type="button" disabled={busy} onclick={() => previewPowerMulti(2)}>x2</button>
					<button type="button" disabled={busy} onclick={() => previewPowerMulti(5)}>x5</button>
					<button type="button" disabled={busy} onclick={() => previewPowerMulti(20)}>x20</button>
					<button type="button" disabled={busy} onclick={() => previewPowerCollector()}>
						COLLECTOR
					</button>
					<button type="button" class="primary" disabled={busy} onclick={() => previewPowerCombo()}>
						Combo
					</button>
					<button type="button" class="primary" disabled={busy} onclick={() => previewForceLiveMultiBook()}>
						Force live MULTI
					</button>
					<button type="button" class="primary" disabled={busy} onclick={() => previewForceLiveCollectorBook()}>
						Force live COLLECTOR
					</button>
				</div>
			{/if}
		</section>

		<section class="fx-lab__section">
			<button type="button" class="section-head" onclick={() => toggleSection('tiles')}>
				Level-up tiles <span class="wip">WIP</span>
				{openSection === 'tiles' ? '▾' : '▸'}
			</button>
			{#if openSection === 'tiles'}
				<p class="fx-lab__sub">Plaque tiers only — no coin reveal.</p>
				<div class="fx-lab__row wrap">
					<button type="button" disabled={busy} onclick={() => previewTilesBronze()}>Bronze</button>
					<button type="button" disabled={busy} onclick={() => previewTilesSilver()}>Silver</button>
					<button type="button" disabled={busy} onclick={() => previewTilesGold()}>Gold</button>
					<button type="button" class="primary" disabled={busy} onclick={() => previewTilesFull()}>
						Full board
					</button>
					<button type="button" disabled={busy} onclick={() => previewTilesAllTiers()}>
						All tiers
					</button>
				</div>
			{/if}
		</section>

		<section class="fx-lab__section">
			<button type="button" class="section-head" onclick={() => toggleSection('progress')}>
				Progress bar {openSection === 'progress' ? '▾' : '▸'}
			</button>
			{#if openSection === 'progress'}
				<p class="fx-lab__sub">Threshold 5 (base / Hear / Feature).</p>
				<div class="fx-lab__row wrap">
					<button type="button" disabled={busy} onclick={() => previewProgressStep(1)}>1/5</button>
					<button type="button" disabled={busy} onclick={() => previewProgressStep(2)}>2/5</button>
					<button type="button" disabled={busy} onclick={() => previewProgressStep(3)}>3/5</button>
					<button type="button" disabled={busy} onclick={() => previewProgressStep(4)}>4/5</button>
					<button type="button" class="primary" disabled={busy} onclick={() => previewProgressFull()}>
						5/5
					</button>
					<button type="button" disabled={busy} onclick={() => previewProgressWalk()}>
						Flow 0→5
					</button>
				</div>
			{/if}
		</section>

		<section class="fx-lab__section">
			<button type="button" class="section-head" onclick={() => toggleSection('cluster')}>
				Cluster wins <span class="wip">WIP</span>
				{openSection === 'cluster' ? '▾' : '▸'}
			</button>
			{#if openSection === 'cluster'}
				<p class="fx-lab__sub">Per-connection floaters over symbols (z-order / timing).</p>
				<div class="fx-lab__row wrap">
					<button type="button" disabled={busy} onclick={() => previewClusterFloaterOne()}>
						Single
					</button>
					<button
						type="button"
						class="primary"
						disabled={busy}
						onclick={() => previewClusterFloatersMulti()}
					>
						Multi
					</button>
					<button type="button" disabled={busy} onclick={() => previewClusterFloaterRemount()}>
						+ Remount
					</button>
					<button type="button" disabled={busy} onclick={() => previewClusterSticky()}>
						Sticky hold
					</button>
				</div>
			{/if}
		</section>

		<section class="fx-lab__section">
			<button type="button" class="section-head" onclick={() => toggleSection('bonus')}>
				Bonus / modes <span class="wip">WIP</span>
				{openSection === 'bonus' ? '▾' : '▸'}
			</button>
			{#if openSection === 'bonus'}
				<p class="fx-lab__sub">Hear / Feature chrome without a full book.</p>
				<div class="fx-lab__row wrap">
					<button type="button" disabled={busy} onclick={() => previewBonusHearChrome()}>
						Hear chrome
					</button>
					<button type="button" disabled={busy} onclick={() => previewFeatureSpinChrome()}>
						Feature Spin
					</button>
					<button type="button" disabled={busy} onclick={() => previewFsCounterMid()}>
						FS 4/10
					</button>
					<button type="button" disabled={busy} onclick={() => previewFrameGlowOn()}>Glow on</button>
					<button type="button" disabled={busy} onclick={() => previewFrameGlowOff()}>
						Glow off
					</button>
				</div>
			{/if}
		</section>

		<section class="fx-lab__section">
			<button type="button" class="section-head" onclick={() => toggleSection('books')}>
				Force books <span class="wip">WIP</span>
				{openSection === 'books' ? '▾' : '▸'}
			</button>
			{#if openSection === 'books'}
				<p class="fx-lab__sub">Real spin + forced math book. Don’t Reset mid-spin.</p>
				<div class="fx-lab__row wrap">
					<button type="button" class="primary" disabled={busy} onclick={() => previewForceAnticipationSpin()}>
						2+ ST tease
					</button>
					<button
						type="button"
						class="primary"
						disabled={busy}
						onclick={() => previewForceCoinActivationSpin()}
					>
						Coin activation
					</button>
					<button type="button" disabled={busy} onclick={() => previewForceFeatureSpinBook()}>
						Feature book
					</button>
					<button type="button" disabled={busy} onclick={() => previewForcePeakSpinBook()}>
						SUMMIT book
					</button>
					<button type="button" disabled={busy} onclick={() => previewForceBonusSeeSpin()}>
						See bonus
					</button>
					<button type="button" disabled={busy} onclick={() => previewForceBonusHearSpin()}>
						Hear bonus
					</button>
					<button type="button" class="primary" disabled={busy} onclick={() => previewForceBonusMadnessSpin()}>
						5 ST Madness
					</button>
					<button type="button" class="primary" disabled={busy} onclick={() => previewForceGambleHearSpin()}>
						Gamble Hear
					</button>
					<button type="button" class="primary" disabled={busy} onclick={() => previewForceLiveMultiBook()}>
						Live MULTI
					</button>
					<button type="button" class="primary" disabled={busy} onclick={() => previewForceLiveCollectorBook()}>
						Live COLLECTOR
					</button>
				</div>
			{/if}
		</section>

		<section class="fx-lab__section">
			<button type="button" class="section-head" onclick={() => toggleSection('win')}>
				Win overlays <span class="wip">WIP</span>
				{openSection === 'win' ? '▾' : '▸'}
			</button>
			{#if openSection === 'win'}
				<p class="fx-lab__sub">Center count-up + toolbar flash (no paylines).</p>
				<div class="fx-lab__row wrap">
					<button type="button" disabled={busy} onclick={() => previewCenterCountUp50()}>50×</button>
					<button
						type="button"
						class="primary"
						disabled={busy}
						onclick={() => previewCenterCountUp150()}
					>
						150×
					</button>
					<button type="button" disabled={busy} onclick={() => previewCenterCountUp500()}>
						500×
					</button>
					<button type="button" disabled={busy} onclick={() => previewCenterCountUpMax()}>
						25000×
					</button>
					<button type="button" disabled={busy} onclick={() => previewToolbarPulse()}>
						Toolbar flash
					</button>
				</div>
			{/if}
		</section>

		<section class="fx-lab__section">
			<button type="button" class="section-head" onclick={() => toggleSection('pacing')}>
				Pacing {openSection === 'pacing' ? '▾' : '▸'}
			</button>
			{#if openSection === 'pacing'}
				<p class="fx-lab__sub">{getPacingLabel()}</p>
				<div class="fx-lab__row">
					{#each pacingPresets as preset (preset.id)}
						<button
							type="button"
							class:active={stateFxLab.pacingPreset === preset.id}
							disabled={busy}
							onclick={() => setPacingPreset(preset.id)}
						>
							{preset.label}
						</button>
					{/each}
				</div>
			{/if}
		</section>

		<section class="fx-lab__footer">
			<button type="button" class="reset" onclick={() => cancelFxLabPreview()}>Reset scene</button>
			<p class="fx-lab__note">
				Gold = common path. WIP = not finalized for ship. Sticky = stays until Reset.
			</p>
		</section>
	{/if}
</aside>

<style>
	.fx-lab {
		position: fixed !important;
		top: 12px !important;
		right: 12px !important;
		left: auto !important;
		z-index: 2147483647 !important;
		width: min(300px, calc(100vw - 24px));
		max-height: calc(100vh - 24px);
		overflow: auto;
		scrollbar-width: thin;
		pointer-events: auto;
		font-family: system-ui, sans-serif;
		font-size: 11px;
		color: #f5f5f5;
		background: rgba(8, 14, 20, 0.97);
		border: 2px solid #ffab00;
		border-radius: 12px;
		padding: 10px;
		box-shadow: 0 10px 36px rgba(0, 0, 0, 0.65);
	}
	.fx-lab.collapsed {
		width: auto;
		padding: 0;
		background: transparent;
		border: none;
		box-shadow: none;
		overflow: visible;
	}
	.fx-lab__fab {
		font-family: inherit;
		font-size: 12px;
		font-weight: 900;
		letter-spacing: 0.06em;
		padding: 12px 14px;
		border-radius: 10px;
		border: 3px solid #ffd700;
		background: #e65100;
		color: #fff;
		cursor: pointer;
		box-shadow: 0 4px 18px rgba(0, 0, 0, 0.55);
	}
	.fx-lab__head {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-bottom: 6px;
	}
	.fx-lab__title-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}
	.fx-lab__badge {
		margin-left: 6px;
		font-size: 9px;
		font-weight: 800;
		padding: 2px 6px;
		border-radius: 999px;
		background: #1b5e20;
		color: #c8e6c9;
		vertical-align: middle;
	}
	.wip {
		margin-left: 4px;
		font-size: 8px;
		font-weight: 900;
		letter-spacing: 0.04em;
		padding: 1px 5px;
		border-radius: 4px;
		background: #bf360c;
		color: #ffe0b2;
	}
	.fx-lab__hint {
		margin: 0;
		font-size: 9px;
		opacity: 0.65;
		line-height: 1.35;
	}
	.fx-lab__hint code {
		font-size: 8px;
	}
	.fx-lab__status {
		margin: 0;
		font-size: 10px;
		opacity: 0.85;
		font-weight: 700;
	}
	.fx-lab__status.running {
		color: #81c784;
		opacity: 1;
	}
	.fx-lab__status.sticky {
		color: #ffd54f;
		opacity: 1;
	}
	.fx-lab__status.blocked {
		color: #ff8a80;
		opacity: 1;
	}
	.fx-lab__section {
		border-top: 1px solid rgba(255, 171, 0, 0.22);
		padding-top: 4px;
		margin-top: 4px;
	}
	.section-head {
		width: 100%;
		text-align: left;
		background: transparent;
		border: none;
		color: #ffd700;
		font-size: 10px;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 6px 0;
		cursor: pointer;
	}
	.fx-lab__sub {
		margin: 0 0 6px;
		font-size: 9px;
		opacity: 0.72;
		line-height: 1.35;
	}
	.fx-lab__slider {
		display: grid;
		gap: 2px;
		margin-bottom: 6px;
		font-size: 9px;
		font-weight: 700;
		color: #ffe0b2;
	}
	.fx-lab__slider input[type='range'] {
		width: 100%;
		accent-color: #ffd700;
	}
	.fx-lab__color {
		display: grid;
		grid-template-columns: 48px 36px 1fr;
		align-items: center;
		gap: 6px;
		margin-bottom: 6px;
		font-size: 9px;
		font-weight: 700;
		color: #ffe0b2;
	}
	.fx-lab__color input[type='color'] {
		width: 36px;
		height: 22px;
		padding: 0;
		border: 1px solid #555;
		background: #111;
		cursor: pointer;
	}
	.fx-lab__color input[type='text'] {
		font-family: ui-monospace, monospace;
		font-size: 10px;
		font-weight: 700;
		padding: 4px 6px;
		border-radius: 4px;
		border: 1px solid #555;
		background: #1a2327;
		color: #fff;
	}
	.fx-lab__row {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-bottom: 6px;
	}
	button {
		font-family: inherit;
		font-size: 10px;
		font-weight: 700;
		padding: 5px 8px;
		border-radius: 5px;
		border: 1px solid #555;
		background: #263238;
		color: #fff;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	button.primary {
		border-color: #ffd700;
		background: #1b5e20;
	}
	button.spawn {
		width: 100%;
		font-size: 12px;
		padding: 8px 10px;
		background: #e65100;
		border-color: #ffab40;
	}
	button.active {
		background: #ffd700;
		color: #1b5e20;
	}
	button.ghost {
		background: transparent;
		border-color: #666;
		font-size: 9px;
		padding: 3px 6px;
	}
	button.reset {
		width: 100%;
		border-color: #ff5252;
		background: #4a1010;
	}
	.fx-lab__footer {
		margin-top: 8px;
		padding-top: 8px;
		border-top: 1px solid rgba(255, 215, 0, 0.25);
	}
	.fx-lab__note {
		margin: 6px 0 0;
		font-size: 9px;
		opacity: 0.6;
		line-height: 1.35;
	}
</style>
