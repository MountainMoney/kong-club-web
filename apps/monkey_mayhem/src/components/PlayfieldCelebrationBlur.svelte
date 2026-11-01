<script lang="ts">
	import type { Snippet } from 'svelte';
	import { BlurFilter } from 'pixi.js';
	import { Container } from 'pixi-svelte';

	import { stateWinCelebration } from '../game/winCelebrationPresentation.svelte';

	type Props = { children: Snippet };

	const props: Props = $props();

	const blurFilter = new BlurFilter({ strength: 0, quality: 4 });

	$effect(() => {
		blurFilter.strength = stateWinCelebration.blurActive ? stateWinCelebration.blurStrength : 0;
	});
</script>

<Container filters={stateWinCelebration.blurActive ? [blurFilter] : undefined} sortableChildren={true}>
	{@render props.children()}
</Container>
