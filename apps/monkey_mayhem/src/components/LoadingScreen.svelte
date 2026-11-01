<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { cubicOut } from 'svelte/easing';
	import { Tween } from 'svelte/motion';
	import { Container, Sprite, Text } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';

	import { getContext } from '../game/context';
	import { hasLoadedAssetTexture } from '../game/introAssets';
	import { ensureIntroFredokaFont } from '../game/introFont';
	import {
		getSplashScreenLayout,
		introLogoUniformScale,
		loadingCardTopY,
		loadingCardX,
	} from '../game/layoutLoadingScreen';
	import { splashFeaturePanels } from '../game/splashCarousel';
	import PressToContinue from './PressToContinue.svelte';
	import SplashFeatureCarousel from './SplashFeatureCarousel.svelte';
	import SplashIntroCard from './SplashIntroCard.svelte';

	const TITLE_ENTRANCE_MS = 520;
	const TITLE_TO_CARDS_MS = 120;
	const TITLE_START_SCALE = 0.82;
	const TITLE_START_Y = -36;
	const CARD_ENTRANCE_MS = 520;
	const CARD_ENTRANCE_STAGGER_MS = 130;
	const CARD_ENTRANCE_RISE_PX = 22;

	type Props = {
		onloaded: () => void;
		/** When false, splash art and hit targets stay off (playfield can sit underneath). */
		visible?: boolean;
	};

	const props: Props = $props();
	const context = getContext();

	let pressed = $state(false);
	let introFontReady = $state(false);
	let titlePointerArmed = false;
	let splashSequenceStarted = false;
	let carouselAutoAdvance = $state(false);
	let hangTimer: ReturnType<typeof setTimeout> | undefined;
	const cardStaggerTimers: ReturnType<typeof setTimeout>[] = [];

	const titleAlpha = new Tween(0);
	const titleY = new Tween(TITLE_START_Y);
	const titleScaleMul = new Tween(TITLE_START_SCALE);
	const carouselAlpha = new Tween(0);
	const carouselY = new Tween(CARD_ENTRANCE_RISE_PX);
	const cardEntranceAlpha = [new Tween(0), new Tween(0), new Tween(0)];
	const cardEntranceY = [
		new Tween(CARD_ENTRANCE_RISE_PX),
		new Tween(CARD_ENTRANCE_RISE_PX),
		new Tween(CARD_ENTRANCE_RISE_PX),
	];

	const main = $derived(context.stateLayoutDerived.mainLayout());
	const canvas = $derived(context.stateLayoutDerived.canvasSizes());
	const splashLayout = $derived(
		getSplashScreenLayout({
			layoutWidth: main.width,
			layoutHeight: main.height,
			canvasWidth: canvas.width,
			canvasHeight: canvas.height,
			layoutType: context.stateLayoutDerived.layoutType(),
		}),
	);

	const panels = $derived(splashFeaturePanels());
	/** Desktop L→R: hidden bonus · max win · coin game */
	const desktopPanels = $derived([
		{ panel: panels[0], index: 0 as const },
		{ panel: panels[1], index: 1 as const },
		{ panel: panels[2], index: 2 as const },
	]);

	const logoReady = $derived(hasLoadedAssetTexture(context.stateApp.loadedAssets, 'title_art'));
	const splashVisible = $derived((props.visible ?? true) && !pressed);
	const titleCardReady = $derived(logoReady && introFontReady);
	const canDismissTitle = $derived(context.stateApp.loaded && titleCardReady);
	const loadingStatusText = $derived(canDismissTitle ? 'Ready' : 'Loading game assets');
	const loadingProgressText = $derived(
		!context.stateApp.loaded && context.stateApp.loadingProgress > 0
			? `${Math.floor(context.stateApp.loadingProgress)}%`
			: '',
	);
	const logoScale = $derived(introLogoUniformScale(splashLayout.logo.width) * titleScaleMul.current);

	const tweenOpts = { duration: TITLE_ENTRANCE_MS, easing: cubicOut };
	const cardTweenOpts = { duration: CARD_ENTRANCE_MS, easing: cubicOut };

	const runDesktopCardEntrance = () => {
		desktopPanels.forEach((card, i) => {
			const timer = setTimeout(() => {
				void cardEntranceAlpha[i].set(1, cardTweenOpts);
				void cardEntranceY[i].set(0, cardTweenOpts);
			}, i * CARD_ENTRANCE_STAGGER_MS);
			cardStaggerTimers.push(timer);
		});
	};

	const runInfoCardEntrance = () => {
		if (pressed) return;
		if (splashLayout.mode === 'carousel') {
			carouselAutoAdvance = true;
			void carouselAlpha.set(1, cardTweenOpts);
			void carouselY.set(0, cardTweenOpts);
			return;
		}
		runDesktopCardEntrance();
	};

	const waitMs = (ms: number) =>
		new Promise<void>((resolve) => {
			hangTimer = setTimeout(resolve, ms);
		});

	const playSplashSequence = async () => {
		void titleAlpha.set(1, tweenOpts);
		void titleY.set(0, tweenOpts);
		void titleScaleMul.set(1, tweenOpts);
		await waitMs(TITLE_ENTRANCE_MS + TITLE_TO_CARDS_MS);
		runInfoCardEntrance();
	};

	const onSplashPointerDown = () => {
		titlePointerArmed = canDismissTitle;
	};

	const dismissTitleScreen = (requireArmedPointer = true) => {
		const canUsePointer = (!requireArmedPointer || titlePointerArmed) && canDismissTitle;
		titlePointerArmed = false;
		if (!canUsePointer) return;
		pressed = true;
		props.onloaded();
	};

	$effect(() => {
		if (!titleCardReady || splashSequenceStarted) return;
		splashSequenceStarted = true;
		void playSplashSequence();
	});

	onMount(() => {
		void ensureIntroFredokaFont().then(() => {
			introFontReady = true;
		});
	});

	onDestroy(() => {
		clearTimeout(hangTimer);
		for (const timer of cardStaggerTimers) clearTimeout(timer);
	});
