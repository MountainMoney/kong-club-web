<script lang="ts">
	import { onMount } from 'svelte';
	import { Container, Graphics } from 'pixi-svelte';
	import { GlowFilter } from 'pixi-filters';

	import SymbolSpine from './SymbolSpine.svelte';
	import SymbolSprite from './SymbolSprite.svelte';
	import type { SymbolState, RawSymbol } from '../game/types';
	import { SYMBOL_SIZE } from '../game/constants';
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
	const showWinFrame = $derived(
		['win', 'postWinStatic'].includes(props.state) &&
			!['ST', 'MW'].includes(props.rawSymbol.name),
	);

	const frameW = SYMBOL_SIZE * 0.92;
	const frameH = SYMBOL_SIZE * 0.92;
	let edgeAlpha = $state(0.85);
	let raf = 0;
	const frameGlow = new GlowFilter({
		distance: 14,
		outerStrength: 1.35,
		innerStrength: 0.12,
		color: 0xffd56a,
		quality: 0.3,
	});

	const drawWinFrame = $derived((g: import('pixi.js').Graphics) => {
		g.clear();
		g.roundRect(-frameW / 2, -frameH / 2, frameW, frameH, 10);
		g.stroke({ color: 0xffe08a, width: 3, alpha: edgeAlpha });
	});

	onMount(() => {
		const start = performance.now();
		const tick = () => {
			const wave = (Math.sin(((performance.now() - start) / 1000) * Math.PI * 2) + 1) / 2;
			edgeAlpha = 0.55 + wave * 0.4;
			frameGlow.outerStrength = 1.05 + wave * 0.7;
			raf = requestAnimationFrame(tick);
		};
		tick();
		return () => cancelAnimationFrame(raf);
	});
</script>

{#if isSprite && symbolInfo}
	<SymbolSprite
		{symbolInfo}
		x={props.x}
		y={props.y}
		state={props.state}
		highlight={['win', 'postWinStatic'].includes(props.state)}
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

{#if showWinFrame}
	<Container x={props.x ?? 0} y={props.y ?? 0} filters={[frameGlow]}>
		<Graphics draw={drawWinFrame} />
	</Container>
{/if}
