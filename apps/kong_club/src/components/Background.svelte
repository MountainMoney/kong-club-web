<script lang="ts">

	import { Rectangle, SpineProvider, SpineTrack, Sprite } from 'pixi-svelte';

	import { FadeContainer } from 'components-pixi';

	import { SECOND } from 'constants-shared/time';



	import { getContext } from '../game/context';
	import { getBackgroundLook } from '../game/fxLab.svelte';
	import { stateGame } from '../game/stateGame.svelte';

	import { BACKGROUND_RATIO, PORTRAIT_BACKGROUND_RATIO } from '../game/constants';
	import { stateBonusIntro } from '../game/bonusIntroPresentation.svelte';
	import { hasLoadedAssetTexture } from '../game/introAssets';



	const context = getContext();

	const showBaseBackground = true;

	const isPortrait = $derived(context.stateLayoutDerived.layoutType() === 'portrait');



	/** object-fit: cover — always fills canvas at native 16:9 (1920×1080 ref). */

	const backgroundProps = $derived.by(() => {

		const canvas = context.stateLayoutDerived.canvasSizes();

		const bgRatio = isPortrait ? PORTRAIT_BACKGROUND_RATIO : BACKGROUND_RATIO;

		const canvasRatio = canvas.width / canvas.height;

		const center = { x: canvas.width / 2, y: canvas.height / 2, anchor: 0.5 as const };



		if (canvasRatio > bgRatio) {

			return {

				...center,

				width: canvas.width,

				height: canvas.width / bgRatio,

			};

		}



		return {

			...center,

			width: canvas.height * bgRatio,

			height: canvas.height,

		};

	});

	const superBgReady = $derived(
		hasLoadedAssetTexture(context.stateApp.loadedAssets, 'jungleSuperBackground'),
	);
	const superBgAlpha = $derived(
		superBgReady ? stateBonusIntro.backgroundBlend : 0,
	);

	/**
	 * Each spine hides a 1920×1080 region that marks the jungle artboard.
	 * spine-pixi flips Y, so a positive scale puts that plate on the jungle cover rect.
	 * Tree marker is slot `树`. Bush marker is slot `灌木`.
	 */
	const JUNGLE_PLATE = { w: 1920, h: 1080 };
	const plateLayout = (cx: number, cy: number) => {
		const bg = backgroundProps;
		const sx = bg.width / JUNGLE_PLATE.w;
		const sy = bg.height / JUNGLE_PLATE.h;
		return {
			x: bg.x - cx * sx,
			y: bg.y + cy * sy,
			scale: { x: sx, y: sy },
		};
	};
	const treesReady = $derived(Boolean(context.stateApp.loadedAssets?.jungleTrees));
	const bushReady = $derived(Boolean(context.stateApp.loadedAssets?.jungleBush));
	const stumpReady = $derived(
		hasLoadedAssetTexture(context.stateApp.loadedAssets, 'jungleStump'),
	);
	const treeLayout = $derived(plateLayout(106.378, 372.2437));
	const bushLayout = $derived(plateLayout(0, 552.8258));
	/** See (3 scatters) is sunny. Hear (4 scatters) is midnight. Lab can still preview in base. */
	const look = $derived.by(() => {
		if (stateGame.sessionBonusTier === 1) return 'sunny' as const;
		if (stateGame.sessionBonusTier === 2) return 'midnight' as const;
		return getBackgroundLook();
	});
	const altKeys = $derived(
		look === 'sunny'
			? {
					sky: 'sunnySky',
					back: 'sunnyBack',
					stump: 'sunnyStump',
				}
			: look === 'midnight'
				? {
						sky: 'midnightSky',
						back: 'midnightBack',
						stump: 'midnightStump',
					}
				: null,
	);
	const bonusTreesKey = $derived(
		look === 'sunny' ? 'sunnyJungleTrees' : look === 'midnight' ? 'midnightJungleTrees' : null,
	);
	const bonusBushKey = $derived(
		look === 'sunny' ? 'sunnyJungleBush' : look === 'midnight' ? 'midnightJungleBush' : null,
	);

</script>



<Rectangle {...context.stateLayoutDerived.canvasSizes()} backgroundColor={0x8eb8d8} zIndex={-3} />



<FadeContainer show={showBaseBackground} duration={SECOND} zIndex={-2}>
	{#if altKeys}
		<Sprite key={altKeys.sky} {...backgroundProps} />
		<Sprite key={altKeys.back} {...backgroundProps} />
		{#if bonusTreesKey && context.stateApp.loadedAssets?.[bonusTreesKey]}
			<SpineProvider key={bonusTreesKey} {...treeLayout}>
				<SpineTrack trackIndex={0} animationName="shu" loop />
			</SpineProvider>
		{/if}
		{#if bonusBushKey && context.stateApp.loadedAssets?.[bonusBushKey]}
			<SpineProvider key={bonusBushKey} {...bushLayout}>
				<SpineTrack trackIndex={0} animationName="Shrubbery" loop />
			</SpineProvider>
		{/if}
		<Sprite key={altKeys.stump} {...backgroundProps} />
	{:else}
		<Sprite key="jungleSky" {...backgroundProps} />
		<Sprite key="jungleBackground" {...backgroundProps} />
		{#if treesReady}
			<SpineProvider key="jungleTrees" {...treeLayout}>
				<SpineTrack trackIndex={0} animationName="shu" loop />
			</SpineProvider>
		{/if}
		{#if bushReady}
			<SpineProvider key="jungleBush" {...bushLayout}>
				<SpineTrack trackIndex={0} animationName="Shrubbery" loop />
			</SpineProvider>
		{/if}
		{#if stumpReady}
			<Sprite key="jungleStump" {...backgroundProps} />
		{/if}
	{/if}
</FadeContainer>

{#if superBgAlpha > 0.01}
	<Sprite key="jungleSuperBackground" {...backgroundProps} alpha={superBgAlpha} zIndex={-1} />
{/if}
