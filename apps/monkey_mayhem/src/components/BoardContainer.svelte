<script lang="ts">
	import type { Snippet } from 'svelte';

	import { Container } from 'pixi-svelte';

	import { getContext } from '../game/context';

	type Props = {
		children: Snippet;
		zIndex?: number;
	};

	const props: Props = $props();

	const context = getContext();
	const board = $derived(context.stateGameDerived.boardLayout());
</script>

<Container
	x={board.x}
	y={board.y}
	pivot={board.pivot}
	scale={board.scale ?? 1}
	sortableChildren={true}
	zIndex={props.zIndex}
>
	{@render props.children()}
</Container>
