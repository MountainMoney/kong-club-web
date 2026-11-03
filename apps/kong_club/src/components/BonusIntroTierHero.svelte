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
	const tokenSize = $derived(Math.round(displaySize * 0.28));
	const tokenCount = $derived(props.tier === 2 ? 4 : 3);
	const tokenKey = $derived(props.tier === 3 ? 'CG' : 'ST');
	const tokenGap = $derived(Math.round(tokenSize * 1.12));
	/** No mascot in the hero, so the token row sits centred in the hero area. */
	const tokenRowY = 0;

	const tokenReady = $derived(hasLoadedAssetTexture(props.loadedAssets, tokenKey));

	const tokenXs = $derived(
		Array.from({ length: tokenCount }, (_, i) =>
			Math.round((i - (tokenCount - 1) / 2) * tokenGap),
		),
	);
</script>

<Container x={props.x ?? 0} y={props.y}>
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
