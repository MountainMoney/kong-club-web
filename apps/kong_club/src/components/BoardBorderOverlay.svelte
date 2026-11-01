<script lang="ts">
	import { ColorMatrixFilter } from 'pixi.js';
	import { Container, Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { zIndexes } from '../game/constants';
	import { getMonkeyUnifiedFrameLayout } from '../game/kongClubLayout';

	const context = getContext();

	const board = $derived(context.stateGameDerived.boardLayout());
	const frameLayout = $derived(getMonkeyUnifiedFrameLayout(board));
	const frameSharpen = new ColorMatrixFilter();
	frameSharpen.contrast(0.14, false);
</script>

<!--
  Brown U-frame + vines (border.png). Mount after symbols in Game.svelte.
  Stack: wood → symbols → this border → title.
-->
<Container x={frameLayout.x} y={frameLayout.y} zIndex={zIndexes.boardBorder}>
	<Sprite
		key="reelBorder"
		anchor={frameLayout.anchor}
		width={frameLayout.width}
		height={frameLayout.height}
		filters={[frameSharpen]}
	/>
</Container>
