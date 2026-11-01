<script lang="ts">
	import { Rectangle } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { BOARD_MASK_BOTTOM_TRIM, BOARD_MASK_TOP_BLEED } from '../game/constants';

	type Props = { debug?: boolean; enabled?: boolean };

	const props: Props = $props();
	const enabled = $derived(props.enabled !== false);
	const context = getContext();
	const layout = $derived(context.stateGameDerived.boardLayout());
	/** Clip at the wood rail. Refill still falls from above and emerges as it enters. */
	const maskY = $derived(-BOARD_MASK_TOP_BLEED);
	const maskHeight = $derived(layout.height - BOARD_MASK_BOTTOM_TRIM + BOARD_MASK_TOP_BLEED);
</script>

{#if props.debug}
	<Rectangle
		alpha={0.5}
		backgroundColor={0xffffff}
		x={0}
		y={maskY}
		width={layout.width}
		height={maskHeight}
	/>
{/if}

<Rectangle
	isMask={enabled}
	alpha={enabled ? 1 : 0}
	backgroundAlpha={enabled ? 1 : 0}
	x={0}
	y={maskY}
	width={layout.width}
	height={maskHeight}
/>
