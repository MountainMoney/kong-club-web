<script lang="ts">
	import { onMount } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { BlurFilter } from 'pixi.js';

	import { EnablePixiExtension } from 'components-pixi';
	import { EnableHotkey } from 'components-shared';
	import { MainContainer } from 'components-layout';
	import { App, Container } from 'pixi-svelte';
	import { stateModal, stateUi } from 'state-shared';
	import { GameVersion } from 'components-ui-html';

	import MonkeyModals from './MonkeyModals.svelte';
	import BonusBuyScreen from './gg/BonusBuyScreen.svelte';
	import GaiaBar from './gg/GaiaBar.svelte';
	import IntroCinematic from './IntroCinematic.svelte';
	import IntroBackdropDim from './IntroBackdropDim.svelte';
	import './ui/summit/summitType.css';

	import { getContext } from '../game/context';
	import { zIndexes } from '../game/constants';
	import { isShortLandscape } from '../game/summitToolbarLayout';
	import { markFxLabShellReady, stateFxLab } from '../game/fxLab.svelte';
	import { ensureFredokaOneFont } from '../game/introFont';
	import { syncGameLayoutProfile } from '../game/responsiveProfile.svelte';
	import { syncSpinSpeedToBet } from '../game/spinSpeed.svelte';
	import { stateBonusOutro } from '../game/bonusOutroPresentation.svelte';
	import { stateBonusIntro } from '../game/bonusIntroPresentation.svelte';
	import { isReplayUrl } from '../game/replayMode.svelte';
	import { stateSummitTease } from '../game/summitTease.svelte';
	import { introBackgroundBlur, stateIntroCinematic } from '../game/introCinematicState.svelte';

	import EnableSound from './EnableSound.svelte';
	import EnableGameActor from './EnableGameActor.svelte';
	import ResumeBet from './ResumeBet.svelte';
	import Sound from './Sound.svelte';
	import Background from './Background.svelte';
	import BoardFrame from './BoardFrame.svelte';
	import BoardBorderOverlay from './BoardBorderOverlay.svelte';
	import PlayfieldTitle from './PlayfieldTitle.svelte';
	import TileLevelGrid from './TileLevelGrid.svelte';
	import MultiplierGrid from './MultiplierGrid.svelte';
	import Board from './Board.svelte';
	import ClusterWinAmounts from './ClusterWinAmounts.svelte';
	import TumbleBoard from './TumbleBoard.svelte';
	import PaylineWinHighlight from './PaylineWinHighlight.svelte';
	import SpinWinOverlay from './SpinWinOverlay.svelte';
	import ClickToSkip from './ClickToSkip.svelte';
	import MonkeyFreeSpinIntro from './MonkeyFreeSpinIntro.svelte';
	import BlackScreenFade from './BlackScreenFade.svelte';
	import FreeSpinOutro from './FreeSpinOutro.svelte';
	import Transition from './Transition.svelte';
	import KongClubMechanics from './KongClubMechanics.svelte';
	import MonkeyProgressBar from './MonkeyProgressBar.svelte';
	import CoinFeatureReveal from './CoinFeatureReveal.svelte';
	import CoinFeatureDim from './CoinFeatureDim.svelte';
	import MonkeyMascot from './MonkeyMascot.svelte';
	import SummitTeaseOverlay from './SummitTeaseOverlay.svelte';
	import ReplayMode from './ReplayMode.svelte';

	const context = getContext();

	let htmlLoaderReadyDispatched = false;
	let summitFontReady = $state(false);

	const mainLayout = $derived(context.stateLayoutDerived.mainLayout());
	const canvasSizes = $derived(context.stateLayoutDerived.canvasSizes());

	$effect.pre(() => {
		syncGameLayoutProfile({
			layoutType: context.stateLayoutDerived.layoutType(),
			layoutWidth: mainLayout.width,
			layoutHeight: mainLayout.height,
			canvasWidth: canvasSizes.width,
			canvasHeight: canvasSizes.height,
		});
	});

	$effect(() => {
		const progress = context.stateApp.loadingProgress;
		if (!(progress > 0) || htmlLoaderReadyDispatched) return;
		window.dispatchEvent(
			new CustomEvent('kong-club:preload-progress', {
				detail: { done: progress, total: 100 },
			}),
		);
	});

	$effect(() => {
		if (htmlLoaderReadyDispatched || !context.stateApp.loaded) return;
		htmlLoaderReadyDispatched = true;
		window.dispatchEvent(new CustomEvent('kong-club:ready'));
	});

	/** Let HTML modals receive clicks — canvas must not sit above them. */
	$effect(() => {
		if (stateUi.config.mode === 'replay') return;
		if (!context.stateApp.loaded) return;

		const canvas = context.stateApp.pixiApplication?.renderer?.canvas as
			| HTMLCanvasElement
			| undefined;

		if (!canvas) return;

		const htmlModal = Boolean(stateModal.modal) && stateModal.modal?.name !== 'buyBonus';
		canvas.style.pointerEvents = htmlModal ? 'none' : 'auto';
	});

	const showSplash = $derived(context.stateLayout.showLoadingScreen && !isReplayUrl());
	/** Playfield mounts under the splash so cards can fade while the board comes in. */
	let splashHandoff = $state(false);
	const showPlayfield = $derived(!showSplash || splashHandoff);
	const showCornerCredits = $derived(!isShortLandscape(canvasSizes.width, canvasSizes.height));
	/**
	 * In-play title card (title_art above the reels). Off for now (Ryan, 2026-11-09): in the
	 * wide layout it sits over the progress bar. Set true to bring it back. Splash and
	 * loading screens draw their own logo and are not affected.
	 */
	/**
	 * Intro logo at the end of the cinematic. 'fade': the intro logo fades out in place
	 * and the in-play title stays off. 'title': the intro logo hands over to the in-play
	 * title (it fades in with the unblur, as in the Nov 6 work) and the title is back on.
	 */
	const INTRO_LOGO_END: 'fade' | 'title' = 'fade';
	const SHOW_PLAYFIELD_TITLE = INTRO_LOGO_END === 'title';
	/** Hop wrapper takes the mascot's own layer (portrait sits above the vine frame). */
	const introHopZ = $derived(
		canvasSizes.height > canvasSizes.width * 1.05 ? zIndexes.boardBorder + 15 : zIndexes.mascot,
	);

	/** GG-ported intro cinematic (replaces the HTML OpeningSplash); stays up through its exit. */
	const showIntro = $derived(summitFontReady && stateIntroCinematic.active && !isReplayUrl());

	/**
	 * Light blur on the game layer (background + playfield) while the buy menu or its
	 * confirm step is open. Same idea as the GG buy-screen scrim blur, but a plain
	 * BlurFilter on the game layer: the menu's BackdropBlurFilter needs a back buffer
	 * that this app does not create, so it never blurred anything. Follows the modal
	 * state, so every close path (buy, activate, close button, outside tap, bonus start)
	 * clears it. The buy UI itself sits outside the filtered layers.
	 */
	const GAME_BLUR_PX = 5;
	const GAME_BLUR_MS = 200;
	const buyMenuOpen = $derived(
		stateModal.modal?.name === 'buyBonus' || stateModal.modal?.name === 'buyBonusConfirm',
	);
	const gameBlur = new Tween(0, { duration: GAME_BLUR_MS, easing: cubicOut });
	const gameBlurFilter = new BlurFilter({ strength: 0, quality: 2 });
	$effect(() => {
		void gameBlur.set(buyMenuOpen ? GAME_BLUR_PX : 0);
	});
	$effect(() => {
		gameBlurFilter.strength = gameBlur.current;
	});
	const gameLayerFilters = $derived(gameBlur.current > 0.05 ? [gameBlurFilter] : undefined);
	/** Background layer: buy-menu blur plus the intro cinematic's background blur. */
	const backgroundFilters = $derived([
		...(gameLayerFilters ?? []),
		...(stateIntroCinematic.blur > 0.001 ? [introBackgroundBlur] : []),
	]);

	const playfieldAlpha = $derived(stateBonusOutro.playfieldAlpha * stateBonusIntro.playfieldAlpha);

	const beginSplashHandoff = () => {
		splashHandoff = true;
	};

	const revealPlayfield = () => {
		context.stateLayout.showLoadingScreen = false;
		splashHandoff = false;
		if (!stateBonusOutro.active) {
			stateBonusOutro.holdPlayfieldHidden = false;
			stateBonusOutro.playfieldAlpha = 1;
		}
		markFxLabShellReady();
	};

	onMount(() => {
		let mounted = true;
		void Promise.all([
			ensureFredokaOneFont(),
			document.fonts.load('600 32px Rubik'),
			document.fonts.load('700 40px Rubik'),
		]).then(() => {
			if (mounted) summitFontReady = true;
		});
		syncSpinSpeedToBet();
		if (!isReplayUrl()) {
			context.stateLayout.showLoadingScreen = true;
		}
		return () => {
			mounted = false;
		};
	});

	$effect(() => {
		if (!isReplayUrl()) return;
		if (context.stateApp.loaded) {
			revealPlayfield();
		}
	});

	/** FX Lab: Spawn Coin Game can skip the splash and mount the playfield. */
	$effect(() => {
		if (!stateFxLab.forceEnterPlayfield) return;
		if (!context.stateLayout.showLoadingScreen) {
			stateFxLab.forceEnterPlayfield = false;
			markFxLabShellReady();
			return;
		}
		stateFxLab.forceEnterPlayfield = false;
		stateIntroCinematic.active = false;
		revealPlayfield();
	});

	context.eventEmitter.subscribeOnMount({
		buyBonusConfirm: () => {
			stateModal.modal = { name: 'buyBonusConfirm' };
		},
	});
