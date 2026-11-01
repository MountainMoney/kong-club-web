<script lang="ts">
	import type { Snippet } from 'svelte';

	import { MainContainer } from 'components-layout';
	import { Container } from 'pixi-svelte';
	import { getContextLayout } from 'utils-layout';

	import MonkeyBottomBar from './MonkeyBottomBar.svelte';

	type Props = {
		logo: Snippet;
		replayMode?: boolean;
	};

	const props: Props = $props();
	const { stateLayoutDerived } = getContextLayout();
	const main = $derived(stateLayoutDerived.mainLayout());
</script>

<MainContainer>
	<Container x={main.width - 16} y={10}>
		{@render props.logo()}
	</Container>

	<MonkeyBottomBar
		layoutWidth={main.width}
		layoutHeight={main.height}
		replayMode={props.replayMode ?? false}
	/>
</MainContainer>
