<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Container as PixiContainer } from 'pixi.js';
	import { Container } from 'pixi-svelte';

	import { createPress } from '../../game/ggUi/press.svelte';

	const {
		children,
		onpress,
		disabled = false,
		active = true,
	}: {
		children: Snippet;
		onpress?: () => void;
		disabled?: boolean;
		active?: boolean;
	} = $props();

	const press = createPress();
	const alpha = $derived(disabled ? 0.25 : active ? 1 : 0.45);

	// The children sit wherever the bar put them: the press shrinks about their middle, read on the first touch.
	let centre = $state({ x: 0, y: 0 });
	let measured = false;
	const down = (target: PixiContainer) => {
		if (!measured) {
			const { x, y, width, height } = target.getLocalBounds();
			centre = { x: x + width / 2, y: y + height / 2 };
			measured = true;
		}
		press.down();
	};
</script>

<Container
	x={centre.x}
	y={centre.y}
	pivot={centre}
	scale={{ x: press.scale, y: press.scale }}
	eventMode={disabled ? 'none' : 'static'}
	cursor="pointer"
	{alpha}
	onpointerdown={(event) => down(event.currentTarget as PixiContainer)}
	onpointerup={() => {
		press.up();
		onpress?.();
	}}
	onpointerupoutside={press.up}
	onpointerout={press.up}
>
	{@render children()}
</Container>
