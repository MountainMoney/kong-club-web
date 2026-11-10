<script lang="ts">
	import type { Snippet } from 'svelte';

	import { Container } from 'pixi-svelte';
	import { getContextBoard } from 'components-shared';

	import { SYMBOL_SIZE, BOARD_DIMENSIONS } from '../game/constants';

	type Props = {
		x: number;
		y: number;
		animating: boolean;
		/** Tumble refill symbols spawn above the grid — render while falling in. */
		allowAboveGrid?: boolean;
		/** Visible-row index (0–4). Clip to this cell so other faces never pass through it. */
		homeRow?: number;
		scale?: number;
		scaleX?: number;
		scaleY?: number;
		rotation?: number;
		alpha?: number;
		/** Multiply tint (Pixi Container tint, inherited by children). Default white = no change. */
		tint?: number;
		children: Snippet;
	};

	const props: Props = $props();
	const boardContext = getContextBoard();
	const show = $derived(
		(boardContext.animate && props.animating) || (!boardContext.animate && !props.animating),
	);
	/** Approach from just above the home cell; bounce may dip slightly below it. */
	const APPROACH = SYMBOL_SIZE * 1.15;
	const BOUNCE_BLEED = SYMBOL_SIZE * 0.4;
	const top = $derived(
		props.homeRow !== undefined
			? props.homeRow * SYMBOL_SIZE - APPROACH
			: props.allowAboveGrid
				? -SYMBOL_SIZE * 5
				: -SYMBOL_SIZE * 0.5,
	);
	const bottom = $derived(
		props.homeRow !== undefined
			? (props.homeRow + 1) * SYMBOL_SIZE + BOUNCE_BLEED
			: SYMBOL_SIZE * BOARD_DIMENSIONS.y,
	);
	const inFrame = $derived(props.y >= top && props.y < bottom);
</script>

{#if show && inFrame}
	<Container
		x={props.x}
		y={props.y}
		rotation={props.rotation ?? 0}
		scale={{ x: props.scaleX ?? props.scale ?? 1, y: props.scaleY ?? props.scale ?? 1 }}
		alpha={props.alpha ?? 1}
		tint={props.tint ?? 0xffffff}
	>
		{@render props.children()}
	</Container>
{/if}
