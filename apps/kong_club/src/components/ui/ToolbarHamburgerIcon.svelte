<script lang="ts">
	import { Graphics } from 'pixi-svelte';

	import {
		HAMBURGER_LINE_GAP,
		HAMBURGER_LINE_H,
		HAMBURGER_LINE_RADIUS,
		HAMBURGER_LINE_W,
	} from '../../game/layoutScene';

	type Props = {
		scale: number;
		lineColor?: number;
	};

	const props: Props = $props();
	const lineColor = $derived(props.lineColor ?? 0xffffff);

	const w = $derived(HAMBURGER_LINE_W * props.scale);
	const lineH = $derived(HAMBURGER_LINE_H * props.scale);
	const gap = $derived(HAMBURGER_LINE_GAP * props.scale);
	const radius = $derived(HAMBURGER_LINE_RADIUS * props.scale);
	const drawH = $derived(lineH * 3 + gap * 2);
</script>

<Graphics
	eventMode="none"
	draw={(g) => {
		g.clear();
		g.setFillStyle({ color: lineColor });
		const x0 = -w / 2;
		const y0 = -drawH / 2;
		for (let i = 0; i < 3; i++) {
			const y = y0 + i * (lineH + gap);
			g.roundRect(x0, y, w, lineH, radius);
			g.fill();
		}
	}}
/>
