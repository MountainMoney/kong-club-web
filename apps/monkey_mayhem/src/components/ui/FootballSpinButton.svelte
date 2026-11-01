<script lang="ts">
	import { Container, Graphics, Rectangle, Sprite, Text } from 'pixi-svelte';
	import { Button, type ButtonProps } from 'components-pixi';
	import { stateBet, stateBetDerived } from 'state-shared';

	import FootballButtonBetProvider from './FootballButtonBetProvider.svelte';
	import { getContext } from 'components-ui-pixi/src/context';
	import { SPIN_DIAMETER } from '../../game/layoutScene';
	import { uiDisplaySize } from '../../game/uiAssetSizes';
	import { AUTOPLAY_ARMED_RING, TOOLBAR_BUTTON_HOVER_ALPHA } from '../../game/uiBarTheme';
	import { isGameplayInputAllowed } from '../../game/gameplayLock.svelte';
	import { stateSpinSkip } from '../../game/spinSkip.svelte';

	type Props = Partial<Omit<ButtonProps, 'children'>> & {
		width?: number;
		height?: number;
		diameter?: number;
	};

	const props: Props = $props();
	const uiContext = getContext();
	const btnDiameter = $derived(props.width ?? props.diameter ?? props.height ?? SPIN_DIAMETER);
	const sizes = $derived({ width: btnDiameter, height: btnDiameter });
	const spinSize = $derived(uiDisplaySize('btn_spin', btnDiameter));

	const handlePress = (key: string, onpress: () => void) => {
		if (key === 'spin_disabled' || key === 'stop_disabled') return;
		const isStop = key === 'stop_default';
		if (!isGameplayInputAllowed() && !isStop) return;
		onpress();
	};

	const autoActive = $derived(stateBetDerived.hasAutoBetCounter());
	const autoPlayArmed = $derived(
		autoActive && !uiContext.stateXstateDerived.isAutoBetting(),
	);
	const autoCountText = $derived(
		autoActive
			? Number.isFinite(stateBet.autoSpinsCounter)
				? `${stateBet.autoSpinsCounter}`
				: '∞'
			: '',
	);
	const counterDiscR = $derived(btnDiameter * 0.34);
	const counterFontSize = $derived(btnDiameter * 0.28);

	const textRes = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
</script>

<FootballButtonBetProvider>
	{#snippet children({ key, onpress })}
		{@const isStopMode = key === 'stop_default' || key === 'stop_disabled'}
		{@const disabled =
			(!isStopMode && !isGameplayInputAllowed()) ||
			key === 'spin_disabled' ||
			key === 'stop_disabled'}
		{@const visuallyDisabled =
			disabled ||
			(!isStopMode &&
				(stateSpinSkip.reelsRolling ||
					stateSpinSkip.quickLandInProgress ||
					(stateSpinSkip.boardSkipUsed && stateSpinSkip.reelsRolling)))}
		<Button {...props} {sizes} onpress={() => handlePress(key, onpress)} {disabled}>
		{#snippet children({ center, hovered })}
			<Container {...center}>

				<!-- Transparent hit area so pointer events always register -->
				<Rectangle
					anchor={0.5}
					width={btnDiameter}
					height={btnDiameter}
					borderRadius={btnDiameter / 2}
					backgroundColor={0xffffff}
					backgroundAlpha={0.001}
					eventMode="static"
				/>
				{#if autoPlayArmed && !isStopMode}
					<Graphics
						eventMode="none"
						draw={(g) => {
							const r = (btnDiameter / 2) * AUTOPLAY_ARMED_RING.radiusScale;
							g.clear();
							g.circle(0, 0, r);
							g.stroke({
								width: AUTOPLAY_ARMED_RING.width,
								color: 0xffd700,
								alpha: AUTOPLAY_ARMED_RING.alpha,
							});
						}}
					/>
				{/if}
				<Sprite
					key="btn_spin"
					anchor={0.5}
					width={spinSize.width}
					height={spinSize.height}
					alpha={visuallyDisabled ? 0.45 : 1}
					tint={isStopMode ? 0xff8888 : autoPlayArmed ? 0xffe08a : 0xffffff}
					eventMode="none"
				/>
				{#if hovered && !visuallyDisabled}
					<Rectangle
						anchor={0.5}
						width={btnDiameter}
						height={btnDiameter}
						borderRadius={btnDiameter / 2}
						backgroundColor={0xffffff}
						backgroundAlpha={TOOLBAR_BUTTON_HOVER_ALPHA}
						eventMode="none"
					/>
				{/if}

				{#if autoActive}
					<Graphics
						eventMode="none"
						draw={(g) => {
							g.clear();
							g.circle(0, 0, counterDiscR);
							g.fill({ color: 0x4a4a4a, alpha: 0.92 });
						}}
					/>
					<Text
						anchor={0.5}
						text={autoCountText}
						eventMode="none"
						resolution={textRes}
						style={{
							fontFamily: 'Aileron',
							fontSize: counterFontSize,
							fontWeight: '900',
							fill: 0xffffff,
						}}
					/>
				{/if}
			</Container>
		{/snippet}
		</Button>
	{/snippet}
</FootballButtonBetProvider>
