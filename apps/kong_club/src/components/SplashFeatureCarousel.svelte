<script lang="ts">
	import { onMount } from 'svelte';
	import { Container, Graphics } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { ensureIntroFredokaFont } from '../game/introFont';
	import type { SplashScreenLayout } from '../game/layoutLoadingScreen';
	import {
		SPLASH_AUTO_ADVANCE_MS,
		SPLASH_PANEL_COUNT,
		SPLASH_TRANSITION_MS,
		splashEaseOutCubic,
		splashPanelByStep,
	} from '../game/splashCarousel';
	import SplashIntroCard from './SplashIntroCard.svelte';

	type Props = {
		layout: NonNullable<SplashScreenLayout['carousel']>;
		autoAdvance?: boolean;
	};

	const props: Props = $props();
	const autoAdvance = $derived(Boolean(props.autoAdvance));
	const context = getContext();
	const loadedAssets = $derived(context.stateApp.loadedAssets);

	let introFontReady = $state(false);
	let stepIndex = $state(0);
	let transition = $state(0);
	let fromStep = $state(0);
	let toStep = $state(0);
	let isAnimating = $state(false);

	let autoTimer: ReturnType<typeof setTimeout> | undefined;
	let transitionRaf = 0;

	const fromPanel = $derived(splashPanelByStep(fromStep));
	const toPanel = $derived(splashPanelByStep(toStep));
	const currentPanel = $derived(splashPanelByStep(stepIndex));

	const goTo = (next: number) => {
		if (isAnimating) return;
		const len = SPLASH_PANEL_COUNT;
		const target = ((next % len) + len) % len;
		if (target === stepIndex) return;
		fromStep = stepIndex;
		toStep = target;
		isAnimating = true;
		transition = 0;
		const start = performance.now();
		const tick = () => {
			const t = Math.min(1, (performance.now() - start) / SPLASH_TRANSITION_MS);
			transition = splashEaseOutCubic(t);
			if (t < 1) {
				transitionRaf = requestAnimationFrame(tick);
				return;
			}
			stepIndex = target;
			isAnimating = false;
			transition = 0;
			if (autoAdvance) scheduleAuto();
		};
		cancelAnimationFrame(transitionRaf);
		transitionRaf = requestAnimationFrame(tick);
	};

	const scheduleAuto = () => {
		clearTimeout(autoTimer);
		autoTimer = setTimeout(() => goTo(stepIndex + 1), SPLASH_AUTO_ADVANCE_MS);
	};

	const fromAlpha = $derived(isAnimating ? 1 - transition : 1);
	const toAlpha = $derived(isAnimating ? transition : 0);
	const fromX = $derived(isAnimating ? -40 * transition : 0);
	const toX = $derived(isAnimating ? 40 * (1 - transition) : 0);

	const drawDots = (g: import('pixi.js').Graphics) => {
		g.clear();
		const gap = 18;
		const r = 5;
		const startX = -((SPLASH_PANEL_COUNT - 1) * gap) / 2;
		for (let i = 0; i < SPLASH_PANEL_COUNT; i++) {
			const active = i === stepIndex;
			g.circle(startX + i * gap, 0, active ? r + 1 : r);
			g.fill({ color: active ? 0xffd65a : 0xffffff, alpha: active ? 1 : 0.35 });
		}
	};

	$effect(() => {
		if (!autoAdvance) {
			clearTimeout(autoTimer);
			return;
		}
		scheduleAuto();
	});

	onMount(() => {
		void ensureIntroFredokaFont().then(() => {
			introFontReady = true;
		});
		return () => {
			clearTimeout(autoTimer);
			cancelAnimationFrame(transitionRaf);
		};
	});
</script>

<Container x={props.layout.centerX} y={0} sortableChildren={true}>
	{#if isAnimating}
		<Container alpha={fromAlpha} x={fromX} zIndex={1}>
			<SplashIntroCard
				panel={fromPanel}
				x={0}
				y={props.layout.centerY - props.layout.cardHeight * 0.5}
				width={props.layout.cardWidth}
				height={props.layout.cardHeight}
				loadedAssets={loadedAssets}
				fontReady={introFontReady}
			/>
		</Container>
		<Container alpha={toAlpha} x={toX} zIndex={2}>
			<SplashIntroCard
				panel={toPanel}
				x={0}
				y={props.layout.centerY - props.layout.cardHeight * 0.5}
				width={props.layout.cardWidth}
				height={props.layout.cardHeight}
				loadedAssets={loadedAssets}
				fontReady={introFontReady}
			/>
		</Container>
	{:else}
		<SplashIntroCard
			panel={currentPanel}
			x={0}
			y={props.layout.centerY - props.layout.cardHeight * 0.5}
			width={props.layout.cardWidth}
			height={props.layout.cardHeight}
			loadedAssets={loadedAssets}
			fontReady={introFontReady}
			zIndex={1}
		/>
	{/if}

	<Container y={props.layout.dotsY} zIndex={5} eventMode="static">
		<Graphics draw={drawDots} />
	</Container>
</Container>
