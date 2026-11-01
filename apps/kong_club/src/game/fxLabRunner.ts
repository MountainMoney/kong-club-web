import { waitForTimeout } from 'utils-shared/wait';
import { BOOK_AMOUNT_MULTIPLIER } from 'constants-shared/bet';

import type { SpinWinPresentLabOpts } from '../components/PaylineWinHighlight.svelte';
import type { RawWin } from '../components/ClusterWinAmount.svelte';
import { eventEmitter } from './eventEmitter';
import { stateGame } from './stateGame.svelte';
import {
	stateFxLab,
	bumpFxLabPreview,
	isFxLabActive,
	isFxLabSceneReady,
	requestFxLabEnterPlayfield,
	type FxLabRunnerStatus,
} from './fxLab.svelte';
import { resetWinCelebration } from './winCelebrationPresentation.svelte';
import {
	invalidateWinPresentation,
	resetSpinWinOverlay,
} from './spinWinOverlay.svelte';
import { stopWinScreenShake } from './winCelebrationShake';
import { stopWinCoinLoop } from './winCoinLoop';
import { stopMaxWinMusic } from './maxWinMusic';
import { setLabPaylineAmountMode } from './paylineWinAmount';
import { stateXstateDerived } from './stateXstate';
import {
	CLUSTER_WIN_FADE_MS,
	CLUSTER_WIN_HOLD_MS,
	CLUSTER_WIN_POP_MS,
} from './clusterConnectionTempo';
import {
	COIN_FACE_VALUES,
	COIN_POWER_MULTI_VALUES,
	COIN_POWER_MULTI_WEIGHTS,
	coinFeatureRevealDurationMs,
} from './coinFeatureNormalize';
import type { BookEventOfType, CoinFeatureItem } from './typesBookEvent';
import {
	emptyTileLevels,
	tileLevelToCoinSymbol,
	tileLevelToMultiplier,
	MAX_TILE_LEVEL,
} from './tileLevelVisual';
import { PROGRESS_THRESHOLD_BASE, PROGRESS_THRESHOLD_FEATURE } from './betModes';
import { presentBuyBonusFreeSpinEntry, BONUS_SPINS_TOTAL } from './freeSpinPresentation';
import {
	estimateFullWinBeatMs,
	getActivePacingPreset,
	pacedWinCountDurationMs,
} from './winPresentationTempo';
import { buildSitBoardSequence, tilesFromPowerCells, type LitCell } from './fxLabCoinPowers';
import { capWinMultiplier } from './winCountTier';

export type { LitCell };

export { COIN_POWER_MULTI_VALUES, COIN_POWER_MULTI_WEIGHTS };

export type RunFxLabOpts = {
	/** Leave tiles / coins / chrome on screen until Reset or next preview. */
	sticky?: boolean;
	/** Extra hold after fn before soft-end (non-sticky). */
	holdMs?: number;
};

let runningPreview = false;
let abortPreview = false;

type PresentWaiter = {
	resolve: () => void;
	reject: (err: Error) => void;
	timeoutId: ReturnType<typeof setTimeout>;
	labSession: number;
};

let presentWaiter: PresentWaiter | null = null;

const clearPresentWaiter = (err?: Error) => {
	if (!presentWaiter) return;
	clearTimeout(presentWaiter.timeoutId);
	if (err) presentWaiter.reject(err);
	else presentWaiter.resolve();
	presentWaiter = null;
};

eventEmitter.subscribe({
	spinWinPresentComplete: (e) => {
		if (presentWaiter && e.labSession === presentWaiter.labSession) {
			clearPresentWaiter();
		}
	},
});

const setRunnerStatus = (status: FxLabRunnerStatus, label = '') => {
	stateFxLab.runnerStatus = status;
	stateFxLab.runnerLabel = label;
	stateFxLab.stickyActive = status === 'sticky';
};

export const getPacingLabel = () => {
	const preset = getActivePacingPreset();
	const ms = pacedWinCountDurationMs(150);
	return `${preset} · 150× count-up ≈ ${(ms / 1000).toFixed(1)}s`;
};

export const isFxLabPreviewBlocked = () =>
	!stateXstateDerived.isIdle() && stateGame.gameType === 'basegame';

