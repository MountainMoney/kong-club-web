<script lang="ts">
	import { onMount } from 'svelte';

	import { EnablePixiExtension } from 'components-pixi';
	import { EnableHotkey } from 'components-shared';
	import { MainContainer } from 'components-layout';
	import { App, Container } from 'pixi-svelte';
	import { stateModal, stateUi } from 'state-shared';
	import { GameVersion } from 'components-ui-html';

	import MonkeyModals from './MonkeyModals.svelte';
	import SummitToolbar from './ui/SummitToolbar.svelte';
	import OpeningSplash from './OpeningSplash.svelte';
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
	import GlobalMultiplier from './GlobalMultiplier.svelte';
	import PaylineWinHighlight from './PaylineWinHighlight.svelte';
	import SpinWinOverlay from './SpinWinOverlay.svelte';
	import ClickToSkip from './ClickToSkip.svelte';
	import MonkeyFreeSpinIntro from './MonkeyFreeSpinIntro.svelte';
	import BlackScreenFade from './BlackScreenFade.svelte';
	import FreeSpinOutro from './FreeSpinOutro.svelte';
	import Transition from './Transition.svelte';
	import MonkeyMayhemMechanics from './MonkeyMayhemMechanics.svelte';
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
			new CustomEvent('monkey-mayhem:preload-progress', {
				detail: { done: progress, total: 100 },
			}),
		);
	});

	$effect(() => {
		if (htmlLoaderReadyDispatched || !context.stateApp.loaded) return;
		htmlLoaderReadyDispatched = true;
		window.dispatchEvent(new CustomEvent('monkey-mayhem:ready'));
	});

	/** Let HTML modals receive clicks — canvas must not sit above them. */
	$effect(() => {
		if (stateUi.config.mode === 'replay') return;
		if (!context.stateApp.loaded) return;

		const canvas = context.stateApp.pixiApplication?.renderer?.canvas as
			| HTMLCanvasElement
			| undefined;

		if (!canvas) return;

		canvas.style.pointerEvents = stateModal.modal ? 'none' : 'auto';
	});

	const showSplash = $derived(context.stateLayout.showLoadingScreen && !isReplayUrl());
	/** Playfield mounts under the splash so cards can fade while the board comes in. */
	let splashHandoff = $state(false);
	const showPlayfield = $derived(!showSplash || splashHandoff);
	const showCornerCredits = $derived(!isShortLandscape(canvasSizes.width, canvasSizes.height));

	const playfieldAlpha = $derived(
		stateBonusOutro.playfieldAlpha * stateBonusIntro.playfieldAlpha,
	);

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
		void ensureFredokaOneFont().then(() => {
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

	<Background />

	{#if showPlayfield}
		{#if !isReplayUrl()}
			<ResumeBet />
		{/if}
		<Sound />

		<MainContainer>
			<Container
				alpha={playfieldAlpha}
				sortableChildren={true}
				x={stateSummitTease.shakeX}
				y={stateSummitTease.shakeY}
			>
				<!-- Back → front: board bg → symbols → vine border → title -->
				<BoardFrame />
				<TileLevelGrid />
				<MultiplierGrid />
				<Board />
				<TumbleBoard />
				<MonkeyMayhemMechanics />
				{#if !stateSummitTease.active}
					<MonkeyMascot />
					<BoardBorderOverlay />
				{/if}
				<PlayfieldTitle />
				<CoinFeatureDim />
				<CoinFeatureReveal />
				<GlobalMultiplier />
				<ClusterWinAmounts />
				<PaylineWinHighlight />
			</Container>
		</MainContainer>

		<SummitTeaseOverlay />
		{#if stateSummitTease.active}
			<Container
				zIndex={zIndexes.summitTeaseFront}
				eventMode="none"
				sortableChildren={true}
			>
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

		<ClickToSkip />
		<SpinWinOverlay />
		<MonkeyFreeSpinIntro />
		<FreeSpinOutro />
		<BlackScreenFade />
		<Transition />
	{/if}

	<ReplayMode />
</App>

{#if summitFontReady && showSplash}
	<OpeningSplash onleavestart={beginSplashHandoff} oncontinue={revealPlayfield} />
{/if}

{#if summitFontReady && showPlayfield}
	<SummitToolbar replayMode={isReplayUrl()} />
{/if}

{#if summitFontReady && showCornerCredits}
	<div
		class="corner-credits summit-ui-type"
		class:behind-overlay={!!stateModal.modal}
		style={`opacity:${playfieldAlpha}`}
		aria-hidden="true"
	>
		<span class="corner-credits-left">MONKEY MAYHEM</span>
		<span class="corner-credits-right">SUMMIT STUDIOS</span>
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
