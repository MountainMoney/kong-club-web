<script lang="ts">
	import { onMount } from 'svelte';

	import { Container, Graphics } from 'pixi-svelte';

	import { CLUSTER_POOF_MS } from '../game/clusterConnectionTempo';

	type Props = {
		x?: number;
		y?: number;
		/** Same length as the tumble poof, so a symbol explosion does not hold the board. */
		durationMs?: number;
		oncomplete?: () => void;
	};

	const props: Props = $props();
	let elapsed = $state(0);

	onMount(() => {
		const started = performance.now();
		const duration = props.durationMs ?? CLUSTER_POOF_MS;
		let frame = 0;
		let finished = false;
		const tick = () => {
			elapsed = (performance.now() - started) / 1000;
			if (!finished && performance.now() - started >= duration) {
				finished = true;
				props.oncomplete?.();
			}
			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	});

	const draw = $derived((graphics: import('pixi.js').Graphics) => {
		graphics.clear();
		const life = Math.min(1, elapsed / (CLUSTER_POOF_MS / 1000));
		const radius = 18 + life * 46;
		graphics.circle(0, 0, radius).stroke({ color: 0xf0c14a, width: 4, alpha: 1 - life });
		for (let leaf = 0; leaf < 6; leaf++) {
			const angle = life * 4 + (leaf / 6) * Math.PI * 2;
			const reach = radius * (0.4 + life);
			graphics
				.ellipse(Math.cos(angle) * reach, Math.sin(angle) * reach, 10, 4)
				.fill({ color: leaf % 2 ? 0x3f9a45 : 0xff8a3d, alpha: 1 - life * 0.7 });
		}
	});
</script>

<Container x={props.x ?? 0} y={props.y ?? 0}>
	<Graphics {draw} />
</Container>