const waitForSceneReady = async (timeoutMs = 4000) => {
	const start = performance.now();
	while (performance.now() - start < timeoutMs) {
		if (abortPreview) return false;
		// Shell + coin/payline presenters (mount only after intro is dismissed).
		if (stateFxLab.gameShellReady && stateFxLab.paylinePresenterReady) return true;
		if (stateFxLab.gameShellReady && performance.now() - start > 1500) {
			// Presenter mark can lag; shell ready is enough to proceed after a beat.
			return true;
		}
		await waitForTimeout(100);
	}
	return isFxLabSceneReady();
};

const interruptWinPresentation = () => {
	invalidateWinPresentation();
	eventEmitter.broadcast({ type: 'paylineWinSkip' });
	eventEmitter.broadcast({ type: 'paylineWinHide' });
};

/** Hard reset all lab-driven scene state. */
export const resetFxLabPreview = () => {
	abortPreview = true;
	clearPresentWaiter(new Error('FX Lab reset'));
	stateFxLab.mockTeaseActive = false;
	stateFxLab.boardFrameGlowPreview = false;
	stateFxLab.amountFloatPreview = false;
	stateFxLab.forceToolbarWinPreview = false;
	stateFxLab.forceShowPowerLabels = false;
	stateFxLab.stickyActive = false;
	stopWinScreenShake();
	resetWinCelebration();
	resetSpinWinOverlay();
	eventEmitter.broadcast({ type: 'boardFrameGlowHide' });
	eventEmitter.broadcast({ type: 'hideClusterWinAmounts' });
	eventEmitter.broadcast({ type: 'monkeyTilesClear' });
	eventEmitter.broadcast({ type: 'monkeyMechanicsReset', instant: true });
	eventEmitter.broadcast({ type: 'freeSpinCounterHide' });
	interruptWinPresentation();
	stopWinCoinLoop();
	stopMaxWinMusic();
	setLabPaylineAmountMode(null);
	stateGame.gameType = 'basegame';
	stateGame.sessionBonusTier = undefined;
	eventEmitter.broadcast({ type: 'boardShow' });
	void eventEmitter.broadcastAsync({ type: 'uiShow' });
};

const softEndPreview = () => {
	clearPresentWaiter();
	stateFxLab.amountFloatPreview = false;
	stateFxLab.forceToolbarWinPreview = false;
	stopWinCoinLoop();
};

export const labWinBookAmount = (multiplier: number) =>
	BOOK_AMOUNT_MULTIPLIER * capWinMultiplier(multiplier);

// ── Cluster floaters ────────────────────────────────────────────────────────

export const mockClusterFloaters = (count: 'one' | 'multi'): RawWin[] => {
	if (count === 'one') {
		return [{ amount: labWinBookAmount(8), reel: 2, row: 3 }];
	}
	return [
		{ amount: labWinBookAmount(5), reel: 1, row: 2 },
		{ amount: labWinBookAmount(12), reel: 3, row: 3 },
		{ amount: labWinBookAmount(20), reel: 4, row: 4 },
	];
};

const clusterFloaterHoldMs = () =>
	CLUSTER_WIN_POP_MS + CLUSTER_WIN_HOLD_MS + CLUSTER_WIN_FADE_MS + 120;

export const presentClusterFloaters = async (wins: RawWin[]) => {
	eventEmitter.broadcast({ type: 'hideClusterWinAmounts' });
	await waitForTimeout(40);
	void eventEmitter.broadcastAsync({ type: 'showClusterWinAmounts', wins });
	await waitForTimeout(clusterFloaterHoldMs());
};

export const presentClusterFloatersWithBoardRemount = async (wins: RawWin[]) => {
	eventEmitter.broadcast({ type: 'hideClusterWinAmounts' });
	await waitForTimeout(40);
	void eventEmitter.broadcastAsync({ type: 'showClusterWinAmounts', wins });
	await waitForTimeout(80);
	eventEmitter.broadcast({ type: 'boardHide' });
	await waitForTimeout(60);
	eventEmitter.broadcast({ type: 'boardShow' });
	await waitForTimeout(clusterFloaterHoldMs());
};

// ── Tiles / coins ───────────────────────────────────────────────────────────

const tilesFromCells = (cells: LitCell[]) => {
	const tileLevels = emptyTileLevels();
	const tileMultipliers = emptyTileLevels();
	for (const cell of cells) {
		const level = Math.min(Math.max(cell.level, 0), MAX_TILE_LEVEL);
		tileLevels[cell.reel]![cell.row] = level;
		tileMultipliers[cell.reel]![cell.row] = tileLevelToMultiplier(level);
	}
	return { tileLevels, tileMultipliers };
};

