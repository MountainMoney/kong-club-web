<script lang="ts">
	import { onMount } from 'svelte';
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';
	import { OnHotkey } from 'components-shared';
	import { Container, Text, REM } from 'pixi-svelte';

	import { stateBet } from 'state-shared';

	import { getContext } from '../game/context';
	import { ensureIntroFredokaFont } from '../game/introFont';
	import {
		LOADING_PRESS_BOTTOM_INSET,
		LOADING_PRESS_FONT_SIZE,
	} from '../game/layoutLoadingScreen';
	import { getPixiTextResolution, roundPix } from '../game/pixiTextCrisp';
	import { UI_FONT } from '../game/uiFont';

	type Props = {
		onpress: () => void;
		onfirstinteract?: () => void;
		variant?: 'default' | 'intro';
		pressBottomInset?: number;
		pressFontSize?: number;
		pressColor?: number;
		disabled?: boolean;
	};

	const props: Props = $props();
	const context = getContext();

	const main = $derived(context.stateLayoutDerived.mainLayout());
	const isIntro = $derived(props.variant === 'intro');
	const bottomInset = $derived(
		isIntro ? (props.pressBottomInset ?? LOADING_PRESS_BOTTOM_INSET) : 24,
	);
	const fontSize = $derived(
		isIntro ? (props.pressFontSize ?? LOADING_PRESS_FONT_SIZE) : REM * 1.2,
	);

	let introFontReady = $state(false);
	let textAlpha = $state(1);
	let pulseRaf = 0;
	let pointerArmed = false;

	$effect(() => {
		if (!isIntro) {
			introFontReady = false;
			return;
		}
		if (introFontReady) return;
		void ensureIntroFredokaFont().then(() => {
			introFontReady = true;
		});
	});

	onMount(() => {
		const start = performance.now();
		const tick = () => {
			const t = (performance.now() - start) / 1000;
			const wave = (Math.sin(t * Math.PI * 1.2) + 1) / 2;
			textAlpha = isIntro ? 0.88 + wave * 0.12 : 0.72 + wave * 0.28;
			pulseRaf = requestAnimationFrame(tick);
		};
		tick();
		return () => cancelAnimationFrame(pulseRaf);
	});

	const textRes = getPixiTextResolution();
	const showText = $derived(!isIntro || introFontReady);

	const onHotkeyPress = () => {
		if (props.disabled) return;
		if (isIntro && stateBet.isSpaceHold) return;
		props.onpress();
	};

	const onPointerDown = () => {
		pointerArmed = !props.disabled;
		if (!pointerArmed) return;
		if (!isIntro) return;
		props.onfirstinteract?.();
	};

	const onPointerTap = () => {
		const canUsePointer = pointerArmed && !props.disabled;
		pointerArmed = false;
		if (!canUsePointer) return;
		if (isIntro && stateBet.isSpaceHold) return;
		props.onpress();
	};
</script>

<MainContainer alignVertical="bottom">
	{#if showText}
		<Container
			x={roundPix(main.width * 0.5)}
			y={roundPix(main.height - bottomInset)}
			alpha={textAlpha}
			zIndex={10}
			eventMode="none"
		>
			<Text
				eventMode="none"
				anchor={{ x: 0.5, y: 1 }}
				x={0}
				y={0}
				text="PRESS TO CONTINUE"
				resolution={textRes}
				style={{
					fontFamily: isIntro ? 'Fredoka' : UI_FONT,
					fontSize,
					fontWeight: '700',
					fill: props.pressColor ?? 0xffffff,
					dropShadow: {
						alpha: 1,
						angle: Math.PI / 4,
						blur: 3,
						color: 0x000000,
						distance: 3,
					},
				}}
			/>
		</Container>
	{/if}
</MainContainer>
<OnHotkey hotkey="Space" onpress={onHotkeyPress} />
<CanvasSizeRectangle
	eventMode="static"
	cursor={props.disabled ? 'default' : 'pointer'}
	backgroundColor={0xffffff}
	backgroundAlpha={0.001}
	onpointerdown={onPointerDown}
	onpointertap={onPointerTap}
/>
