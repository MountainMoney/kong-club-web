<script lang="ts">
	import { Container, Graphics } from 'pixi-svelte';

	import {
		HAMBURGER_H,
		HAMBURGER_LINE_H,
		HAMBURGER_LINE_RADIUS,
		HAMBURGER_LINE_W,
	} from '../../game/layoutScene';

	type Props = {
		scale: number;
		color?: number;
	};

	const props: Props = $props();
	const color = $derived(props.color ?? 0xffffff);
	const w = $derived(HAMBURGER_LINE_W * props.scale);
	const h = $derived(HAMBURGER_H * props.scale);
	/** Same filled bar weight as ToolbarHamburgerIcon — crisper than stroked diagonals. */
	const barThick = $derived(HAMBURGER_LINE_H * props.scale);
	const radius = $derived(HAMBURGER_LINE_RADIUS * props.scale);
	const insetX = $derived(w * 0.1);
	const insetY = $derived(h * 0.1);
	const diagonalLen = $derived(
		Math.hypot(w - insetX * 2, h - insetY * 2),
	);
	const rotations = [Math.PI / 4, -Math.PI / 4] as const;
</script>

{#each rotations as rotation (rotation)}
	<Container {rotation}>
		<Graphics
			eventMode="none"
			draw={(g) => {
				g.clear();
				g.setFillStyle({ color });
				g.roundRect(-diagonalLen / 2, -barThick / 2, diagonalLen, barThick, radius);
				g.fill();
			}}
		/>
	</Container>
{/each}
