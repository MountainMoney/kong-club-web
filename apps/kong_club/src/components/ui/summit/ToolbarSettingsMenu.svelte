<script lang="ts">
	import ToolbarMenuIcon from './ToolbarMenuIcon.svelte';
	import ToolbarMenuSlider from './ToolbarMenuSlider.svelte';
	import {
		TOOLBAR_MENU_I_TO_LABEL,
		TOOLBAR_MENU_LABEL_SIZE,
		TOOLBAR_MENU_PAD,
		TOOLBAR_MENU_ROW_H,
		TOOLBAR_MENU_W,
	} from '../../../game/toolbarMenuTheme';

	type Props = {
		scale?: number;
		sfxVolume?: number;
		musicVolume?: number;
		nativeRange?: boolean;
		onInfo: () => void;
		onSfxChange?: (value: number) => void;
		onMusicChange?: (value: number) => void;
		showBonusRow?: boolean;
		onBonusPress?: () => void;
		bonusDisabled?: boolean;
		bonusAnteActive?: boolean;
		showAutoSpinRow?: boolean;
		onAutoSpin?: () => void;
		autoSpinDisabled?: boolean;
		autoSpinActive?: boolean;
		autoSpinLabel?: string;
		bonusLabel?: string;
		showSpeedRow?: boolean;
		onSpeedPress?: () => void;
		speedLabel?: string;
		soundSrc: string;
		musicSrc: string;
	};

	let {
		scale = 1,
		sfxVolume = $bindable(75),
		musicVolume = $bindable(75),
		nativeRange = false,
		onInfo,
		onSfxChange = () => {},
		onMusicChange = () => {},
		showBonusRow = false,
		onBonusPress,
		bonusDisabled = false,
		bonusAnteActive = false,
		showAutoSpinRow = false,
		onAutoSpin,
		autoSpinDisabled = false,
		autoSpinActive = false,
		autoSpinLabel = 'AUTO SPINS',
		bonusLabel = 'BONUS',
		showSpeedRow = false,
		onSpeedPress,
		speedLabel = 'SPEED: Normal',
		soundSrc,
		musicSrc,
	}: Props = $props();

	const menuW = $derived(TOOLBAR_MENU_W * scale);
	const pad = $derived(TOOLBAR_MENU_PAD * scale);
	const rowH = $derived(TOOLBAR_MENU_ROW_H * scale);
	const iconGap = $derived(TOOLBAR_MENU_I_TO_LABEL * scale);
	const labelSize = $derived(TOOLBAR_MENU_LABEL_SIZE * scale);
	const resolvedBonusLabel = $derived(bonusAnteActive ? 'DISABLE EXTRA CHANCE' : bonusLabel);
</script>

<div
	class="toolbar-settings-menu"
	style={`width:${menuW}px;--menu-scale:${scale};--menu-pad:${pad}px;--menu-row-h:${rowH}px;--menu-icon-gap:${iconGap}px;--menu-label-size:${labelSize}px`}
>
	{#if showBonusRow}
		<button
			type="button"
			class="menu-row action-row"
			onclick={() => onBonusPress?.()}
			disabled={bonusDisabled}
		>
			<span class="menu-label">{resolvedBonusLabel}</span>
		</button>
	{/if}

	{#if showAutoSpinRow}
		<button
			type="button"
			class="menu-row action-row"
			class:active={autoSpinActive}
			onclick={() => onAutoSpin?.()}
			disabled={autoSpinDisabled}
		>
			<span class="menu-label">{autoSpinLabel}</span>
		</button>
	{/if}

	{#if showSpeedRow}
		<button type="button" class="menu-row action-row" onclick={() => onSpeedPress?.()}>
			<span class="menu-label">{speedLabel}</span>
		</button>
	{/if}

	<button type="button" class="menu-row info-row" onclick={() => onInfo()}>
		<span class="menu-info-i" aria-hidden="true">i</span>
		<span class="menu-label">GAME INFO</span>
	</button>

	<div class="menu-row slider-row">
		<ToolbarMenuIcon kind="volume" {scale} src={soundSrc} />
		<ToolbarMenuSlider {scale} nativeRange={nativeRange} bind:value={sfxVolume} onchange={onSfxChange} />
	</div>

	<div class="menu-row slider-row">
		<ToolbarMenuIcon kind="music" {scale} src={musicSrc} />
		<ToolbarMenuSlider {scale} nativeRange={nativeRange} bind:value={musicVolume} onchange={onMusicChange} onpreview={onMusicChange} />
	</div>
</div>

<style>
	.toolbar-settings-menu {
		display: grid;
		gap: 0;
		padding: var(--menu-pad);
		border: 2px solid #3a3a3a;
		border-radius: 16px;
		background-color: #161616;
		background-image: none;
		box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
	}

	.menu-row {
		display: grid;
		grid-template-columns: calc(26px * var(--menu-scale, 1)) minmax(0, 1fr);
		align-items: center;
		column-gap: var(--menu-icon-gap);
		min-height: var(--menu-row-h);
		width: 100%;
		margin: 0;
		padding: 0;
		border: 0;
		background: transparent;
		color: #fff;
		text-align: left;
		cursor: pointer;
	}

	.action-row {
		grid-template-columns: minmax(0, 1fr);
		padding: 0 4px;
	}

	.action-row,
	.info-row {
		transition: background-color 140ms ease, transform 140ms ease;
	}

	.action-row:hover:not(:disabled),
	.info-row:hover {
		background: rgba(255, 255, 255, 0.16);
		border-radius: 4px;
		transform: scale(1.02);
	}

	.action-row:disabled {
		opacity: 0.45;
		cursor: default;
	}

	.action-row.active .menu-label {
		opacity: 0.85;
	}

	.slider-row {
		cursor: default;
		touch-action: none;
	}

	.menu-info-i {
		display: block;
		justify-self: center;
		align-self: center;
		font-family: Fredoka, Inter, sans-serif;
		font-weight: 700;
		letter-spacing: 0.08em;
		font-size: calc(var(--menu-label-size) * 1.7);
		font-weight: 400;
		line-height: 1;
		letter-spacing: 0;
		color: #fff;
		-webkit-text-stroke: 0;
		text-shadow: var(--type-stroke-outside);
	}

	.menu-label {
		font-family: Fredoka, Inter, sans-serif;
		font-weight: 700;
		letter-spacing: 0.08em;
		font-size: var(--menu-label-size);
		font-weight: 400;
		letter-spacing: 0.02em;
		-webkit-text-stroke: 0;
		text-shadow: var(--type-stroke-outside);
	}
</style>
