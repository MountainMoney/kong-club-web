<script lang="ts">
	/** KC background darkened under the intro cinematic (fades with GG's scene ease on exit). */
	import { Rectangle } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { stateIntroCinematic } from '../game/introCinematicState.svelte';

	const context = getContext();
	const canvas = $derived(context.stateLayoutDerived.canvasSizes());
</script>

{#if stateIntroCinematic.dim > 0.001}
	<Rectangle
		x={-canvas.width}
		y={-canvas.height}
		width={canvas.width * 3}
		height={canvas.height * 3}
		backgroundColor={0x000000}
		alpha={stateIntroCinematic.dim}
		zIndex={0}
		eventMode="none"
	/>
{/if}
