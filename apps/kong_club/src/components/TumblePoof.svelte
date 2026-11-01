<script lang="ts">
	import { onMount } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { Container, Graphics } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';

	import { SYMBOL_SIZE } from '../game/constants';
	import { CLUSTER_POOF_MS } from '../game/clusterConnectionTempo';

	type Props = {
		oncomplete?: () => void;
	};

	const props: Props = $props();

	/** Lightweight burst — spine explosion was leaving stuck last-frames on the stage. */
	const BURST_R = SYMBOL_SIZE * 0.28;
	const scale = new Tween(0.35);
	const alpha = new Tween(1);

	let settled = false;
	const finish = () => {
		if (settled) return;
		settled = true;
		props.oncomplete?.();
	};

	onMount(() => {
		const duration = Math.max(90, CLUSTER_POOF_MS / Math.max(0.5, stateBetDerived.timeScale()));
		void (async () => {
			await Promise.all([
				scale.set(1.15, { duration: duration * 0.45, easing: cubicOut }),
				alpha.set(0, { duration, easing: cubicOut }),
			]);
			finish();
		})();
		const id = setTimeout(finish, duration + 40);
		return () => {
			clearTimeout(id);
			finish();
		};
	});

	const drawBurst = (g: import('pixi.js').Graphics) => {
		g.clear();
		const spikes = 8;
		for (let i = 0; i < spikes; i += 1) {
			const a = (i / spikes) * Math.PI * 2;
			const x = Math.cos(a) * BURST_R;
			const y = Math.sin(a) * BURST_R;
			g.circle(x * 0.55, y * 0.55, 3.2);
			g.fill({ color: 0xfff3a0, alpha: 0.95 });
			g.circle(x, y, 2.1);
			g.fill({ color: 0xffc107, alpha: 0.85 });
		}
		g.circle(0, 0, 6);
		g.fill({ color: 0xffffff, alpha: 0.9 });
	};
</script>

<Container scale={scale.current} alpha={alpha.current}>
	<Graphics draw={drawBurst} />
</Container>
