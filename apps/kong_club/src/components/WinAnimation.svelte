<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';

	import { Container, Graphics } from 'pixi-svelte';

	import { getContext } from '../game/context';

	type AnimationState = 'intro' | 'idle' | 'outro';

	type Props = {
		animationMap: {
			intro:
				| 'big_win_intro'
				| 'epic_win_intro'
				| 'max_win_intro'
				| 'mega_win_intro'
				| 'super_win_intro';
			idle: 'big_win_idle' | 'epic_win_idle' | 'max_win_idle' | 'mega_win_idle' | 'super_win_idle';
			outro: 'big_win_exit' | 'epic_win_exit' | 'max_win_exit' | 'mega_win_exit' | 'super_win_exit';
		};
		width?: number;
		anchor?: number | { x: number; y: number };
		children?: Snippet;
	};

	const props: Props = $props();
	const context = getContext();
	const spineWidth = $derived(props.width ?? context.stateGameDerived.boardLayout().width);

	const palette: Record<string, number> = {
		big_win_intro: 0xf0c14a,
		epic_win_intro: 0x7dff6a,
		mega_win_intro: 0xc084fc,
		super_win_intro: 0xff8a3d,
		max_win_intro: 0xffe14a,
	};

	let elapsed = $state(0);
	let animationState = $state<AnimationState>('intro');

	onMount(() => {
		const started = performance.now();
		let frame = 0;
		const tick = () => {
			elapsed = (performance.now() - started) / 1000;
			if (animationState === 'intro' && elapsed > 0.72) animationState = 'idle';
			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	});

	const draw = $derived((graphics: import('pixi.js').Graphics) => {
		graphics.clear();
		const color = palette[props.animationMap.intro] ?? 0xf0c14a;
		const radius = spineWidth * (animationState === 'intro' ? 0.18 + elapsed * 0.22 : 0.42);
		const spin = elapsed * (animationState === 'idle' ? 0.8 : 2.4);
		graphics.circle(0, 0, radius).stroke({ color, width: 8, alpha: 0.9 });
		graphics.circle(0, 0, radius * 0.62).stroke({ color: 0x2f6a32, width: 5, alpha: 0.85 });
		for (let leaf = 0; leaf < 8; leaf++) {
			const angle = spin + (leaf / 8) * Math.PI * 2;
			const reach = radius * (0.72 + (leaf % 2) * 0.18);
			graphics
				.ellipse(Math.cos(angle) * reach, Math.sin(angle) * reach * 0.72, 18, 8)
				.fill({ color, alpha: 0.85 });
		}
	});
</script>

<Container>
	<Graphics {draw} />
	{#if props.children}
		<Container>
			{@render props.children()}
		</Container>
	{/if}
</Container>