const coinItemFromCell = (cell: LitCell, faceIndex: number): CoinFeatureItem => {
	const symbol = tileLevelToCoinSymbol(cell.level) ?? 'CB';
	const pool = COIN_FACE_VALUES[symbol];
	const face = pool[faceIndex % pool.length]!;
	return {
		reel: cell.reel,
		row: cell.row,
		kind: 'coin',
		symbol,
		value: face,
		displayValue: face,
		tileLevel: cell.level,
		tileMultiplier: 1,
		resolvedValue: face,
		payout: face,
		round: 1,
	};
};

export const mockCoinCellsBronze = (): LitCell[] => [
	{ reel: 1, row: 1, level: 1 },
	{ reel: 1, row: 2, level: 1 },
	{ reel: 2, row: 1, level: 1 },
	{ reel: 2, row: 2, level: 1 },
	{ reel: 3, row: 2, level: 1 },
	{ reel: 3, row: 3, level: 1 },
];

export const mockCoinCellsSilver = (): LitCell[] => [
	{ reel: 1, row: 1, level: 2 },
	{ reel: 2, row: 2, level: 2 },
	{ reel: 3, row: 1, level: 2 },
	{ reel: 3, row: 3, level: 2 },
	{ reel: 4, row: 2, level: 2 },
	{ reel: 4, row: 3, level: 2 },
];

export const mockCoinCellsGold = (): LitCell[] => [
	{ reel: 1, row: 2, level: 3 },
	{ reel: 2, row: 1, level: 3 },
	{ reel: 2, row: 3, level: 3 },
	{ reel: 3, row: 2, level: 3 },
	{ reel: 4, row: 2, level: 3 },
	{ reel: 5, row: 2, level: 3 },
];

export const mockCoinCellsFullBoard = (): LitCell[] => {
	const cells: LitCell[] = [];
	for (let reel = 0; reel < 6; reel += 1) {
		for (let row = 0; row < 5; row += 1) {
			const level = reel < 2 ? 1 : reel < 4 ? 2 : 3;
			cells.push({ reel, row, level });
		}
	}
	return cells;
};

/** Classic 3 ranks only (Bronze / Silver / Gold). */
export const mockCoinCellsLadder = (): LitCell[] => [
	{ reel: 1, row: 2, level: 1 },
	{ reel: 2, row: 2, level: 2 },
	{ reel: 3, row: 2, level: 3 },
];

export const presentLitTiles = async (cells: LitCell[]) => {
	const { tileLevels, tileMultipliers } = tilesFromCells(cells);
	eventEmitter.broadcast({
		type: 'monkeyTilesUpdate',
		payload: {
			index: 0,
			type: 'updateLevelUpTiles',
			tileLevels,
			tileMultipliers,
			gameType: stateGame.gameType,
			mode: 'base',
		},
	});
	await waitForTimeout(200);
};

export const presentProgressFill = async (
	value: number,
	threshold = PROGRESS_THRESHOLD_BASE,
	mode: 'base' | 'feature_spin' = 'base',
) => {
	eventEmitter.broadcast({
		type: 'monkeyProgressUpdate',
		payload: {
			index: 0,
			type: 'progressFill',
			value: Math.min(value, threshold),
			threshold,
			mode,
			activationCount: value >= threshold ? 1 : 0,
		},
	});
	await waitForTimeout(200);
};

export const presentCoinCollect = async (
	cells: LitCell[],
	opts?: { withActivationTotal?: boolean },
) => {
	const { tileLevels, tileMultipliers } = tilesFromCells(cells);
	const items = cells.map((cell, i) => coinItemFromCell(cell, i));
	const faceSum = items.reduce((sum, item) => sum + (item.value ?? 0), 0);
	const activationWin = labWinBookAmount(faceSum);

	await presentLitTiles(cells);
	await presentProgressFill(PROGRESS_THRESHOLD_BASE);

	const payload: BookEventOfType<'boardActivation'> = {
		index: 0,
		type: 'boardActivation',
		activationWin,
		tileMultipliers,
		tileLevels,
		coinFeature: {
			totalPayout: faceSum,
			rounds: 1,
			items,
		},
	};

	await eventEmitter.broadcastAsync({
		type: 'monkeyBoardActivation',
		payload,
	});

	// Production reveal duration is informational; lab keeps faces until Reset.
	if (!opts?.withActivationTotal) {
		await waitForTimeout(200);
	} else {
		const revealMs = coinFeatureRevealDurationMs(payload.coinFeature, tileMultipliers);
		await waitForTimeout(Math.min(revealMs, 1800));
	}

	if (opts?.withActivationTotal) {
		await presentMockSpinWin({
			multiplier: Math.max(faceSum, 50),
			lines: [],
			lab: { skipCenterOverlay: false, fullWinBeat: true },
		});
	}
};

