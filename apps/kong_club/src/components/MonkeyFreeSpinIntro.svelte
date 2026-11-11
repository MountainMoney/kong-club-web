<script lang="ts" module>
	export type EmitterEventFreeSpinIntro =
		| { type: 'freeSpinIntroShow'; tier?: number }
		| { type: 'freeSpinIntroHide' }
		| { type: 'freeSpinIntroSkip' }
		| { type: 'freeSpinIntroUpdate'; totalFreeSpins: number; tier?: number };
</script>

<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Tween } from 'svelte/motion';

	import { MainContainer } from 'components-layout';
	import { Container, Text } from 'pixi-svelte';
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';

	import { getContext } from '../game/context';
	import { GG_INTRO_CARD, ggEaseOutCubic } from '../game/ggTransitions';
	import {
		bonusIntroContentForTier,
		bonusIntroSpinsLabel,
		type BonusIntroContent,
	} from '../game/bonusIntroContent';
	import { bonusScreenAnimMs } from '../game/bonusScreenWait';
	import {
		BONUS_INTRO_DESC_SIZE,
		BONUS_INTRO_DESC_WRAP,
		BONUS_INTRO_GROUP_GAP,
		BONUS_INTRO_IMAGE_SIZE,
		BONUS_INTRO_SPINS_DESC_GAP,
		BONUS_INTRO_SPINS_SIZE,
		BONUS_INTRO_TITLE_SIZE,
		bonusIntroLayoutCenter,
	} from '../game/bonusIntroLayout';
	import { getGameLayoutProfile } from '../game/responsiveProfile.svelte';
	import {
		BONUS_INTRO_PLAYFIELD_ALPHA,
		resetBonusIntroPresentation,
		stateBonusIntro,
	} from '../game/bonusIntroPresentation.svelte';
	import { ensureIntroFredokaFont } from '../game/introFont';
	import { getPixiTextResolution } from '../game/pixiTextCrisp';
	import BonusIntroTierHero from './BonusIntroTierHero.svelte';
	import PressToContinue from './PressToContinue.svelte';
	import GgFoliage from './GgFoliage.svelte';

	const context = getContext();

	let show = $state(false);
	let content = $state<BonusIntroContent | null>(null);
	let spinsLabel = $state('');
	let oncomplete = $state(() => {});
	let fontReady = $state(false);
	let pressReady = $state(false);

	const playfieldTween = new Tween(1);
	const bgTween = new Tween(0);
	const overlayTween = new Tween(0);
	/** GG `Zg`: the continue prompt's own fade. */
	const ctaTween = new Tween(0);
	let introTweensSynced = false;

	const main = $derived(context.stateLayoutDerived.mainLayout());
	const profile = $derived(getGameLayoutProfile());
	const textRes = getPixiTextResolution();

	const titleStyle = {
		fontFamily: 'Fredoka',
		fontSize: BONUS_INTRO_TITLE_SIZE,
		fontWeight: '700' as const,
		fill: 0xffffff,
		align: 'center' as const,
		stroke: { color: 0x000000, width: 6, alpha: 1 },
		dropShadow: {
			alpha: 0.85,
			angle: Math.PI / 2,
			blur: 0,
			color: 0x000000,
			distance: 10,
		},
	};

	const spinsStyle = {
		fontFamily: 'Fredoka',
		fontSize: BONUS_INTRO_SPINS_SIZE,
		fontWeight: '700' as const,
		fill: 0xffffff,
		align: 'center' as const,
		stroke: { color: 0x000000, width: 6, alpha: 1 },
		dropShadow: {
			alpha: 0.85,
			angle: Math.PI / 2,
			blur: 0,
			color: 0x000000,
			distance: 10,
		},
	};

	const descriptionStyle = {
		fontFamily: 'Fredoka',
		fontSize: BONUS_INTRO_DESC_SIZE,
		fontWeight: '600' as const,
		fill: 0xffffff,
		align: 'center' as const,
		lineHeight: BONUS_INTRO_DESC_SIZE * 1.35,
		wordWrap: true,
		wordWrapWidth: BONUS_INTRO_DESC_WRAP,
		stroke: { color: 0x000000, width: 2, alpha: 1 },
		dropShadow: {
			alpha: 0.85,
			angle: Math.PI / 2,
			blur: 0,
			color: 0x000000,
			distance: 2,
		},
	};

	const titleBlockH = Math.round(BONUS_INTRO_TITLE_SIZE * 1.15);
	const spinsBlockH = Math.round(BONUS_INTRO_SPINS_SIZE * 1.15);
	const descLineH = Math.round(BONUS_INTRO_DESC_SIZE * 1.35);
	const descBlockH = descLineH * 3;
	const spinsDescGroupH = spinsBlockH + BONUS_INTRO_SPINS_DESC_GAP + descBlockH;
	const introImageSize = BONUS_INTRO_IMAGE_SIZE;
	const groupContentH =
		titleBlockH + BONUS_INTRO_GROUP_GAP + introImageSize + BONUS_INTRO_GROUP_GAP + spinsDescGroupH;
	const portraitGroupTopPad = $derived(profile.safeArea.top + Math.round(main.height * 0.08));
	const portraitGroupBottomPad = $derived(profile.safeArea.bottom + Math.round(main.height * 0.16));
	const portraitGroupAvailableH = $derived(
		Math.max(1, main.height - portraitGroupTopPad - portraitGroupBottomPad),
	);
	const widthScale = $derived(Math.min(1, (main.width * 0.86) / BONUS_INTRO_DESC_WRAP));
	const portraitGroupScale = $derived(
		Math.min(1, portraitGroupAvailableH / groupContentH, widthScale),
	);
	const desktopAvailableH = $derived(Math.max(1, Math.round(main.height * 0.7)));
	const desktopScale = $derived(
		Math.min(1, desktopAvailableH / groupContentH, widthScale),
	);
	const layout = $derived.by(() => {
		if (profile.mode === 'portrait') {
			return {
				x: Math.round(main.width * 0.5),
				y: Math.round(portraitGroupTopPad + portraitGroupAvailableH * 0.5),
				scale: portraitGroupScale,
			};
		}
		const center = bonusIntroLayoutCenter(main.width, main.height);
		return {
			x: center.x,
			y: center.y,
			scale: desktopScale,
		};
	});

	const groupTopY = Math.round(-groupContentH * 0.5);
	const titleY = Math.round(groupTopY + titleBlockH * 0.5);
	const imageY = Math.round(groupTopY + titleBlockH + BONUS_INTRO_GROUP_GAP + introImageSize * 0.5);
	const spinsDescTopY = Math.round(
		groupTopY + titleBlockH + BONUS_INTRO_GROUP_GAP + introImageSize + BONUS_INTRO_GROUP_GAP,
	);
	const spinsY = Math.round(spinsDescTopY + spinsBlockH * 0.5);
	const descriptionY = Math.round(
		spinsDescTopY + spinsBlockH + BONUS_INTRO_SPINS_DESC_GAP + descBlockH * 0.5,
	);

	$effect(() => {
		if (!stateBonusIntro.active) {
			introTweensSynced = false;
			return;
		}
		if (
			!introTweensSynced &&
			stateBonusIntro.active &&
			stateBonusIntro.overlayAlpha <= 0.01
		) {
			playfieldTween.set(0, { duration: 0 });
			bgTween.set(stateBonusIntro.backgroundBlend, { duration: 0 });
			overlayTween.set(0, { duration: 0 });
			introTweensSynced = true;
		}
		stateBonusIntro.playfieldAlpha = playfieldTween.current;
		stateBonusIntro.backgroundBlend = bgTween.current;
		stateBonusIntro.overlayAlpha = overlayTween.current;
	});

	const assetsReadyUnderBlack = () =>
		stateBonusIntro.active && stateBonusIntro.overlayAlpha <= 0.01;

	/**
	 * GG bonus intro card in (live GG build `s4e`, game.pretty.js 66999-67034; timings `Ya`):
	 * backdrop dims in over dimInMs, content fades in over contentInMs after it, and the
	 * continue prompt arrives at ctaMs over ctaInMs, all easeOutCubic.
	 * KC deviation (darken, never see-through): GG dims its backdrop in while the curtain is
	 * still closing, so the board shows through it for 220 ms. KC starts the dim once the
	 * curtain is shut, which makes it a fade from dark to the bonus scene (board hidden).
	 */
	const playCardIn = async () => {
		const dimMs = bonusScreenAnimMs(GG_INTRO_CARD.dimInMs);
		overlayTween.set(0, { duration: 0 });
		ctaTween.set(0, { duration: 0 });
		void context.eventEmitter.broadcastAsync({
			type: 'blackScreenCover',
			alpha: 0,
			durationMs: GG_INTRO_CARD.dimInMs,
		});
		const content = overlayTween.set(1, {
			delay: dimMs,
			duration: bonusScreenAnimMs(GG_INTRO_CARD.contentInMs),
			easing: ggEaseOutCubic,
		});
		await waitForTimeout(bonusScreenAnimMs(GG_INTRO_CARD.ctaMs));
		pressReady = true;
		await Promise.all([
			content,
			ctaTween.set(1, { duration: bonusScreenAnimMs(GG_INTRO_CARD.ctaInMs), easing: ggEaseOutCubic }),
		]);
	};

	const fadePresentationIn = async (tier: number) => {
		stateBonusIntro.tier = tier;

		if (assetsReadyUnderBlack()) {
			playfieldTween.set(stateBonusIntro.playfieldAlpha, { duration: 0 });
			bgTween.set(stateBonusIntro.backgroundBlend, { duration: 0 });
			await playCardIn();
			return;
		}

		// Fallback (intro state not prepared under black, e.g. a late asset load):
		// cover with the curtain first (no-op if already shut), hide the board under it (Q2),
		// then reveal the card exactly like the normal path.
		await context.eventEmitter.broadcastAsync({ type: 'blackScreenFadeIn' });
		stateBonusIntro.active = true;
		playfieldTween.set(BONUS_INTRO_PLAYFIELD_ALPHA, { duration: 0 });
		bgTween.set(0, { duration: 0 });
		overlayTween.set(0, { duration: 0 });
		stateBonusIntro.playfieldAlpha = BONUS_INTRO_PLAYFIELD_ALPHA;
		stateBonusIntro.backgroundBlend = 0;
		stateBonusIntro.overlayAlpha = 0;
		introTweensSynced = true;
		await playCardIn();
	};

	/**
	 * GG bonus intro card out (live GG build `hoe` + `c4e`, game.pretty.js 66975-66984,
	 * 67072-67077): content and prompt out over contentOutMs, then the backdrop dims out over
	 * dimOutMs onto the shut curtain, which then holds and opens (GG_CURTAIN).
	 * KC deviation (board stays hidden, never see-through): GG starts opening the curtain
	 * while its backdrop is still fading, so the board ghosts in through it. KC lets the dim
	 * finish first, shows the board under the full cover, then opens the curtain.
	 */
	const fadePresentationOut = async () => {
		const outMs = bonusScreenAnimMs(GG_INTRO_CARD.contentOutMs);
		await Promise.all([
			overlayTween.set(0, { duration: outMs, easing: ggEaseOutCubic }),
			ctaTween.set(0, { duration: outMs, easing: ggEaseOutCubic }),
		]);
		await context.eventEmitter.broadcastAsync({
			type: 'blackScreenCover',
			alpha: 1,
			durationMs: GG_INTRO_CARD.dimOutMs,
		});
		show = false;
		playfieldTween.set(1, { duration: 0 });
		stateBonusIntro.playfieldAlpha = 1;
		resetBonusIntroPresentation();
		await context.eventEmitter.broadcastAsync({ type: 'blackScreenFadeOut' });
	};

	const resetIntro = async () => {
		if (show) {
			await fadePresentationOut();
		} else {
			// Not on screen (buy entry, error reset): just clear, no curtain moves.
			overlayTween.set(0, { duration: 0 });
			ctaTween.set(0, { duration: 0 });
			playfieldTween.set(1, { duration: 0 });
			resetBonusIntroPresentation();
		}
		show = false;
		content = null;
		spinsLabel = '';
		oncomplete = () => {};
		pressReady = false;
	};

	void ensureIntroFredokaFont().then(() => {
		fontReady = true;
	});

	const unsubscribeIntro = context.eventEmitter.subscribe({
		freeSpinIntroShow: (e) => {
			content = bonusIntroContentForTier(e.tier);
			show = true;
		},
		freeSpinIntroHide: async () => {
			await resetIntro();
		},
		freeSpinIntroSkip: () => oncomplete(),
		freeSpinIntroUpdate: async (e) => {
			const tier = e.tier ?? stateBonusIntro.tier;
			content = bonusIntroContentForTier(tier);
			spinsLabel = bonusIntroSpinsLabel(e.totalFreeSpins);
			pressReady = false;
			await fadePresentationIn(tier);
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
		spinSkipPressToContinue: () => {
			if (show && pressReady) oncomplete();
		},
	});

	onDestroy(unsubscribeIntro);
</script>

{#if show && content}
	{#if fontReady}
		<!-- GG foliage frame, mounted before the texts so it stays behind them. -->
		<!-- GG: the cinematic foliage rig sits at full alpha for the whole card (it is covered and
		     uncovered with the backdrop), so it is not tied to the content fade. -->
		<GgFoliage variant="bonusIntro" alpha={1} play={true} />
		<MainContainer>
			<Container
				x={layout.x}
				y={layout.y}
				scale={layout.scale}
				alpha={stateBonusIntro.overlayAlpha}
				sortableChildren={true}
			>
				<Text anchor={0.5} x={0} y={titleY} text={content.title} style={titleStyle} resolution={textRes} />

				<BonusIntroTierHero
					tier={content.tier}
					y={imageY}
					displaySize={introImageSize}
					loadedAssets={context.stateApp.loadedAssets}
				/>

				<Text anchor={0.5} x={0} y={spinsY} text={spinsLabel} style={spinsStyle} resolution={textRes} />
				<Text
					anchor={0.5}
					x={0}
					y={descriptionY}
					text={content.description}
					style={descriptionStyle}
					resolution={textRes}
				/>
			</Container>
		</MainContainer>
	{/if}

	{#if ctaTween.current > 0.02 && pressReady}
		<Container alpha={ctaTween.current}>
			<PressToContinue variant="intro" onpress={() => oncomplete()} />
		</Container>
	{/if}
{/if}
