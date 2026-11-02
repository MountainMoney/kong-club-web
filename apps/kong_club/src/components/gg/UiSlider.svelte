<script lang="ts">
	import type { Container as PixiContainer, FederatedPointerEvent } from 'pixi.js';
	import { Container, Graphics, Rectangle } from 'pixi-svelte';

	import { UI_POPUP } from '../../game/ggUi/constants';

	// Figma: 30:1340: a track, filled up to a square thumb.
	const {
		x,
		y,
		value,
		onchange,
	}: { x: number; y: number; value: number; onchange: (value: number) => void } = $props();

	const S = UI_POPUP.slider;
	const inner = { width: S.width - S.inset * 2, height: S.height - S.inset * 2 };
	const round = inner.height / 2;
	const travel = inner.width - S.thumb;

	const centre = $derived(S.inset + S.thumb / 2 + value * travel);

	let dragging = false;
	const slide = (event: FederatedPointerEvent) => {
		const at = event.getLocalPosition(event.currentTarget as PixiContainer).x;
		onchange(Math.min(1, Math.max(0, (at - S.inset - S.thumb / 2) / travel)));
	};
	const drop = () => (dragging = false);
</script>

<Container
	{x}
	{y}
	eventMode="static"
	cursor="pointer"
	onpointerdown={(event) => {
		dragging = true;
		slide(event);
	}}
	onglobalpointermove={(event) => {
		if (dragging) slide(event);
	}}
	onpointerup={drop}
	onpointerupoutside={drop}
>
	<Rectangle
		y={-S.hit}
		width={S.width}
		height={S.height + S.hit * 2}
		backgroundColor={0x000000}
		backgroundAlpha={0.001}
	/>
	<Graphics
		draw={(graphics) => {
			graphics
				.roundRect(0, 0, S.width, S.height, S.radius)
				.fill({ color: 0xffffff, alpha: S.trackAlpha });
			// The two halves meet under the thumb.
			graphics
				.roundRect(centre, S.inset, S.inset + inner.width - centre, inner.height, round)
				.fill({ color: 0x000000, alpha: S.restAlpha });
			if (value > 0) {
				graphics
					.roundRect(S.inset, S.inset, centre - S.inset, inner.height, round)
					.fill({ color: 0xffffff, alpha: S.fillAlpha });
			}
			graphics
				.roundRect(centre - S.thumb / 2, (S.height - S.thumb) / 2, S.thumb, S.thumb, S.thumbRadius)
				.fill(0xffffff);
		}}
	/>
</Container>
