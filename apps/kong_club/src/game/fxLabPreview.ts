import { waitForTimeout } from 'utils-shared/wait';
import { stateBet } from 'state-shared';

import { setActiveBetModeKey } from './betModes';
import { stateFxLab } from './fxLab.svelte';
import { getGameActor } from './actor';
import {
	findFirstBookWithCoinKind,
	findFirstBookWithEvent,
	findFirstBookWithModeState,
	findFirstMadnessTriggerBook,
	setForcedNextBookIndex,
} from './localMathBooks';
import {
	cancelFxLabPreview,
	labWinBookAmount,
	mockClusterFloaters,
	mockCoinCellsBronze,
	mockCoinCellsFullBoard,
	mockCoinCellsGold,
	mockCoinCellsSilver,
	presentBoardFrameGlow,
	presentBonusChrome,
	presentClusterFloaters,
	presentClusterFloatersWithBoardRemount,
	presentCoinCollect,
	presentFeatureSpinChrome,
	presentFsCounter,
	presentCoinPowerSequence,
	presentSitBoard,
	presentFullActivationSequence,
	presentLitTiles,
	presentProgressFill,
	PROGRESS_THRESHOLD_BASE,
	resetFxLabPreview,
	runFxLabPreview,
	COIN_FACE_VALUES,
	COIN_POWER_MULTI_VALUES,
	COIN_POWER_MULTI_WEIGHTS,
} from './fxLabRunner';
import {
	buildCollectorPowerSequence,
	buildComboPowerSequence,
	buildMultiPowerSequence,
} from './fxLabCoinPowers';
import {
	beginCenterCountUp,
	resetSpinWinOverlay,
	spinWinOverlay,
	startSpinWinCountUp,
} from './spinWinOverlay.svelte';
import { fadeSpinWinDimIn, fadeSpinWinDimOut } from './spinWinDim.svelte';
import {
	getWinCountTierFromAmount,
	isMaxWinMultiplier,
	MAX_WIN_MULTIPLIER,
	shouldShowCenterWinCountUp,
} from './winCountTier';
	import { stopBaseGameMusic } from './baseGameMusic';
	import { stopFeatureSpinMusic } from './featureSpinMusic';
	import { playMaxWinMusic, stopMaxWinMusic } from './maxWinMusic';
import {
	WIN_COUNT_DIM_ALPHA,
	WIN_COUNT_FADE_OUT_MS,
	WIN_COUNT_HOLD_MS,
} from './winCountLayout';
import { pacedWinCountDurationMs } from './winPresentationTempo';
import { applyTierVisuals } from './winCelebrationFx';

export {
	resetFxLabPreview,
	cancelFxLabPreview,
	COIN_FACE_VALUES,
	COIN_POWER_MULTI_VALUES,
	COIN_POWER_MULTI_WEIGHTS,
};

const sticky = { sticky: true as const };

const holdCenterCountUpLab = async (multiplier: number) => {
	const target = labWinBookAmount(multiplier);
	if (!shouldShowCenterWinCountUp(target)) {
		if (import.meta.env.DEV) {
			console.warn(`[FxLab] ${multiplier}× is below center count-up threshold (50×)`);
		}
		return;
	}

	const tier = getWinCountTierFromAmount(target);
	const durationMs = pacedWinCountDurationMs(multiplier);

	resetSpinWinOverlay();
	spinWinOverlay.show = true;
	spinWinOverlay.targetDimAlpha = WIN_COUNT_DIM_ALPHA;
	spinWinOverlay.contentAlpha = 1;
	spinWinOverlay.labelScale = 1;
	spinWinOverlay.tier = tier;
	void fadeSpinWinDimIn();

	if (tier) applyTierVisuals(tier);

	const playMaxSong = isMaxWinMultiplier(multiplier);
	if (playMaxSong) {
		stopBaseGameMusic();
		stopFeatureSpinMusic();
		playMaxWinMusic();
	}

	const countUpPromise = beginCenterCountUp();
	spinWinOverlay.counting = true;
	startSpinWinCountUp(target, durationMs);

	try {
		await countUpPromise;
		await waitForTimeout(WIN_COUNT_HOLD_MS);
		void fadeSpinWinDimOut();
		await waitForTimeout(WIN_COUNT_FADE_OUT_MS);
		resetSpinWinOverlay();
	} finally {
		if (playMaxSong) stopMaxWinMusic();
	}
};

// ── Coins ───────────────────────────────────────────────────────────────────

export const previewCoinLitTiles = () =>
	runFxLabPreview('Lit tiles only', () => presentLitTiles(mockCoinCellsBronze()), sticky);

export const previewCoinBronze = () =>
	runFxLabPreview('Coin · bronze CB', () => presentCoinCollect(mockCoinCellsBronze()), sticky);

export const previewCoinSilver = () =>
	runFxLabPreview('Coin · silver CS', () => presentCoinCollect(mockCoinCellsSilver()), sticky);

export const previewCoinGold = () =>
	runFxLabPreview('Coin · gold CG', () => presentCoinCollect(mockCoinCellsGold()), sticky);