</script>

<FadeContainer show={splashVisible} persistent={true} sortableChildren={true}>
	<CanvasSizeRectangle
		zIndex={100}
		eventMode="static"
		cursor={canDismissTitle ? 'pointer' : 'default'}
		backgroundColor={0xffffff}
		backgroundAlpha={0.001}
		onpointerdown={onSplashPointerDown}
		onpointertap={() => dismissTitleScreen(true)}
	/>
	<MainContainer>
		<Container sortableChildren={true} eventMode="static" onpointerdown={onSplashPointerDown}>
			{#if logoReady}
				<Container
					x={splashLayout.logo.x}
					y={splashLayout.logo.y + titleY.current}
					alpha={titleAlpha.current}
					zIndex={10}
					eventMode="none"
				>
					<Sprite
						key="title_art"
						anchor={{ x: 0.5, y: 0 }}
						scale={logoScale}
					/>
				</Container>
			{/if}

			{#if splashLayout.mode === 'carousel' && splashLayout.carousel}
				<Container alpha={carouselAlpha.current} y={carouselY.current} zIndex={12}>
					<SplashFeatureCarousel
						layout={splashLayout.carousel}
						autoAdvance={carouselAutoAdvance}
					/>
				</Container>
			{:else if splashLayout.desktop}
				{#each desktopPanels as card (card.panel.id)}
					<Container
						alpha={cardEntranceAlpha[card.index].current}
						y={cardEntranceY[card.index].current}
						zIndex={12}
					>
						<SplashIntroCard
							panel={card.panel}
							x={loadingCardX(card.index, main.width, splashLayout.desktop.cardWidth)}
							y={loadingCardTopY(card.index)}
							width={splashLayout.desktop.cardWidth}
							height={splashLayout.desktop.cardHeight}
							loadedAssets={context.stateApp.loadedAssets}
							fontReady={introFontReady}
						/>
					</Container>
				{/each}
			{/if}
		</Container>
		<Container zIndex={20}>
			<Text
				anchor={{ x: 0.5, y: 0.5 }}
				x={Math.round(main.width * 0.5)}
				y={Math.round(main.height - splashLayout.pressBottomInset - 72)}
				text={loadingProgressText
					? `${loadingStatusText} (${loadingProgressText})`
					: loadingStatusText}
				style={{
					fontFamily: 'Arial',
					fontSize: Math.max(18, Math.round((splashLayout.pressFontSize ?? 48) * 0.45)),
					fontWeight: '700',
					fill: canDismissTitle ? 0xffffff : 0xd7e6ff,
					align: 'center',
				}}
			/>
		</Container>
	</MainContainer>
</FadeContainer>

<FadeContainer show={!pressed && canDismissTitle}>
	<PressToContinue
		variant="intro"
		disabled={!canDismissTitle}
		pressBottomInset={splashLayout.pressBottomInset}
		pressColor={0xffffff}
		pressFontSize={splashLayout.pressFontSize}
		onpress={() => dismissTitleScreen(false)}
	/>
</FadeContainer>
