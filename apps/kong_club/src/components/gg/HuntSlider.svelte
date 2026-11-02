<script lang="ts">
	import { untrack } from 'svelte';
	import { Container, Graphics, Rectangle } from 'pixi-svelte';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

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

	const shown = new Tween(
		untrack(() => level),
		{ duration: 150, easing: cubicOut },
	);
	$effect(() => {
		shown.set(level);
	});

	const pitch = $derived((width - seg.inset * 2) / levels);
	const zone = $derived(width / levels);
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
				.roundRect(seg.inset, seg.inset, shown.current * pitch, seg.height, seg.radius)
				.fill({ color: BONUS_BUY_COLOR.text, alpha: seg.fillAlpha });
			graphics
				.roundRect(
					seg.inset + shown.current * pitch - S.thumb.size / 2,
					(S.height - S.thumb.size) / 2,
					S.thumb.size,
					S.thumb.size,
					S.thumb.radius,
				)
				.fill(BONUS_BUY_COLOR.text);
		}}
	/>
	<!-- One hit zone per level: press or drag across them to pick one. -->
	{#each Array.from({ length: levels }, (__, index) => index) as index (index)}
		<Rectangle
			x={index * zone}
			y={-S.hit}
			width={zone}
			height={S.height + S.hit * 2}
			backgroundColor={0x000000}
			backgroundAlpha={0.001}
			eventMode="static"
			cursor="pointer"
			onpointerdown={() => onslide(index + 1)}
			onpointerover={(event) => event.buttons & 1 && onslide(index + 1)}
		/>
	{/each}
</Container>