export const previewCoinFullBoard = () =>
	runFxLabPreview('Coin · full lit board', () => presentSitBoard(), sticky);

/** Mixed board showing all three tiers (bronze / silver / gold) at once. */
export const previewCoinAllTiers = () =>
	runFxLabPreview('Coin · all tiers', () => presentCoinCollect(mockCoinCellsFullBoard()), sticky);

export const previewCoinWithTotal = () =>
	runFxLabPreview('Coin + activation total', () =>
		presentCoinCollect(mockCoinCellsFullBoard(), { withActivationTotal: true }),
	);

export const previewFullActivation = () =>
	runFxLabPreview('Progress → coins', () => presentFullActivationSequence(mockCoinCellsBronze()), sticky);

// ── Coin powers (lab mocks; live books now emit MULTI + COLLECTOR) ───────────

export const previewPowerMulti = (multi?: number) =>
	runFxLabPreview(multi != null ? `Power · MULTI x${multi}` : 'Power · MULTI', () =>
		presentCoinPowerSequence(buildMultiPowerSequence({ multi })), sticky);

export const previewPowerCollector = () =>
	runFxLabPreview('Power · COLLECTOR', () =>
		presentCoinPowerSequence(buildCollectorPowerSequence()), sticky);

export const previewPowerCombo = () =>
	runFxLabPreview('Power · combo', () => presentCoinPowerSequence(buildComboPowerSequence()), sticky);

// ── Progress ────────────────────────────────────────────────────────────────

export const previewProgressStep = (value: number) =>
	runFxLabPreview(`Progress ${value}/${PROGRESS_THRESHOLD_BASE}`, () => presentProgressFill(value), sticky);

export const previewProgressFull = () => previewProgressStep(PROGRESS_THRESHOLD_BASE);

/** Stepped 0→5 so each tick punch is visible. */
export const previewProgressWalk = () =>
	runFxLabPreview('Progress flow 0→5', async () => {
		await presentProgressFill(0);
		await waitForTimeout(60);
		for (let step = 1; step <= PROGRESS_THRESHOLD_BASE; step += 1) {
			await presentProgressFill(step);
			await waitForTimeout(220);
		}
	}, sticky);

// ── Tiles ───────────────────────────────────────────────────────────────────

export const previewTilesBronze = () =>
	runFxLabPreview('Tiles · bronze', () => presentLitTiles(mockCoinCellsBronze()), sticky);

export const previewTilesSilver = () =>
	runFxLabPreview('Tiles · silver', () => presentLitTiles(mockCoinCellsSilver()), sticky);

export const previewTilesGold = () =>
	runFxLabPreview('Tiles · gold', () => presentLitTiles(mockCoinCellsGold()), sticky);

export const previewTilesFull = () =>
	runFxLabPreview('Tiles · full board', () => presentLitTiles(mockCoinCellsFullBoard()), sticky);

export const previewTilesAllTiers = () =>
	runFxLabPreview('Tiles · all tiers', () => presentLitTiles(mockCoinCellsFullBoard()), sticky);

// ── Clusters ────────────────────────────────────────────────────────────────

export const previewClusterFloaterOne = () =>
	runFxLabPreview('Cluster floater ×1', () => presentClusterFloaters(mockClusterFloaters('one')));

export const previewClusterFloatersMulti = () =>
	runFxLabPreview('Cluster floaters ×3', () =>
		presentClusterFloaters(mockClusterFloaters('multi')),
	);

export const previewClusterFloaterRemount = () =>
	runFxLabPreview('Cluster + board remount', () =>
		presentClusterFloatersWithBoardRemount(mockClusterFloaters('multi')),
	);

export const previewClusterSticky = () =>
	runFxLabPreview(
		'Cluster floaters sticky',
		() => presentClusterFloaters(mockClusterFloaters('multi')),
		sticky,
	);

// ── Bonus / mode ────────────────────────────────────────────────────────────

export const previewBonusHearChrome = () =>
	runFxLabPreview('Bonus chrome · Hear', () => presentBonusChrome(2), sticky);

export const previewFeatureSpinChrome = () =>
	runFxLabPreview('Feature Spin chrome', () => presentFeatureSpinChrome(), sticky);

export const previewFsCounterMid = () =>
	runFxLabPreview('FS counter 4/10', () => presentFsCounter(4), sticky);

export const previewFrameGlowOn = () =>
	runFxLabPreview('Frame glow ON', () => presentBoardFrameGlow(true), sticky);

export const previewFrameGlowOff = () =>
	runFxLabPreview('Frame glow OFF', () => presentBoardFrameGlow(false), sticky);

// ── Count-up ────────────────────────────────────────────────────────────────

export const previewCenterCountUp = (multiplier: number) =>
	runFxLabPreview(`Count-up ${multiplier}×`, () => holdCenterCountUpLab(multiplier));

export const previewCenterCountUp50 = () => previewCenterCountUp(50);
export const previewCenterCountUp150 = () => previewCenterCountUp(150);
export const previewCenterCountUp500 = () => previewCenterCountUp(500);
export const previewCenterCountUpMax = () => previewCenterCountUp(MAX_WIN_MULTIPLIER);

