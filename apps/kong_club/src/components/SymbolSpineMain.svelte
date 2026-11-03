<script lang="ts">
	import { SpineProvider, SpineTrack, type SpineTrackProps } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';

	import { getSymbolInfo } from '../game/utils';
	import { SYMBOL_SIZE } from '../game/constants';
	import type { BarrelArtFit } from '../game/barrelWildFit';
	import BarrelWildGuang from './BarrelWildGuang.svelte';

	type Props = {
		symbolInfo: ReturnType<typeof getSymbolInfo>;
		x?: number;
		y?: number;
		listener: SpineTrackProps['listener'];
		loop?: boolean;
	};

	const props: Props = $props();
	const isBarrel = $derived(props.symbolInfo.assetKey === 'barrelWild');
	const cellTarget = $derived(SYMBOL_SIZE * props.symbolInfo.sizeRatios.height);
	let barrelFit = $state<BarrelArtFit | null>(null);
	let barrelMeasured = $state(false);

	const fitted = $derived(isBarrel && barrelFit != null);
	const placeX = $derived((props.x ?? 0) + (fitted ? barrelFit!.x : 0));
	const placeY = $derived((props.y ?? 0) + (fitted ? barrelFit!.y : 0));
</script>

<SpineProvider
	x={placeX}
	y={placeY}
	key={props.symbolInfo.assetKey}
	height={fitted ? undefined : cellTarget}
	scale={fitted ? barrelFit!.scale : undefined}
	alpha={isBarrel && !barrelMeasured ? 0 : 1}
>
	<SpineTrack
		loop={props.loop}
		trackIndex={0}
		animationName={props.symbolInfo.animationName}
		timeScale={stateBetDerived.timeScale()}
		listener={props.listener}
	/>
	{#if isBarrel}
		<BarrelWildGuang
			target={cellTarget}
			onfit={(fit) => {
				barrelFit = fit;
				barrelMeasured = true;
			}}
		/>
	{/if}
</SpineProvider>
