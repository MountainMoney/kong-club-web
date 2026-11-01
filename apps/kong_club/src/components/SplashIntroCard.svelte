<script lang="ts">
	import { Container, Graphics, Sprite, Text } from 'pixi-svelte';

	import { SYMBOL_SIZE } from '../game/constants';
	import { hasLoadedAssetTexture } from '../game/introAssets';
	import { drawMmIntroCardPlaque } from '../game/mmPlayfieldUiTheme';
	import {
		splashCardSubtitleStyle,
		splashCardTitleStyle,
		splashHeroForPanel,
		splashHeroTextureKeys,
		splashMaxWinPlateLayout,
	} from '../game/splashIntroContent';
	import type { SplashFeaturePanel } from '../game/splashCarousel';
	import { getSymbolSpriteLayout } from '../game/symbolSpriteLayout';
	import { getPixiTextResolution, roundFontSize, roundPix } from '../game/pixiTextCrisp';

	type Props = {
		panel: SplashFeaturePanel;
		x: number;
		y: number;
		width: number;
		height: number;
		zIndex?: number;
		loadedAssets: Record<string, unknown>;
		fontReady?: boolean;
	};

	const props: Props = $props();

	const fontReady = $derived(Boolean(props.fontReady));
	const textRes = getPixiTextResolution();
	const hero = $derived(splashHeroForPanel(props.panel.id));
	const heroKeys = $derived(splashHeroTextureKeys(hero));

	const heroReady = $derived(
		heroKeys.every((key) => hasLoadedAssetTexture(props.loadedAssets, key)),
	);

	const titleFont = $derived(roundFontSize(Math.max(18, props.height * 0.07)));
	const subFont = $derived(roundFontSize(Math.max(13, props.height * 0.044)));
	const wrapW = $derived(Math.round(props.width * 0.84));

	const heroBox = $derived(Math.round(Math.min(props.width, props.height) * 0.4));
	const scatterBox = $derived(Math.round(heroBox * 0.42));
	const coinBox = $derived(Math.round(heroBox * 0.62));
	const maxWinFit = $derived(
		splashMaxWinPlateLayout(Math.round(props.width * 0.88), Math.round(props.height * 0.32)),
	);

	const spriteFit = (key: string, box: number) =>
		getSymbolSpriteLayout(key, {
			width: box / SYMBOL_SIZE,
			height: box / SYMBOL_SIZE,
		});

	const scatterOffset = (i: number) => {
		if (i < 3) {
			return { x: (i - 1) * (scatterBox * 0.78), y: -scatterBox * 0.42 };
		}
		return { x: (i - 3.5) * (scatterBox * 0.78), y: scatterBox * 0.38 };
	};

	const drawPlaque = (g: import('pixi.js').Graphics) => {
		drawMmIntroCardPlaque(g, props.width, props.height);
	};
</script>

<Container
	x={roundPix(props.x)}
	y={roundPix(props.y)}
	zIndex={props.zIndex ?? 1}
	sortableChildren={true}
>
	<Container x={0} y={props.height * 0.5} zIndex={0}>
		<Graphics draw={drawPlaque} />
	</Container>

	{#if heroReady}
		<Container x={0} y={props.height * 0.34} zIndex={1}>
			{#if hero === 'scatterFive'}
				{#each heroKeys as key, i (`${key}-${i}`)}
					{@const fit = spriteFit(key, scatterBox)}
					{@const pos = scatterOffset(i)}
					<Sprite
						{key}
						anchor={fit.anchor}
						x={pos.x}
						y={pos.y}
						width={fit.width}
						height={fit.height}
					/>
				{/each}
			{:else if hero === 'maxWin'}
				<Sprite
					key="intro_card_10000x"
					anchor={maxWinFit.anchor}
					width={maxWinFit.width}
					height={maxWinFit.height}
				/>
			{:else}
				{#each heroKeys as key, i (key)}
					{@const fit = spriteFit(key, coinBox)}
					<Sprite
						{key}
						anchor={fit.anchor}
						x={(i - 1) * (coinBox * 0.78)}
						y={i === 1 ? -coinBox * 0.08 : coinBox * 0.05}
						width={fit.width}
						height={fit.height}
					/>
				{/each}
			{/if}
		</Container>
	{/if}

	<Text
		anchor={{ x: 0.5, y: 0.5 }}
		x={0}
		y={roundPix(props.height * 0.7)}
		zIndex={2}
		text={props.panel.title}
		resolution={textRes}
		style={splashCardTitleStyle(titleFont, fontReady)}
	/>
	<Text
		anchor={{ x: 0.5, y: 0.5 }}
		x={0}
		y={roundPix(props.height * 0.84)}
		zIndex={2}
		text={props.panel.subtitle}
		resolution={textRes}
		style={splashCardSubtitleStyle(subFont, fontReady, wrapW)}
	/>
</Container>