// ── Force books ─────────────────────────────────────────────────────────────

const forceBookAndSpin = async (mode: string, index: number | null, label: string) => {
	if (index == null) {
		if (import.meta.env.DEV) console.warn(`[FxLab] No book for ${label}`);
		return;
	}
	setActiveBetModeKey(mode);
	setForcedNextBookIndex(mode, index);
	if (import.meta.env.DEV) {
		console.info(`[FxLab] ${label} → mode=${stateBet.activeBetModeKey} book=${index}`);
	}
	getGameActor().send({ type: 'BET' });
	await waitForTimeout(100);
};

/** Real spins — sticky so finally does not wipe the live book. */
export const previewForceCoinActivationSpin = () =>
	runFxLabPreview(
		'Force coin-activation spin',
		async () => {
			const index = await findFirstBookWithEvent('base', 'boardActivation');
			await forceBookAndSpin('base', index, 'boardActivation');
		},
		sticky,
	);

export const previewForceAnticipationSpin = () =>
	runFxLabPreview(
		'Force 2+ ST tease',
		async () => {
			await forceBookAndSpin('base', 6, 'anticipation');
		},
		sticky,
	);

export const previewForceBonusSeeSpin = () =>
	runFxLabPreview(
		'Force See bonus book',
		async () => {
			const index =
				(await findFirstBookWithModeState('bonus_see', 'see')) ??
				(await findFirstBookWithEvent('bonus_see', 'freeSpinTrigger'));
			await forceBookAndSpin('bonus_see', index, 'bonus_see');
		},
		sticky,
	);

export const previewForceBonusHearSpin = () =>
	runFxLabPreview(
		'Force Hear bonus book',
		async () => {
			const index =
				(await findFirstBookWithModeState('bonus_hear', 'hear')) ??
				(await findFirstBookWithEvent('bonus_hear', 'freeSpinTrigger'));
			await forceBookAndSpin('bonus_hear', index, 'bonus_hear');
		},
		sticky,
	);

export const previewForceGambleHearSpin = () =>
	runFxLabPreview(
		'Force Gamble Hear book',
		async () => {
			const index =
				(await findFirstBookWithModeState('bonus_pick', 'start_bonus_hear')) ??
				(await findFirstBookWithModeState('bonus_gamble', 'start_bonus_hear'));
			await forceBookAndSpin('bonus_pick', index, 'bonus_pick hear');
		},
		sticky,
	);

export const previewForceBonusMadnessSpin = () =>
	runFxLabPreview(
		'Force 5 ST Madness',
		async () => {
			const hit = await findFirstMadnessTriggerBook();
			if (!hit) {
				if (import.meta.env.DEV) console.warn('[FxLab] No 5-scatter Madness trigger book');
				return;
			}
			await forceBookAndSpin(hit.mode, hit.index, `${hit.mode} start Madness`);
		},
		sticky,
	);

export const previewForceFeatureSpinBook = () =>
	runFxLabPreview(
		'Force Feature Spin book',
		async () => {
			const index = await findFirstBookWithEvent('feature_spin', 'boardActivation');
			await forceBookAndSpin('feature_spin', index, 'feature_spin');
		},
		sticky,
	);

export const previewForcePeakSpinBook = () =>
	runFxLabPreview(
		'Force TRIFECTA book',
		async () => {
			const index = await findFirstBookWithEvent('peak_spin', 'boardActivation');
			await forceBookAndSpin('peak_spin', index, 'peak_spin');
		},
		sticky,
	);

export const previewForceLiveMultiBook = () =>
	runFxLabPreview(
		'Force live MULTI book',
		async () => {
			const hit = await findFirstBookWithCoinKind('multiplier');
			if (!hit) {
				if (import.meta.env.DEV) console.warn('[FxLab] No live MULTI book in cache');
				return;
			}
			await forceBookAndSpin(hit.mode, hit.index, `MULTI ${hit.mode}#${hit.index}`);
		},
		sticky,
	);

export const previewForceLiveCollectorBook = () =>
	runFxLabPreview(
		'Force live COLLECTOR book',
		async () => {
			const hit = await findFirstBookWithCoinKind('collector');
			if (!hit) {
				if (import.meta.env.DEV) console.warn('[FxLab] No live COLLECTOR book in cache');
				return;
			}
			await forceBookAndSpin(hit.mode, hit.index, `COLLECTOR ${hit.mode}#${hit.index}`);
		},
		sticky,
	);

// ── Toolbar ─────────────────────────────────────────────────────────────────

export const previewToolbarPulse = () =>
	runFxLabPreview('Toolbar win flash', async () => {
		stateFxLab.forceToolbarWinPreview = true;
		const prev = stateBet.winBookEventAmount;
		const amount = labWinBookAmount(35);
		stateBet.winBookEventAmount = 0;
		await waitForTimeout(40);
		stateBet.winBookEventAmount = amount;
		await waitForTimeout(1600);
		stateBet.winBookEventAmount = prev;
		stateFxLab.forceToolbarWinPreview = false;
	});
