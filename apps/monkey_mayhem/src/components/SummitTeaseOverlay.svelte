<script lang="ts">
	import { onMount } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { Container, Rectangle } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { zIndexes } from '../game/constants';
	import {
		SUMMIT_TEASE_OVERLAY_ALPHA,
		SUMMIT_TEASE_OVERLAY_IN_MS,
		SUMMIT_TEASE_OVERLAY_OUT_MS,
		stateSummitTease,
	} from '../game/summitTease.svelte';

	const context = getContext();
	const canvas = $derived(context.stateLayoutDerived.canvasSizes());
	const dim = new Tween(0, { duration: SUMMIT_TEASE_OVERLAY_IN_MS });
	let overlayTick = $state(0);

	$effect(() => {
		void dim.set(
			stateSummitTease.active && !stateSummitTease.hiding
				? SUMMIT_TEASE_OVERLAY_ALPHA
				: 0,
			{
				duration: stateSummitTease.active && !stateSummitTease.hiding
					? SUMMIT_TEASE_OVERLAY_IN_MS
					: SUMMIT_TEASE_OVERLAY_OUT_MS,
			},
		);
	});

	onMount(() => {
		let raf = 0;
		const tick = () => {
			if (stateSummitTease.active || dim.current > 0.01) overlayTick += 1;
			raf = requestAnimationFrame(tick);
		};
		tick();
		return () => cancelAnimationFrame(raf);
	});

	const overlayAlpha = $derived.by(() => {
		void overlayTick;
		return dim.current;
	});
</script>

{#if overlayAlpha > 0.01 || stateSummitTease.active}
	<Container zIndex={zIndexes.summitTeaseOverlay} eventMode="none">
		<Rectangle
			x={0}
			y={0}
			width={canvas.width}
			height={canvas.height}
			backgroundColor={0x000000}
			backgroundAlpha={overlayAlpha}
		/>
	</Container>
{/if}
