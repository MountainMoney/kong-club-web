<script lang="ts">
	import { Graphics } from 'pixi-svelte';

	type Props = {
		direction: 'up' | 'down';
		scale: number;
		disabled?: boolean;
	};

	const props: Props = $props();

	const color = $derived(props.disabled ? 0x555555 : 0xffffff);
	const strokeW = $derived(6.75 * props.scale);
	const halfH = $derived(5 * props.scale);
	/** Arm angle from vertical (~50° — sharper than prior revision). */
	const halfW = $derived(2 * halfH * Math.tan((50 * Math.PI) / 180));
</script>

<Graphics
	draw={(g) => {
		g.clear();
		const { direction } = props;
		if (direction === 'up') {
			g.moveTo(-halfW, halfH);
			g.lineTo(0, -halfH);
			g.lineTo(halfW, halfH);
		} else {
			g.moveTo(-halfW, -halfH);
			g.lineTo(0, halfH);
			g.lineTo(halfW, -halfH);
		}
		g.stroke({ width: strokeW, color, cap: 'round', join: 'round' });
	}}
/>
