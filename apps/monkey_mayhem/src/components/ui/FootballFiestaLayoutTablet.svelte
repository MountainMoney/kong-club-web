<script lang="ts">
	import type { Snippet } from 'svelte';

	import { MainContainer } from 'components-layout';
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
	<FootballBottomBar
		layoutWidth={main.width}
		layoutHeight={main.height}
		replayMode={props.replayMode ?? false}
	/>
</MainContainer>
