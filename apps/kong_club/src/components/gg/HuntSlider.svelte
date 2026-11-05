<script lang="ts">
	import type { Container as PixiContainer, FederatedPointerEvent } from 'pixi.js';
	import { Container, Graphics, Rectangle } from 'pixi-svelte';

	import { BONUS_BUY, BONUS_BUY_COLOR } from '../../game/ggUi/constants';

	// Figma: Frame 2147258648 (30:634): a track, one segment per level, filled up to the thumb.
	const {
		x,
		y,
		width,
		level,
		levels,
		onslide,
	}: {
		x: number;
		y: number;
		width: number;
		level: number;
		levels: number;
		onslide: (level: number) => void;
	} = $props();

	const S = BONUS_BUY.slider;
	const seg = S.segment;

	const pitch = $derived((width - seg.inset * 2) / levels);
	const zone = $derived(width / levels);
	const hitHeight = S.height + S.hit * 2;

	const levelAt = (localX: number) => {
		const index = Math.min(levels - 1, Math.max(0, Math.floor(localX / zone)));
		return index + 1;
	};

	let dragging = false;
	const pick = (event: FederatedPointerEvent) => {
		const localX = event.getLocalPosition(event.currentTarget as PixiContainer).x;
		onslide(levelAt(localX));
	};
</script>

<Container {x} {y}>
	<Rectangle
		{width}
		height={S.height}
		borderRadius={S.height / 2}
		backgroundColor={BONUS_BUY_COLOR.border}
		backgroundAlpha={S.alpha}
	/>
	<Graphics
		draw={(graphics) => {
			for (let index = level; index < levels; index += 1) {
				const left = seg.inset + index * pitch;
				const right = left + pitch - (index === levels - 1 ? 0 : seg.gap);
				const r = index === levels - 1 ? seg.radius : 0;
				graphics.roundShape(
					[
						{ x: left, y: seg.inset, radius: 0 },
						{ x: right, y: seg.inset, radius: r },
						{ x: right, y: seg.inset + seg.height, radius: r },
						{ x: left, y: seg.inset + seg.height, radius: 0 },
					],
					0,
				);
			}
			graphics.fill({ color: BONUS_BUY_COLOR.ink, alpha: seg.alpha });
			graphics
				.roundRect(seg.inset, seg.inset, level * pitch, seg.height, seg.radius)
				.fill({ color: BONUS_BUY_COLOR.text, alpha: seg.fillAlpha });
			graphics
				.roundRect(
					seg.inset + level * pitch - S.thumb.size / 2,
					(S.height - S.thumb.size) / 2,
					S.thumb.size,
					S.thumb.size,
					S.thumb.radius,
				)
				.fill(BONUS_BUY_COLOR.text);
		}}
	/>
	<!-- One track. A press or a drag snaps to the segment under the pointer. -->
	<Rectangle
		y={-S.hit}
		{width}
		height={hitHeight}
		backgroundColor={0x000000}
		backgroundAlpha={0.001}
		eventMode="static"
		cursor="pointer"
		onpointerdown={(event) => {
			dragging = true;
			pick(event);
		}}
		onglobalpointermove={(event) => {
			if (!dragging) return;
			pick(event);
		}}
		onpointerup={() => (dragging = false)}
		onpointerupoutside={() => (dragging = false)}
	/>
</Container>
