<script lang="ts">
	import { onMount } from 'svelte';
	import { Container, Rectangle, Text } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { stateBet, stateBetDerived, stateModal, stateSound } from 'state-shared';
	import { numberToCurrencyString } from 'utils-shared/amount';

	import {
		cycleSpinSpeedTier,
		getSpinSpeedDisplayTier,
		spinSpeedLabel,
	} from '../../game/spinSpeed.svelte';

	import {
		PILL_BORDER_RADIUS,
		PILL_FILL,
		PILL_FILL_ALPHA,
		PILL_STROKE,
		PILL_STROKE_ALPHA,
		PILL_STROKE_WIDTH,
	} from '../../game/uiBarTheme';
	import {
		TOOLBAR_MENU_GAP_ABOVE,
		TOOLBAR_MENU_I_FONT_SIZE,
		TOOLBAR_MENU_I_TO_LABEL,
		TOOLBAR_MENU_ICON_SIZE,
		TOOLBAR_MENU_LABEL_SIZE,
		TOOLBAR_MENU_SLIDER_THUMB_R,
		TOOLBAR_MENU_PAD,
		TOOLBAR_MENU_ROW_H,
		TOOLBAR_MENU_W,
	} from '../../game/toolbarMenuTheme';
	import { syncFootballBgmVolume } from '../../game/footballBgm';
	import { syncFootballSfxVolume } from '../../game/footballSoundPlayer';
	import { eventEmitter } from '../../game/eventEmitter';
	import { sound } from '../../game/sound';
	import { shouldDisplayNetPosition, shouldDisplaySessionTimer } from '../../game/jurisdiction';
	import ToolbarMenuIcons from './ToolbarMenuIcons.svelte';
	import ToolbarMenuSlider from './ToolbarMenuSlider.svelte';
	import { ensureAileronFont, isAileronFontReady } from '../../game/introFont';
	import { UI_FONT } from '../../game/uiFont';
	import { getPixiTextResolution, roundFontSize, roundPix } from '../../game/pixiTextCrisp';
	import { buyBonusLabel, autoSpinsActiveMenuLabel, autoSpinsMenuLabel } from '../../game/socialCopy';

	const FONT = UI_FONT;
	let aileronReady = $state(isAileronFontReady());

	type Props = {
		scale: number;
		/** Hamburger button centre X (screen space). */
		anchorX: number;
		y: number;
		/** Portrait: buy bonus / disable ante row. */
		showBonusRow?: boolean;
		onBonusPress?: () => void;
		bonusDisabled?: boolean;
		bonusAnteActive?: boolean;
		bonusFeatureSpinActive?: boolean;
		bonusPeakSpinActive?: boolean;
		/** Portrait: optional rows above INFO (auto spin, speed tier). */
		showAutoSpinRow?: boolean;
		showSpeedRow?: boolean;
		onAutoSpin?: () => void;
		autoSpinDisabled?: boolean;
		onClose?: () => void;
	};

	const props: Props = $props();
	const sx = $derived(props.scale);

	const menuW = $derived(TOOLBAR_MENU_W * sx);
	const pad = $derived(TOOLBAR_MENU_PAD * sx);
	const rowH = $derived(TOOLBAR_MENU_ROW_H * sx);

	const iconSize = $derived(TOOLBAR_MENU_ICON_SIZE * sx);

	const showBonusRow = $derived(props.showBonusRow ?? false);
	const showAutoRow = $derived(props.showAutoSpinRow ?? false);
	const showSpeedRowMenu = $derived(props.showSpeedRow ?? false);
	const showSessionTimerRow = $derived(shouldDisplaySessionTimer());
	const showNetPositionRow = $derived(shouldDisplayNetPosition());
	const gameplayRowCount = $derived(
		(showBonusRow ? 1 : 0) + (showAutoRow ? 1 : 0) + (showSpeedRowMenu ? 1 : 0),
	);
	const complianceRowCount = $derived(
		(showSessionTimerRow ? 1 : 0) + (showNetPositionRow ? 1 : 0),
	);
	const rowCount = $derived(3 + gameplayRowCount + complianceRowCount);
	const menuH = $derived(pad * 2 + rowH * rowCount);
	const complianceRowOffset = $derived(gameplayRowCount);
	const settingsRowOffset = $derived(gameplayRowCount + complianceRowCount);
	const bonusRowIndex = $derived(0);
	const autoRowIndex = $derived(showBonusRow ? 1 : 0);
	const speedRowIndex = $derived(autoRowIndex + (showAutoRow ? 1 : 0));
	const sessionTimerRowIndex = $derived(complianceRowOffset);
	const netPositionRowIndex = $derived(complianceRowOffset + (showSessionTimerRow ? 1 : 0));
	const bonusLabel = $derived(
		props.bonusPeakSpinActive
			? 'DISABLE SUMMIT SPIN'
			: props.bonusFeatureSpinActive
				? 'DISABLE FEATURE SPIN'
				: props.bonusAnteActive
					? 'DISABLE EXTRA CHANCE'
					: buyBonusLabel(),
	);
	const autoActive = $derived(stateBetDerived.hasAutoBetCounter());
	const autoLabel = $derived(
		autoActive
			? autoSpinsActiveMenuLabel(stateBet.autoSpinsCounter)
			: autoSpinsMenuLabel(),
	);
	const speedLabel = $derived(`SPEED: ${spinSpeedLabel(getSpinSpeedDisplayTier())}`);
	let sessionStartedAt = $state(Date.now());
	let nowMs = $state(Date.now());
	let sessionStartBalance = $state<number | null>(null);
	const sessionElapsedSeconds = $derived(Math.max(0, Math.floor((nowMs - sessionStartedAt) / 1000)));
	const sessionTimerLabel = $derived(
		`SESSION: ${Math.floor(sessionElapsedSeconds / 60)}:${String(sessionElapsedSeconds % 60).padStart(2, '0')}`,
	);
	const netPositionLabel = $derived(
		`NET: ${numberToCurrencyString(stateBet.balanceAmount - (sessionStartBalance ?? stateBet.balanceAmount))}`,
	);

	const menuTop = $derived(-menuH);

	const menuLeftX = $derived(props.anchorX - menuW / 2);

	/** Shared column layout — every row uses the same icon slot and content X. */
	const iconSlotX = $derived(roundPix(pad));
	const iconSlotY = $derived(roundPix((rowH - iconSize) / 2));
	const iconCenterX = $derived(roundPix(iconSlotX + iconSize / 2));
	const contentX = $derived(roundPix(pad + iconSize + TOOLBAR_MENU_I_TO_LABEL * sx));
	const rowCenterY = $derived(roundPix(rowH / 2));

	const textRes = getPixiTextResolution();

	const sliderW = $derived(menuW - contentX - pad);

	const sliderHitH = $derived(
		Math.max(28 * sx, TOOLBAR_MENU_SLIDER_THUMB_R * 2 * sx + 8 * sx),
	);

	const sliderSlotY = $derived(roundPix((rowH - sliderHitH) / 2));

	const labelStyle = $derived({
		fontFamily: aileronReady ? FONT : 'Arial',
		fontSize: roundFontSize(TOOLBAR_MENU_LABEL_SIZE * sx),
		fontWeight: 'bold' as const,
		fill: 0xffffff,
		letterSpacing: 0.5,
	});

	const iStyle = $derived({
		fontFamily: aileronReady ? FONT : 'Arial',
		fontSize: roundFontSize(TOOLBAR_MENU_I_FONT_SIZE * sx),
		fontWeight: 'bold' as const,
		fill: 0xffffff,
	});

	const rowTopY = (index: number) => roundPix(menuTop + pad + index * rowH);

	onMount(() => {
		void ensureAileronFont().then(() => {
			aileronReady = true;
		});
		const timer = window.setInterval(() => {
			nowMs = Date.now();
		}, 1000);
		return () => window.clearInterval(timer);
	});

	$effect(() => {
		if (sessionStartBalance != null || stateBet.balanceAmount <= 0) return;
		sessionStartBalance = stateBet.balanceAmount;
		sessionStartedAt = Date.now();
		nowMs = sessionStartedAt;
	});

	const setVolumeSfx = (value: number) => {
		stateSound.volumeValueSoundEffect = value;
		sound.applyVolumes();
		syncFootballSfxVolume();
	};

	const setVolumeMusic = (value: number) => {
		stateSound.volumeValueMusic = value;
		syncFootballBgmVolume();
	};

	const openInfo = () => {
		stateModal.modal = { name: 'payTable' };
		requestAnimationFrame(() => props.onClose?.());
	};

	const onAutoRow = () => {
		if (props.autoSpinDisabled) return;
		props.onAutoSpin?.();
	};

	const onSpeedRow = () => {
		cycleSpinSpeedTier();
	};

	const onBonusRow = () => {
		if (props.bonusDisabled) return;
		props.onBonusPress?.();
	};
