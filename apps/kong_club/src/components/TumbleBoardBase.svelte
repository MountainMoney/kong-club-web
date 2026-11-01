<script lang="ts">
	import TumbleSymbol from './TumbleSymbol.svelte';
	import type { TumbleSymbol as TumbleSymbolState } from '../game/stateGame.svelte';

	type TumbleColumnState = {
		topPad: TumbleSymbolState;
		bottomPad: TumbleSymbolState;
		game: TumbleSymbolState[];
		adding: TumbleSymbolState[];
	};

	type Props = {
		tumbleColumns: TumbleColumnState[];
	};

	const props: Props = $props();
</script>

{#each props.tumbleColumns as column, reelIndex (reelIndex)}
	{#each column.adding as tumbleSymbol (tumbleSymbol)}
		<TumbleSymbol {reelIndex} {tumbleSymbol} />
	{/each}
	{#each column.game as tumbleSymbol (tumbleSymbol)}
		<TumbleSymbol {reelIndex} {tumbleSymbol} />
	{/each}
	<!-- Pads stay in state for settle math but are never drawn (they sat on the wood rails). -->
{/each}
