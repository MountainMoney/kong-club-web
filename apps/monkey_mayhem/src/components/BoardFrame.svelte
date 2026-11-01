<script lang="ts" module>
	export type EmitterEventBoardFrame =
		| { type: 'boardFrameGlowShow' }
		| { type: 'boardFrameGlowHide' };
</script>

<script lang="ts">
	import { ColorMatrixFilter } from 'pixi.js';
	import { Container, Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { zIndexes } from '../game/constants';
	import { getMonkeyUnifiedFrameLayout } from '../game/monkeyMayhemLayout';

	const context = getContext();

	const board = $derived(context.stateGameDerived.boardLayout());
	const frameLayout = $derived(getMonkeyUnifiedFrameLayout(board));
	const frameSharpen = new ColorMatrixFilter();
	frameSharpen.contrast(0.14, false);
</script>

<!-- Wood fill only — behind symbols. -->
<Container x={frameLayout.x} y={frameLayout.y} zIndex={zIndexes.boardBackground}>
	<Sprite
		key="reelBoard"
		anchor={frameLayout.anchor}
		width={frameLayout.width}
		height={frameLayout.height}
		filters={[frameSharpen]}
	/>
</Container>
