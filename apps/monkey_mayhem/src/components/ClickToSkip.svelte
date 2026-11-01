<script lang="ts">
	import { Container, Rectangle } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { zIndexes } from '../game/constants';
	import { getSummitSkipCanvasHeight } from '../game/summitToolbarLayout';
	import { stateGame } from '../game/stateGame.svelte';
	import {
		canRequestBoardSpinSkip,
		requestSpinSkip,
	} from '../game/spinSkip.svelte';

	/**
	 * Explicit tap anywhere (release) to skip — not pointer-down / hold.
	 * stateSpinSkip.active is true for the full duration of bet playback.
	 */
	const context = getContext();
	const canSkip = $derived(canRequestBoardSpinSkip());
	const canvas = $derived(context.stateLayoutDerived.canvasSizes());
	const skipHeight = $derived(
		getSummitSkipCanvasHeight(
			canvas.width,
			canvas.height,
			stateGame.gameType === 'freegame',
			context.stateLayoutDerived.layoutType() === 'portrait',
		),
	);

	const SKIP_POINTER_THROTTLE_MS = 80;
	/** Holds longer than this are not treated as skip taps (avoids skip on mouse-up after hold). */
	const MAX_SKIP_TAP_MS = 400;
	let lastPointerSkipAt = 0;
	let pointerDownAt = 0;

	const tryPointerSkip = (fn: () => void) => {
		if (!canSkip) return;
		const now = performance.now();
		if (now - lastPointerSkipAt < SKIP_POINTER_THROTTLE_MS) return;
		lastPointerSkipAt = now;
		fn();
	};

	const onPointerDown = () => {
		pointerDownAt = performance.now();
	};

	const onpress = () => {
		const heldMs = performance.now() - pointerDownAt;
		if (heldMs > MAX_SKIP_TAP_MS) return;
		tryPointerSkip(() => requestSpinSkip());
	};
</script>

{#if canSkip}
	<!-- Invisible playfield hit target only. Do not cover the toolbar controls. -->
	<Container zIndex={zIndexes.ui - 0.5}>
		<Rectangle
			x={0}
			y={0}
			width={canvas.width}
			height={skipHeight}
			backgroundColor={0xffffff}
			backgroundAlpha={0.001}
			eventMode="static"
			cursor="pointer"
			onpointerdown={onPointerDown}
			onpointerup={onpress}
		/>
	</Container>
{/if}
