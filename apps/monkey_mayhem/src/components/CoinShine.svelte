<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { cubicInOut } from 'svelte/easing';
	import { Container, Graphics } from 'pixi-svelte';

	import { COIN_DISC_RADIUS, COIN_SHINE } from '../game/coinShineStyles';

	type Props = {
		live?: boolean;
	};

	const props: Props = $props();
	const live = $derived(props.live ?? true);

	const progress = new Tween(0);
	let shineOn = $state(false);

	const radius = COIN_DISC_RADIUS * COIN_SHINE.radiusScale;
	const span = radius * 2.05;
	const travelX = $derived(-span + progress.current * span * 2);

	const drawClip = (g: import('pixi.js').Graphics) => {
		g.circle(0, 0, radius);
		g.fill({ color: 0xffffff });
	};

	const drawSoftBand = (g: import('pixi.js').Graphics) => {
		const w = COIN_SHINE.bandWidth * 2.4;
		const h = COIN_SHINE.bandHeight;
		g.roundRect(-w / 2, -h / 2, w, h, w);
		g.fill({ color: 0xffffff, alpha: COIN_SHINE.softAlpha });
	};

	const drawHotBand = (g: import('pixi.js').Graphics) => {
		const w = COIN_SHINE.bandWidth;
		const h = COIN_SHINE.bandHeight;
		g.roundRect(-w / 2, -h / 2, w, h, w);
		g.fill({ color: 0xffffff, alpha: COIN_SHINE.alpha });
	};

	$effect(() => {
		const isLive = live;
		let timeout = 0;
		let cancelled = false;
		if (!isLive) {
			shineOn = false;
			return;
		}
		const play = () => {
			if (cancelled) return;
			shineOn = true;
			void progress.set(0, { duration: 0 }).then(() =>
				progress
					.set(1, { duration: COIN_SHINE.duration, easing: cubicInOut })
					.then(() => {
						shineOn = false;
						if (cancelled) return;
						const gap =
							COIN_SHINE.gapMin +
							Math.random() * Math.max(0, COIN_SHINE.gapMax - COIN_SHINE.gapMin);
						timeout = window.setTimeout(play, gap);
					}),
			);
		};
		timeout = window.setTimeout(play, 80);
		return () => {
			cancelled = true;
			window.clearTimeout(timeout);
			shineOn = false;
		};
	});
</script>

{#if live && shineOn}
	<Container>
		<Graphics isMask={true} draw={drawClip} />
		<Container x={travelX} rotation={COIN_SHINE.rotation}>
			<Graphics draw={drawSoftBand} />
			<Graphics draw={drawHotBand} />
		</Container>
	</Container>
{/if}
