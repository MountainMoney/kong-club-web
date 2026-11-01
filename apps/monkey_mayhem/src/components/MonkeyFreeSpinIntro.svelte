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
	import { waitForResolve } from 'utils-shared/wait';

	import { getContext } from '../game/context';
	import {
		bonusIntroContentForTier,
		bonusIntroSpinsLabel,
		type BonusIntroContent,
	} from '../game/bonusIntroContent';
	import { bonusScreenAnimMs } from '../game/bonusScreenWait';
	import {
		BONUS_INTRO_DESC_SIZE,
		BONUS_INTRO_DESC_WRAP,
		BONUS_INTRO_FADE_MS,
		BONUS_INTRO_GROUP_GAP,
		BONUS_INTRO_IMAGE_SIZE,
		BONUS_INTRO_SPINS_DESC_GAP,
		BONUS_INTRO_SPINS_SIZE,
		BONUS_INTRO_TITLE_SIZE,
		bonusIntroLayoutCenter,
	} from '../game/bonusIntroLayout';
	import { getGameLayoutProfile } from '../game/responsiveProfile.svelte';
	import {
		BONUS_INTRO_PLAYFIELD_DIM,
		resetBonusIntroPresentation,
		stateBonusIntro,
	} from '../game/bonusIntroPresentation.svelte';
	import { ensureIntroFredokaFont } from '../game/introFont';
	import { getPixiTextResolution } from '../game/pixiTextCrisp';
	import BonusIntroTierHero from './BonusIntroTierHero.svelte';
	import PressToContinue from './PressToContinue.svelte';

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

	const fadePresentationIn = async (tier: number) => {
		stateBonusIntro.tier = tier;
		const fadeInMs = bonusScreenAnimMs(BONUS_INTRO_FADE_MS);

		if (assetsReadyUnderBlack()) {
			playfieldTween.set(stateBonusIntro.playfieldAlpha, { duration: 0 });
			bgTween.set(stateBonusIntro.backgroundBlend, { duration: 0 });
			overlayTween.set(0, { duration: 0 });
			await Promise.all([
				overlayTween.set(1, { duration: fadeInMs }),
				context.eventEmitter.broadcastAsync({ type: 'blackScreenFadeOut' }),
			]);
			return;
		}

		await context.eventEmitter.broadcastAsync({ type: 'blackScreenFadeOut' });

		stateBonusIntro.active = true;
		playfieldTween.set(1, { duration: 0 });
		bgTween.set(0, { duration: 0 });
		overlayTween.set(0, { duration: 0 });
		stateBonusIntro.playfieldAlpha = 1;
		stateBonusIntro.backgroundBlend = 0;
		stateBonusIntro.overlayAlpha = 0;

		await Promise.all([
			playfieldTween.set(BONUS_INTRO_PLAYFIELD_DIM, { duration: fadeInMs }),
			bgTween.set(0, { duration: fadeInMs }),
			overlayTween.set(1, { duration: fadeInMs }),
		]);
	};

	const fadePresentationOut = async () => {
		const fadeMs = bonusScreenAnimMs(BONUS_INTRO_FADE_MS * 0.5);
		await Promise.all([
			overlayTween.set(0, { duration: fadeMs }),
			playfieldTween.set(1, { duration: fadeMs }),
		]);
		resetBonusIntroPresentation();
	};

	const resetIntro = async () => {
		await fadePresentationOut();
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
			pressReady = true;
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

	{#if stateBonusIntro.overlayAlpha > 0.02 && pressReady}
		<Container alpha={stateBonusIntro.overlayAlpha}>
			<PressToContinue variant="intro" onpress={() => oncomplete()} />
		</Container>
	{/if}
{/if}