/** Animate progress 0→5 then fire coin collect on the lit board. */
export const presentFullActivationSequence = async (cells: LitCell[]) => {
	for (let step = 1; step <= PROGRESS_THRESHOLD_BASE; step += 1) {
		if (abortPreview) return;
		await presentProgressFill(step);
		await waitForTimeout(280);
	}
	await presentCoinCollect(cells);
};

/** Lab-only multi-round power activation (MULTI / COLLECTOR). */
export const presentCoinPowerSequence = async (pack: {
	cells: LitCell[];
	items: CoinFeatureItem[];
	totalPayout: number;
}) => {
	const { tileLevels, tileMultipliers } = tilesFromPowerCells(pack.cells);
	const activationWin = labWinBookAmount(Math.max(pack.totalPayout, 1));

	await presentLitTiles(pack.cells);
	await presentProgressFill(PROGRESS_THRESHOLD_BASE);

	const payload: BookEventOfType<'boardActivation'> = {
		index: 0,
		type: 'boardActivation',
		activationWin,
		tileMultipliers,
		tileLevels,
		coinFeature: {
			totalPayout: pack.totalPayout,
			rounds: Math.max(...pack.items.map((item) => item.round ?? 1), 1),
			items: pack.items,
		},
	};

	await eventEmitter.broadcastAsync({
		type: 'monkeyBoardActivation',
		payload,
	});

	const revealMs = coinFeatureRevealDurationMs(payload.coinFeature, tileMultipliers);
	await waitForTimeout(Math.min(revealMs + 200, 8000));
};

/** Sticky sit board: coins, pots, and MULTI xN — no collect, faces stay for sliders. */
export const presentSitBoard = async () => {
	stateFxLab.forceShowPowerLabels = true;
	const pack = buildSitBoardSequence();
	const { tileLevels, tileMultipliers } = tilesFromPowerCells(pack.cells);
	const activationWin = labWinBookAmount(Math.max(pack.totalPayout, 1));

	await presentLitTiles(pack.cells);
	await presentProgressFill(PROGRESS_THRESHOLD_BASE);

	await eventEmitter.broadcastAsync({
		type: 'monkeyBoardActivation',
		payload: {
			index: 0,
			type: 'boardActivation',
			activationWin,
			tileMultipliers,
			tileLevels,
			coinFeature: {
				totalPayout: pack.totalPayout,
				rounds: 1,
				items: pack.items,
			},
		},
	});

	await waitForTimeout(400);
};

// ── Bonus / mode chrome ─────────────────────────────────────────────────────

export const presentBonusChrome = async (tier: 1 | 2) => {
	await presentBuyBonusFreeSpinEntry({ tier });
	eventEmitter.broadcast({
		type: 'monkeyModeState',
		payload: {
			index: 0,
			type: 'kongClubMode',
			state: 'start_bonus_hear',
			mode: 'bonus_hear',
			gameType: 'freegame',
		},
	});
	eventEmitter.broadcast({
		type: 'freeSpinCounterUpdate',
		current: 1,
		total: BONUS_SPINS_TOTAL,
	});
	await waitForTimeout(300);
};

export const presentFeatureSpinChrome = async () => {
	stateGame.gameType = 'basegame';
	eventEmitter.broadcast({
		type: 'monkeyModeState',
		payload: {
			index: 0,
			type: 'kongClubMode',
			state: 'feature_spin',
			mode: 'feature_spin',
			gameType: 'basegame',
		},
	});
	await presentProgressFill(
		PROGRESS_THRESHOLD_FEATURE,
		PROGRESS_THRESHOLD_FEATURE,
		'feature_spin',
	);
};

export const presentFsCounter = async (current: number, total = BONUS_SPINS_TOTAL) => {
	if (stateGame.gameType !== 'freegame') {
		await presentBonusChrome(1);
	}
	eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
	eventEmitter.broadcast({ type: 'freeSpinCounterUpdate', current, total });
	await waitForTimeout(400);
};

