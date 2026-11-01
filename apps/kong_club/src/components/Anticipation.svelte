<script lang="ts">
	import { onMount } from 'svelte';
	import { Container, Graphics } from 'pixi-svelte';

	import { BOARD_DIMENSIONS, SYMBOL_SIZE } from '../game/constants';
	import type { Reel } from '../game/stateGame.svelte';
	import { getSymbolX, getSymbolY } from '../game/utils';

	type Props = {
		reel: Reel;
		oncomplete: () => void;
	};

	const props: Props = $props();

	let sawFallIn = $state(false);
	let done = $state(false);
	let pulse = $state(0);

	const incomingRows = $derived(props.reel.reelState.teaseIncomingRows ?? []);
	const motion = $derived(props.reel.reelState.motion);
	const highlightRows = $derived.by(() => {
		if (incomingRows.length) return incomingRows;
		if (motion === 'hanging') {
			return Array.from({ length: BOARD_DIMENSIONS.y }, (_, row) => row);
		}
		return [];
	});
	const incomingSet = $derived(new Set(incomingRows));

	$effect(() => {
		if (done) return;
		if (motion === 'fallingIn') sawFallIn = true;
		if (sawFallIn && motion === 'stopped') {
			done = true;
			props.oncomplete();
		}
	});

	const drawCell =
		(row: number, hot: boolean) => (g: import('pixi.js').Graphics) => {
			const half = SYMBOL_SIZE * 0.46;
			const expand = hot ? 1.5 + pulse * 2.2 : 0.5 + pulse * 0.8;
			g.clear();
			g.roundRect(-half - expand, -half - expand, half * 2 + expand * 2, half * 2 + expand * 2, 10);
			g.stroke({
				color: 0xffe066,
				width: hot ? 3.4 + pulse * 1.4 : 2.2,
				alpha: hot ? 0.92 + pulse * 0.08 : 0.38 + pulse * 0.12,
			});
			g.roundRect(-half * 0.86, -half * 0.86, half * 1.72, half * 1.72, 8);
			g.stroke({
				color: 0xfff6c2,
				width: 1.4,
				alpha: hot ? 0.55 : 0.22,
			});
		};

	onMount(() => {
		let raf = 0;
		const tick = () => {
			pulse = (Math.sin(performance.now() / 180) + 1) * 0.5;
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});
</script>

{#each highlightRows as row (row)}
	<Container x={getSymbolX(props.reel.reelIndex)} y={getSymbolY(row)}>
		<Graphics draw={drawCell(row, incomingSet.has(row))} />
	</Container>
{/each}
