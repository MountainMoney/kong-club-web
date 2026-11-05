<script lang="ts">
	import SymbolSpine from './SymbolSpine.svelte';
	import SymbolSprite from './SymbolSprite.svelte';
	import type { SymbolState, RawSymbol } from '../game/types';
	import { getSymbolInfo } from '../game/utils';
	import { getContext } from '../game/context';

	type Props = {
		x?: number;
		y?: number;
		state: SymbolState;
		rawSymbol: RawSymbol;
		oncomplete?: () => void;
		loop?: boolean;
	};

	const props: Props = $props();
	const context = getContext();
	const symbolInfo = $derived(getSymbolInfo({ rawSymbol: props.rawSymbol, state: props.state }));
	const isSprite = $derived(symbolInfo?.type === 'sprite');
	const spineLoops = $derived(Boolean(symbolInfo && 'loop' in symbolInfo && symbolInfo.loop));
	const coinSpine = $derived(symbolInfo?.type === 'spine' && symbolInfo.assetKey === 'coinMetal');

	// Looping spines (barrel) and one-shot coins must not hold the win/land handshake.
	// The coin clip already finished on the static mount, so win/land resolves immediately.
	$effect(() => {
		const state = props.state;
		const coinHandshake = coinSpine && (state === 'win' || state === 'land');
		if (!spineLoops && !coinHandshake) return;
		queueMicrotask(() => props.oncomplete?.());
	});
</script>

{#if isSprite && symbolInfo}
	<SymbolSprite
		{symbolInfo}
		x={props.x}
		y={props.y}
		state={props.state}
		oncomplete={props.oncomplete}
	/>
{:else if symbolInfo}
	<SymbolSpine
		loop={'loop' in symbolInfo ? symbolInfo.loop : props.loop}
		{symbolInfo}
		x={props.x}
		y={props.y}
		listener={{
			complete: props.oncomplete,
			event: (_, event) => {
				if (event.data?.name === 'wildExplode') {
					context.eventEmitter?.broadcast({ type: 'soundOnce', name: 'sfx_wild_explode' });
				}
			},
		}}
	/>
{/if}
