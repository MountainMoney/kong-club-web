<script lang="ts">
	import type { Snippet } from 'svelte';

	import { Container, Graphics, Text, type Sizes } from 'pixi-svelte';

	import { SYMBOL_SIZE } from '../game/constants';

	type Props = {
		children: Snippet<[{ frameSizes: Sizes }]>;
	};

	const props: Props = $props();

	const TITLE_HEIGHT = SYMBOL_SIZE * 0.28;
	const PANEL_HEIGHT = SYMBOL_SIZE * 0.72;
	const PANEL_WIDTH = PANEL_HEIGHT * 3.35;
	const PANEL_SIZES = {
		width: PANEL_WIDTH,
		height: PANEL_HEIGHT,
	};

	const PANEL_FILL = 0x1a3d28;
	const PANEL_STROKE = 0xffd54a;
	const TITLE_FILL = 0xffe082;
</script>

<Container y={-TITLE_HEIGHT * 1.05}>
	<Text
		anchor={0.5}
		text="TUMBLE WIN"
		style={{
			fontFamily: 'Fredoka',
			fontSize: TITLE_HEIGHT * 0.5,
			fontWeight: '700',
			fill: TITLE_FILL,
			stroke: { color: 0x1a2e14, width: 3 },
		}}
	/>
</Container>

<Graphics
	draw={(g) => {
		const halfW = PANEL_SIZES.width / 2;
		const halfH = PANEL_SIZES.height / 2;
		g.clear();
		g.roundRect(-halfW, -halfH, PANEL_SIZES.width, PANEL_SIZES.height, 14);
		g.fill({ color: PANEL_FILL, alpha: 0.92 });
		g.stroke({ color: PANEL_STROKE, width: 2.5, alpha: 0.75 });
	}}
/>

{@render props.children({ frameSizes: PANEL_SIZES })}
