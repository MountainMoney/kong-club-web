<script lang="ts">

	import { Container, Rectangle, SpineProvider, SpineTrack, Sprite } from 'pixi-svelte';

	import { FadeContainer } from 'components-pixi';

	import { SECOND } from 'constants-shared/time';



	import { getContext } from '../game/context';
	import { getBackgroundLook } from '../game/fxLab.svelte';
	import { stateGame } from '../game/stateGame.svelte';

	import { stateBonusIntro } from '../game/bonusIntroPresentation.svelte';
	import { hasLoadedAssetTexture } from '../game/introAssets';
	import {
		BUSH_PLATE_MARKER,
		BUSH_PLATE_NUDGE,
		JUNGLE_SUPER_PLATE,
		TREE_PLATE_MARKER,
		TREE_PLATE_NUDGE,
		coverPlate,
		jungleCover,
		spineOnPlate,
	} from '../game/backgroundCover';



	const context = getContext();

	const showBaseBackground = true;

	/**
	 * One uniform 16:9 cover for sky, plate, trees, bush, and stump.
	 * Portrait used to squash that art into 800×1422. Crop instead.
	 */
	const cover = $derived.by(() => {
		const canvas = context.stateLayoutDerived.canvasSizes();
		return jungleCover(canvas.width, canvas.height);
	});

	const backgroundProps = $derived({
		x: cover.x,
		y: cover.y,
		width: cover.width,
		height: cover.height,
		anchor: cover.anchor,
	});

	/** Super is 1376×768. Same cover rule, its own pixels, so it is not squashed. */
	const superProps = $derived.by(() => {
		const canvas = context.stateLayoutDerived.canvasSizes();
		const fit = coverPlate(
			canvas.width,
			canvas.height,
			JUNGLE_SUPER_PLATE.w,
			JUNGLE_SUPER_PLATE.h,
		);
		return {
			x: fit.x,
			y: fit.y,
			width: fit.width,
			height: fit.height,
			anchor: fit.anchor,
		};
	});

	const superBgReady = $derived(
		hasLoadedAssetTexture(context.stateApp.loadedAssets, 'jungleSuperBackground'),
	);
	const superBgAlpha = $derived(
		superBgReady ? stateBonusIntro.backgroundBlend : 0,
	);

	const treesReady = $derived(Boolean(context.stateApp.loadedAssets?.jungleTrees));
	const bushReady = $derived(Boolean(context.stateApp.loadedAssets?.jungleBush));
	const stumpReady = $derived(
		hasLoadedAssetTexture(context.stateApp.loadedAssets, 'jungleStump'),
	);
	/** Same scale as the plate. Nudge is position only — see `backgroundCover.ts`. */
	const treeLayout = $derived(spineOnPlate(cover, TREE_PLATE_MARKER, TREE_PLATE_NUDGE));
	const bushLayout = $derived(spineOnPlate(cover, BUSH_PLATE_MARKER, BUSH_PLATE_NUDGE));
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
	/**
	 * Mid-bonus upgrade (See -> Hear, Q3) swaps the look. Swapping the spine key remounts
	 * the skeleton and restarts the sway from frame 0 (a visible jump). When all four bonus
	 * spines are loaded, keep both looks mounted for the whole bonus and only toggle which
	 * one is visible: both run on the shared ticker from the same mount, so the sway phase
	 * carries straight across the tier switch.
	 */
	const bonusSpinesReady = $derived(
		Boolean(
			context.stateApp.loadedAssets?.sunnyJungleTrees &&
				context.stateApp.loadedAssets?.midnightJungleTrees &&
				context.stateApp.loadedAssets?.sunnyJungleBush &&
				context.stateApp.loadedAssets?.midnightJungleBush,
		),
	);

</script>



<Rectangle {...context.stateLayoutDerived.canvasSizes()} backgroundColor={0x8eb8d8} zIndex={-3} />



<FadeContainer show={showBaseBackground} duration={SECOND} zIndex={-2}>
	{#if altKeys}
		<Sprite key={altKeys.sky} {...backgroundProps} />
		<Sprite key={altKeys.back} {...backgroundProps} />
		{#if bonusSpinesReady}
			<Container visible={look === 'sunny'}>
				<SpineProvider key="sunnyJungleTrees" {...treeLayout}>
					<SpineTrack trackIndex={0} animationName="shu" loop />
				</SpineProvider>
			</Container>
			<Container visible={look === 'midnight'}>
				<SpineProvider key="midnightJungleTrees" {...treeLayout}>
					<SpineTrack trackIndex={0} animationName="shu" loop />
				</SpineProvider>
			</Container>
			<Container visible={look === 'sunny'}>
				<SpineProvider key="sunnyJungleBush" {...bushLayout}>
					<SpineTrack trackIndex={0} animationName="Shrubbery" loop />
				</SpineProvider>
			</Container>
			<Container visible={look === 'midnight'}>
				<SpineProvider key="midnightJungleBush" {...bushLayout}>
					<SpineTrack trackIndex={0} animationName="Shrubbery" loop />
				</SpineProvider>
			</Container>
		{:else}
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
	<Sprite key="jungleSuperBackground" {...superProps} alpha={superBgAlpha} zIndex={-1} />
{/if}
