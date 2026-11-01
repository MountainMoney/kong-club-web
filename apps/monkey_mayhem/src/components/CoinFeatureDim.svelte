<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { Container, Graphics } from 'pixi-svelte';

	import BoardContainer from './BoardContainer.svelte';
	import { BOARD_DIMENSIONS, SYMBOL_SIZE, zIndexes } from '../game/constants';
	import { getSymbolX } from '../game/utils';
	import {
		isCoinFeatureLit,
		PRE_COIN_SHRINK_MS,
		stateCoinFeatureCover,
	} from '../game/coinFeatureCover.svelte';

	/** Full cell — cover the wood divider in the dimmed region too. */
	const HALF = SYMBOL_SIZE / 2;
	const DIM_ALPHA = 0.35;
	const FADE_MS = PRE_COIN_SHRINK_MS;

	const dimAlpha = new Tween(0, { duration: FADE_MS });

	$effect(() => {
		if (stateCoinFeatureCover.heldDismissActive) {
			void dimAlpha.set(0, { duration: 0 });
			return;
		}
		void dimAlpha.set(stateCoinFeatureCover.dimActive ? DIM_ALPHA : 0);
	});

	const drawDim = (g: import('pixi.js').Graphics, _litStamp: number) => {
		g.clear();
		for (let reel = 0; reel < BOARD_DIMENSIONS.x; reel += 1) {
			for (let row = 0; row < BOARD_DIMENSIONS.y; row += 1) {
				if (isCoinFeatureLit(reel, row)) continue;
				const x = getSymbolX(reel);
				const y = (row + 0.5) * SYMBOL_SIZE;
				g.rect(x - HALF, y - HALF, SYMBOL_SIZE, SYMBOL_SIZE);
				g.fill({ color: 0x000000, alpha: 1 });
			}
		}
	};
</script>

{#if dimAlpha.current > 0.01 || stateCoinFeatureCover.dimActive}
	<BoardContainer zIndex={zIndexes.paylineWin - 1}>
		<Container alpha={dimAlpha.current}>
			<Graphics draw={(g) => drawDim(g, stateCoinFeatureCover.litKeys.size)} />
		</Container>
	</BoardContainer>
{/if}
