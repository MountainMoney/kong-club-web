<script lang="ts">
	import { Container, Sprite } from 'pixi-svelte';

	import type { MonkeyBonusTier } from '../game/bonusIntroContent';
	import { hasLoadedAssetTexture } from '../game/introAssets';

	type Props = {
		tier: MonkeyBonusTier;
		x?: number;
		y: number;
		displaySize?: number;
		loadedAssets: Record<string, unknown>;
	};

	const props: Props = $props();

	const displaySize = $derived(props.displaySize ?? 240);
	const mascotSize = $derived(Math.round(displaySize * 0.68));
	const tokenSize = $derived(Math.round(displaySize * 0.28));
	const tokenCount = $derived(props.tier === 2 ? 4 : 3);
	const tokenKey = $derived(props.tier === 3 ? 'CG' : 'ST');
	const tokenGap = $derived(Math.round(tokenSize * 1.12));
	const groupH = $derived(mascotSize + Math.round(tokenSize * 0.72));
	const mascotY = $derived(Math.round(-groupH * 0.5 + mascotSize * 0.5));
	const tokenRowY = $derived(Math.round(groupH * 0.5 - tokenSize * 0.5));

	const mascotReady = $derived(hasLoadedAssetTexture(props.loadedAssets, 'monkeyMascot'));
	const tokenReady = $derived(hasLoadedAssetTexture(props.loadedAssets, tokenKey));

	const tokenXs = $derived(
		Array.from({ length: tokenCount }, (_, i) =>
			Math.round((i - (tokenCount - 1) / 2) * tokenGap),
		),
	);
</script>

<Container x={props.x ?? 0} y={props.y}>
	{#if mascotReady}
		<Sprite
			key="monkeyMascot"
			anchor={0.5}
			x={0}
			y={mascotY}
			width={mascotSize}
			height={mascotSize}
		/>
	{/if}
	{#if tokenReady}
		{#each tokenXs as tx, i (i)}
			<Sprite
				key={tokenKey}
				anchor={0.5}
				x={tx}
				y={tokenRowY}
				width={tokenSize}
				height={tokenSize}
			/>
		{/each}
	{/if}
</Container>
