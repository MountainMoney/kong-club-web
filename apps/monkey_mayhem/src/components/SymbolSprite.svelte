<script lang="ts">
	import { onMount } from 'svelte';
	import { DropShadowFilter, GlowFilter } from 'pixi-filters';
	import { Sprite } from 'pixi-svelte';

	import { getSymbolInfo } from '../game/utils';
	import { getSymbolSpriteLayout } from '../game/symbolSpriteLayout';
	import type { SymbolState } from '../game/types';

	type Props = {
		x?: number;
		y?: number;
		state?: SymbolState;
		symbolInfo: ReturnType<typeof getSymbolInfo>;
		highlight?: boolean;
		oncomplete?: () => void;
	};

	const props: Props = $props();

	const layout = $derived(
		getSymbolSpriteLayout(props.symbolInfo.assetKey, props.symbolInfo.sizeRatios),
	);

	const dropShadow = new DropShadowFilter({
		color: 0x000000,
		alpha: 0.21,
		blur: 2,
		offset: { x: 3, y: 4 },
		quality: 3,
	});

	const winGlow = new GlowFilter({
		distance: 16,
		outerStrength: 1.4,
		innerStrength: 0.2,
		color: 0xffd56a,
		quality: 0.3,
	});

	const useDropShadow = $derived(
		props.symbolInfo.assetKey !== 'ST' &&
			props.symbolInfo.assetKey !== 'CB' &&
			props.symbolInfo.assetKey !== 'CS' &&
			props.symbolInfo.assetKey !== 'CG',
	);
	/** Same filter list every frame — swapping arrays recompiles DropShadow and blinks black. */
	const filters = [dropShadow, winGlow];
	winGlow.outerStrength = 0;
	winGlow.innerStrength = 0;

	let glowRaf = 0;

	// Defer so parent handlers can assign oncomplete before the callback runs.
	// land/win/static share the same sprite info object — depend on state explicitly.
	$effect(() => {
		props.state;
		props.symbolInfo.assetKey;
		queueMicrotask(() => props.oncomplete?.());
	});

	$effect(() => {
		dropShadow.alpha = useDropShadow ? 0.21 : 0;
	});

	$effect(() => {
		cancelAnimationFrame(glowRaf);
		if (!props.highlight) {
			winGlow.outerStrength = 0;
			winGlow.innerStrength = 0;
			return;
		}
		winGlow.innerStrength = 0.2;
		const start = performance.now();
		const tick = () => {
			const t = (performance.now() - start) / 1000;
			winGlow.outerStrength = 1.55 + Math.sin(t * Math.PI * 1.8) * 0.45;
			glowRaf = requestAnimationFrame(tick);
		};
		tick();
	});

	onMount(() => () => cancelAnimationFrame(glowRaf));
</script>

<Sprite
	x={props.x}
	y={props.y}
	anchor={layout.anchor}
	key={props.symbolInfo.assetKey}
	width={layout.width}
	height={layout.height}
	filters={filters}
/>