</script>

<div class="mm-game-root">
	<App>
		<EnableSound />
		{#if !isReplayUrl()}
			<EnableHotkey />
		{/if}
		<EnableGameActor />
		<EnablePixiExtension />

		<!-- Buy-menu blur (item 9) on the whole background layer; the GG intro camera [ja]
		     zooms the background 1 → 1.1 → 1 about the canvas centre inside it, darkened
		     under the intro. Both blurs share one filter list on this layer. -->
		<Container zIndex={-2} sortableChildren={true} filters={backgroundFilters}>
			<Container
				sortableChildren={true}
				x={canvasSizes.width / 2}
				y={canvasSizes.height / 2}
				pivot={{ x: canvasSizes.width / 2, y: canvasSizes.height / 2 }}
				scale={stateIntroCinematic.zoom}
			>
				<Background />
				<IntroBackdropDim />
			</Container>
		</Container>

		{#if showPlayfield}
			{#if !isReplayUrl()}
				<ResumeBet />
			{/if}
			<Sound />

			<MainContainer>
				<!-- Intro entrance (GG Dce): the board drops in from above; title + mascot are counter-offset. -->
				<Container
					alpha={playfieldAlpha}
					filters={gameLayerFilters}
					sortableChildren={true}
					x={stateSummitTease.shakeX}
					y={stateSummitTease.shakeY + stateIntroCinematic.boardY}
				>
					<!-- Back → front: board bg → symbols → vine border → title -->
					<BoardFrame />
					<TileLevelGrid />
					<MultiplierGrid />
					<Board />
					<TumbleBoard />
					<KongClubMechanics />
					{#if !stateSummitTease.active}
						<!-- Intro entrance (GG Jqe): mascot hops in from the right, squash on landing. -->
						<Container
							zIndex={introHopZ}
							sortableChildren={true}
							pivot={{ x: stateIntroCinematic.hero.px, y: stateIntroCinematic.hero.py }}
							x={stateIntroCinematic.hero.px + stateIntroCinematic.hero.x}
							y={stateIntroCinematic.hero.py + stateIntroCinematic.hero.y - stateIntroCinematic.boardY}
							scale={{ x: stateIntroCinematic.hero.sx, y: stateIntroCinematic.hero.sy }}
						>
							<MonkeyMascot />
						</Container>
						<BoardBorderOverlay />
					{/if}
					{#if SHOW_PLAYFIELD_TITLE}
						<!-- Logo fades in with the background unblur (no slide). -->
						<Container
							zIndex={zIndexes.playfieldTitle}
							sortableChildren={true}
							y={-stateIntroCinematic.boardY}
							alpha={stateIntroCinematic.uiAlpha}
						>
							<PlayfieldTitle />
						</Container>
					{/if}
					<CoinFeatureDim />
					<CoinFeatureReveal />
					<ClusterWinAmounts />
					<PaylineWinHighlight />
				</Container>
			</MainContainer>

			<SummitTeaseOverlay />
			{#if stateSummitTease.active}
				<Container zIndex={zIndexes.summitTeaseFront} eventMode="none" sortableChildren={true}>
					<MainContainer>
						<Container
							sortableChildren={true}
							x={stateSummitTease.shakeX}
							y={stateSummitTease.shakeY}
						>
							<MonkeyProgressBar />
							<BoardBorderOverlay />
							<MonkeyMascot />
						</Container>
					</MainContainer>
				</Container>
			{/if}

			{#if summitFontReady}
				<!-- UI fades in with the background unblur (layout untouched). -->
				<Container alpha={stateIntroCinematic.uiAlpha}>
					<GaiaBar replay={isReplayUrl()} />
				</Container>
			{/if}
			<ClickToSkip />
			<SpinWinOverlay />
			<MonkeyFreeSpinIntro />
			<FreeSpinOutro />
			<BlackScreenFade />
			<Transition />
			{#if summitFontReady}
				<BonusBuyScreen />
			{/if}
		{/if}

		{#if showIntro}
			<Container zIndex={zIndexes.blackScreen - 5} sortableChildren={true}>
				<IntroCinematic
					onleavestart={beginSplashHandoff}
					oncontinue={revealPlayfield}
					ondone={() => (stateIntroCinematic.active = false)}
				/>
			</Container>
		{/if}

		<ReplayMode />
	</App>

	{#if summitFontReady && showCornerCredits}
		<div
			class="corner-credits summit-ui-type"
			class:behind-overlay={!!stateModal.modal}
			style={`opacity:${playfieldAlpha * stateIntroCinematic.uiAlpha}`}
			aria-hidden="true"
		>
			<span class="corner-credits-left">KONG CLUB</span>
			<span class="corner-credits-right">TRIFECTA</span>
		</div>
	{/if}
</div>

{#if summitFontReady && stateUi.config.mode !== 'replay'}
	<MonkeyModals>
		{#snippet version()}
			<GameVersion version="0.4.0" />
		{/snippet}
	</MonkeyModals>
{/if}

<style>
	.mm-game-root {
		position: relative;
		width: 100%;
		height: 100%;
	}

	.corner-credits {
		position: fixed;
		inset: 0;
		z-index: 13000;
		pointer-events: none;
	}

	.corner-credits-left,
	.corner-credits-right {
		position: absolute;
		top: 8px;
		color: #fff;
		font-family: 'Fredoka One', Inter, sans-serif;
		font-size: 12px;
		font-weight: 400;
		letter-spacing: 1px;
		line-height: 1;
		white-space: nowrap;
		-webkit-text-stroke: 0;
		text-shadow: var(--type-stroke-outside);
	}

	.corner-credits.behind-overlay {
		visibility: hidden;
	}

	.corner-credits-left {
		left: 8px;
	}

	.corner-credits-right {
		right: 8px;
	}
</style>