export const presentBoardFrameGlow = async (on: boolean) => {
	stateFxLab.boardFrameGlowPreview = on;
	eventEmitter.broadcast({ type: on ? 'boardFrameGlowShow' : 'boardFrameGlowHide' });
	await waitForTimeout(300);
};

// ── Win overlay ─────────────────────────────────────────────────────────────

type MockSpinLine = {
	win: number;
	lineIndex: number;
	positions: { reel: number; row: number }[];
};

export const presentMockWin = (multiplier: number, lab?: SpinWinPresentLabOpts) =>
	presentMockSpinWin({ multiplier, lines: [], lab });

const presentMockSpinWin = ({
	multiplier,
	lines,
	lab,
}: {
	multiplier: number;
	lines: MockSpinLine[];
	lab?: SpinWinPresentLabOpts;
}) =>
	new Promise<void>((resolve, reject) => {
		if (!isFxLabActive()) {
			reject(new Error('FX Lab not active'));
			return;
		}

		const timeoutMs =
			lab?.forceSlowCrawl || lab?.fullWinBeat
				? estimateFullWinBeatMs(multiplier) + 2000
				: pacedWinCountDurationMs(multiplier) + 12000;

		const labSession = stateFxLab.previewGeneration;
		clearPresentWaiter(new Error('superseded'));
		presentWaiter = {
			resolve: () => resolve(),
			reject,
			labSession,
			timeoutId: setTimeout(() => {
				if (presentWaiter?.labSession === labSession) {
					presentWaiter = null;
					reject(new Error(`Win presentation timed out (${multiplier}×)`));
				}
			}, timeoutMs),
		};

		const totalWin = labWinBookAmount(multiplier);
		eventEmitter.broadcast({
			type: 'spinWinPresent',
			totalWin,
			lines,
			lab: { ...lab, labSession },
		});
	});

// ── Runner ──────────────────────────────────────────────────────────────────

export const runFxLabPreview = async (
	label: string,
	fn: () => Promise<void>,
	opts: RunFxLabOpts = {},
) => {
	if (!isFxLabActive()) return;

	if (runningPreview) {
		resetFxLabPreview();
		await waitForTimeout(100);
	} else if (stateFxLab.stickyActive) {
		// Clear previous sticky scene before a new preview.
		resetFxLabPreview();
		await waitForTimeout(80);
	}

	if (isFxLabPreviewBlocked()) {
		setRunnerStatus('blocked', 'Wait for spin to finish');
		return;
	}

	if (!stateFxLab.gameShellReady) {
		setRunnerStatus('running', 'Entering playfield…');
		requestFxLabEnterPlayfield();
	}
	if (!(await waitForSceneReady(6000))) {
		setRunnerStatus('blocked', 'Press Continue first');
		return;
	}

	runningPreview = true;
	abortPreview = false;
	interruptWinPresentation();
	eventEmitter.broadcast({ type: 'hideClusterWinAmounts' });
	await waitForTimeout(40);
	abortPreview = false;
	bumpFxLabPreview();
	setRunnerStatus('running', label);

	try {
		await fn();
		if (opts.holdMs && opts.holdMs > 0 && !opts.sticky) {
			await waitForTimeout(opts.holdMs);
		}
	} catch (err) {
		if (import.meta.env.DEV) console.warn('[FxLab]', label, err);
	} finally {
		abortPreview = true;
		runningPreview = false;
		if (opts.sticky) {
			softEndPreview();
			abortPreview = false;
			setRunnerStatus('sticky', `${label} · sticky — Reset when done`);
		} else {
			resetFxLabPreview();
			abortPreview = false;
			setRunnerStatus(isFxLabPreviewBlocked() ? 'blocked' : 'ready');
		}
	}
};

export const cancelFxLabPreview = () => {
	resetFxLabPreview();
	runningPreview = false;
	abortPreview = false;
	if (!stateFxLab.gameShellReady) {
		setRunnerStatus('blocked', 'Press Continue first');
	} else if (isFxLabPreviewBlocked()) {
		setRunnerStatus('blocked', 'Wait for spin to finish');
	} else {
		setRunnerStatus('ready');
	}
};

export { COIN_FACE_VALUES, PROGRESS_THRESHOLD_BASE, MAX_TILE_LEVEL };
