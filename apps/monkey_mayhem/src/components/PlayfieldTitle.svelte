<script lang="ts">
	import { DropShadowFilter } from 'pixi-filters';
	import { Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { zIndexes } from '../game/constants';
	import { hasLoadedAssetTexture } from '../game/introAssets';
	import { introLogoUniformScale } from '../game/layoutLoadingScreen';
	import { getMonkeyTitleLayout } from '../game/monkeyMayhemLayout';

	const context = getContext();
	const layout = $derived(getMonkeyTitleLayout(context.stateGameDerived.boardLayout()));
	const ready = $derived(hasLoadedAssetTexture(context.stateApp.loadedAssets, 'title_art'));
	const logoScale = $derived(introLogoUniformScale(layout.width));
	const titleShadow = new DropShadowFilter({
		color: 0x000000,
		alpha: 0.28,
		blur: 3,
		offset: { x: 2, y: 3 },
		quality: 3,
	});
</script>

{#if ready}
	<Sprite
		key="title_art"
		anchor={layout.anchor}
		x={layout.x}
		y={layout.y}
		zIndex={zIndexes.playfieldTitle}
		scale={logoScale}
		blendMode="normal"
		filters={[titleShadow]}
	/>
{/if}