</script>

<Container x={menuLeftX} y={props.y - TOOLBAR_MENU_GAP_ABOVE * sx} zIndex={100} eventMode="passive">
	<Rectangle
		x={0}
		y={menuTop}
		width={menuW}
		height={menuH}
		borderRadius={PILL_BORDER_RADIUS}
		backgroundColor={PILL_FILL}
		backgroundAlpha={PILL_FILL_ALPHA}
		borderColor={PILL_STROKE}
		borderAlpha={PILL_STROKE_ALPHA}
		borderWidth={PILL_STROKE_WIDTH}
		eventMode="none"
	/>

	{#if showBonusRow}
		<Container x={0} y={rowTopY(bonusRowIndex)}>
			<Button
				anchor={{ x: 0, y: 0 }}
				sizes={{ width: menuW, height: rowH }}
				disabled={props.bonusDisabled}
				onpress={onBonusRow}
			>
				{#snippet children()}
					{#if aileronReady}
						<Text anchor={0.5} x={iconCenterX} y={rowCenterY} text="B" eventMode="none" style={iStyle} resolution={textRes} />
						<Text
							anchor={{ x: 0, y: 0.5 }}
							x={contentX}
							y={rowCenterY}
							text={bonusLabel}
							eventMode="none"
							style={{
								...labelStyle,
								fill: props.bonusPeakSpinActive
									? 0xffd54f
									: props.bonusFeatureSpinActive
										? 0x50be50
										: props.bonusAnteActive
											? 0xffd700
											: 0xffffff,
							}}
							resolution={textRes}
						/>
					{/if}
				{/snippet}
			</Button>
		</Container>
	{/if}

	{#if showAutoRow}
		<Container x={0} y={rowTopY(autoRowIndex)}>
			<Button
				anchor={{ x: 0, y: 0 }}
				sizes={{ width: menuW, height: rowH }}
				disabled={props.autoSpinDisabled}
				onpress={onAutoRow}
			>
				{#snippet children()}
					{#if aileronReady}
						<Text anchor={0.5} x={iconCenterX} y={rowCenterY} text="A" eventMode="none" style={iStyle} resolution={textRes} />
						<Text
							anchor={{ x: 0, y: 0.5 }}
							x={contentX}
							y={rowCenterY}
							text={autoLabel}
							eventMode="none"
							style={{ ...labelStyle, fill: autoActive ? 0xffd700 : 0xffffff }}
							resolution={textRes}
						/>
					{/if}
				{/snippet}
			</Button>
		</Container>
	{/if}
	{#if showSpeedRowMenu}
		<Container x={0} y={rowTopY(speedRowIndex)}>
			<Button anchor={{ x: 0, y: 0 }} sizes={{ width: menuW, height: rowH }} onpress={onSpeedRow}>
				{#snippet children()}
					{#if aileronReady}
						<Text anchor={0.5} x={iconCenterX} y={rowCenterY} text="⚡" eventMode="none" style={iStyle} resolution={textRes} />
						<Text
							anchor={{ x: 0, y: 0.5 }}
							x={contentX}
							y={rowCenterY}
							text={speedLabel}
							eventMode="none"
							style={labelStyle}
							resolution={textRes}
						/>
					{/if}
				{/snippet}
			</Button>
		</Container>
	{/if}

	{#if showSessionTimerRow}
		<Container x={0} y={rowTopY(sessionTimerRowIndex)}>
			{#if aileronReady}
				<Text anchor={0.5} x={iconCenterX} y={rowCenterY} text="T" eventMode="none" style={iStyle} resolution={textRes} />
				<Text
					anchor={{ x: 0, y: 0.5 }}
					x={contentX}
					y={rowCenterY}
					text={sessionTimerLabel}
					eventMode="none"
					style={labelStyle}
					resolution={textRes}
				/>
			{/if}
		</Container>
	{/if}

	{#if showNetPositionRow}
		<Container x={0} y={rowTopY(netPositionRowIndex)}>
			{#if aileronReady}
				<Text anchor={0.5} x={iconCenterX} y={rowCenterY} text="N" eventMode="none" style={iStyle} resolution={textRes} />
				<Text
					anchor={{ x: 0, y: 0.5 }}
					x={contentX}
					y={rowCenterY}
					text={netPositionLabel}
					eventMode="none"
					style={labelStyle}
					resolution={textRes}
				/>
			{/if}
		</Container>
	{/if}

	<!-- INFO -->
	<Container
		x={0}
		y={rowTopY(settingsRowOffset)}
		eventMode="static"
		cursor="pointer"
		zIndex={2}
		onpointertap={(e) => {
			e.stopPropagation();
			eventEmitter.broadcast({ type: 'soundPressGeneral' });
			openInfo();
		}}
	>
		<Rectangle width={menuW} height={rowH} backgroundAlpha={0.001} />
		<Container x={iconSlotX} y={iconSlotY} eventMode="none">
			<ToolbarMenuIcons kind="info" scale={sx} />
		</Container>
		{#if aileronReady}
			<Text
				anchor={{ x: 0, y: 0.5 }}
				x={contentX}
				y={rowCenterY}
				text="INFO"
				eventMode="none"
				style={labelStyle}
				resolution={textRes}
			/>
		{/if}
	</Container>

	<!-- SFX -->
	<Container x={0} y={rowTopY(settingsRowOffset + 1)}>
		<Rectangle width={menuW} height={rowH} backgroundAlpha={0} eventMode="none" />
		<Container x={iconSlotX} y={iconSlotY}>
			<ToolbarMenuIcons kind="volume" scale={sx} />
		</Container>
		<Container x={contentX} y={sliderSlotY}>
			<ToolbarMenuSlider
				scale={sx}
				width={sliderW}
				value={stateSound.volumeValueSoundEffect}
				onchange={setVolumeSfx}
			/>
		</Container>
	</Container>

	<!-- MUSIC -->
	<Container x={0} y={rowTopY(settingsRowOffset + 2)}>
		<Rectangle width={menuW} height={rowH} backgroundAlpha={0} eventMode="none" />
		<Container x={iconSlotX} y={iconSlotY}>
			<ToolbarMenuIcons kind="music" scale={sx} />
		</Container>
		<Container x={contentX} y={sliderSlotY}>
			<ToolbarMenuSlider
				scale={sx}
				width={sliderW}
				value={stateSound.volumeValueMusic}
				onpreview={(v) => syncFootballBgmVolume(v)}
				onchange={setVolumeMusic}
			/>
		</Container>
	</Container>
</Container>
