<script lang="ts">
	import { Graphics } from 'pixi-svelte';

	import { TOOLBAR_MENU_ICON_SIZE } from '../../game/toolbarMenuTheme';

	type Props = {
		kind: 'volume' | 'music' | 'info';
		scale: number;
		color?: number;
	};

	const props: Props = $props();
	const size = $derived(Math.round(TOOLBAR_MENU_ICON_SIZE * props.scale));
	const color = $derived(props.color ?? 0xffffff);
	const strokeW = $derived(Math.max(2, Math.round(1.5 * props.scale)));
</script>

<!-- Icons draw in a fixed size×size box (0,0)–(size,size) so every row aligns the slot. -->
<Graphics
	eventMode="none"
	draw={(g) => {
		const s = size;
		const cx = Math.round(s * 0.5);
		const cy = Math.round(s * 0.5);
		const ringR = s * 0.46;

		g.clear();
		g.setStrokeStyle({ width: strokeW, color, cap: 'round', join: 'round' });
		g.setFillStyle({ color });

		g.circle(cx, cy, ringR);
		g.stroke();

		if (props.kind === 'info') {
			const dotR = Math.max(1, Math.round(s * 0.055));
			const dotY = Math.round(cy - s * 0.17);
			g.circle(cx, dotY, dotR);
			g.fill();

			const stemTop = dotY + dotR * 2.2;
			const stemBot = cy + s * 0.2;
			g.moveTo(cx, stemTop);
			g.lineTo(cx, stemBot);
			g.stroke();
			return;
		}

		if (props.kind === 'volume') {
			const bodyW = s * 0.28;
			const bodyH = s * 0.5;
			const tipX = cx + bodyW * 0.55;
			const baseX = cx - bodyW * 0.85;
			const topY = cy - bodyH / 2;
			const botY = cy + bodyH / 2;

			g.moveTo(baseX + bodyW, topY);
			g.lineTo(tipX, topY - bodyH * 0.32);
			g.lineTo(tipX, botY + bodyH * 0.32);
			g.lineTo(baseX + bodyW, botY);
			g.lineTo(baseX, botY);
			g.lineTo(baseX, topY);
			g.closePath();
			g.fill();

			const waveX = tipX + bodyW * 0.35;
			g.moveTo(waveX, cy - s * 0.14);
			g.quadraticCurveTo(waveX + s * 0.18, cy, waveX, cy + s * 0.14);
			g.stroke();

			g.moveTo(waveX + s * 0.1, cy - s * 0.22);
			g.quadraticCurveTo(waveX + s * 0.32, cy, waveX + s * 0.1, cy + s * 0.22);
			g.stroke();
		} else {
			const headW = s * 0.22;
			const headH = s * 0.17;
			const headCx = cx - s * 0.1;
			const headCy = cy + s * 0.12;
			const stemX = headCx + headW * 0.38;
			const stemTop = cy - s * 0.32;

			g.ellipse(headCx, headCy, headW / 2, headH / 2);
			g.fill();

			g.moveTo(stemX, headCy - headH * 0.4);
			g.lineTo(stemX, stemTop);
			g.stroke();

			const flagEndX = stemX + s * 0.2;
			const flagEndY = stemTop + s * 0.3;
			g.moveTo(stemX, stemTop);
			g.bezierCurveTo(
				stemX + s * 0.14,
				stemTop + s * 0.04,
				flagEndX,
				stemTop + s * 0.12,
				flagEndX,
				flagEndY,
			);
			g.stroke();
		}
	}}
/>
