<script lang="ts">
	import Symbol from './Symbol.svelte';
	import SymbolWrap from './SymbolWrap.svelte';
	import TumblePoof from './TumblePoof.svelte';
	import { getSymbolX, getSymbolInfo } from '../game/utils';
	import type { TumbleSymbol } from '../game/stateGame.svelte';

	type Props = {
		reelIndex: number;
		tumbleSymbol: TumbleSymbol;
	};

	const props: Props = $props();
	const symbolY = $derived(props.tumbleSymbol.symbolY.current);
	const isPoofing = $derived(props.tumbleSymbol.symbolState === 'explosion');
	const symbolInfo = $derived(
		getSymbolInfo({
			rawSymbol: props.tumbleSymbol.rawSymbol,
			state: props.tumbleSymbol.symbolState,
		}),
	);
</script>

<SymbolWrap
	x={getSymbolX(props.reelIndex)}
	y={symbolY}
	scaleX={props.tumbleSymbol.symbolScaleX.current}
	scaleY={props.tumbleSymbol.symbolScaleY.current}
	animating={isPoofing || symbolInfo.type === 'spine'}
	allowAboveGrid
>
	{#if isPoofing}
		<TumblePoof oncomplete={props.tumbleSymbol.oncomplete} />
	{:else}
		<Symbol
			state={props.tumbleSymbol.symbolState}
			rawSymbol={props.tumbleSymbol.rawSymbol}
			oncomplete={props.tumbleSymbol.oncomplete}
		/>
	{/if}
</SymbolWrap>
