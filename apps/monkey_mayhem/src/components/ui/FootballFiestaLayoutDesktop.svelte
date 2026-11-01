<script lang="ts">
	import type { Snippet } from 'svelte';

	import { MainContainer } from 'components-layout';
	import { Container } from 'pixi-svelte';
	import { getContextLayout } from 'utils-layout';

	import FootballBottomBar from './FootballBottomBar.svelte';

	type Props = {
		logo: Snippet;
		replayMode?: boolean;
	};

	const props: Props = $props();
	const { stateLayoutDerived } = getContextLayout();
	const main = $derived(stateLayoutDerived.mainLayout());
</script>

<MainContainer>
	<Container x={main.width - 20} y={16}>
		{@render props.logo()}
	</Container>

	<FootballBottomBar
		layoutWidth={main.width}
		layoutHeight={main.height}
		replayMode={props.replayMode ?? false}
	/>
</MainContainer>
