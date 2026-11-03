<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';

	import { anchorToPivot, Container, Graphics, type Sizes } from 'pixi-svelte';
	import { MainContainer } from 'components-layout';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE, BOARD_DIMENSIONS } from '../game/constants';

	type Props = {
		children: Snippet<[{ sizes: Sizes }]>;
	};

	const props: Props = $props();

	const context = getContext();
	const BACKGROUND_RATIO = 920 / 720;
	const BACKGROUND_WIDTH = SYMBOL_SIZE * BOARD_DIMENSIONS.y;
	const BACKGROUND_SIZES = {
		width: BACKGROUND_WIDTH,
		height: BACKGROUND_WIDTH / BACKGROUND_RATIO,
	};
	const PANEL_SIZES = {
		width: SYMBOL_SIZE * BOARD_DIMENSIONS.y,
		height: SYMBOL_SIZE * BOARD_DIMENSIONS.y,
	};

	let elapsed = $state(0);
	let idle = $state(false);

	onMount(() => {
		const started = performance.now();
		let frame = 0;
		const tick = () => {
			elapsed = (performance.now() - started) / 1000;
			if (!idle && elapsed > 0.6) idle = true;
			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	});

	const draw = $derived((graphics: import('pixi.js').Graphics) => {
		graphics.clear();
		const grow = idle ? 1 : Math.min(1, elapsed / 0.6);
		const w = PANEL_SIZES.width * 0.72 * grow;
		const h = PANEL_SIZES.height * 0.46 * grow;
		graphics.roundRect(-w / 2, -h / 2, w, h, 28).fill({ color: 0x14321c, alpha: 0.88 });
		graphics.roundRect(-w / 2, -h / 2, w, h, 28).stroke({ color: 0xf0c14a, width: 8, alpha: 0.95 });
		const sway = Math.sin(elapsed * 3) * 10;
		for (let leaf = 0; leaf < 6; leaf++) {
			const x = -w / 2 + ((leaf + 0.5) / 6) * w;
			graphics.ellipse(x, -h / 2 + sway, 16, 7).fill({ color: 0x3f9a45, alpha: 0.9 });
		}
	});
</script>

<MainContainer>
	<Container
		x={context.stateGameDerived.boardLayout().x}
		y={context.stateGameDerived.boardLayout().y}
		pivot={anchorToPivot({ anchor: 0.5, sizes: BACKGROUND_SIZES })}
	>
		<Container x={PANEL_SIZES.width * 0.5} y={PANEL_SIZES.height * 0.4}>
			<Graphics {draw} />
			{@render props.children({ sizes: BACKGROUND_SIZES })}
		</Container>
	</Container>
</MainContainer>
