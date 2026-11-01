<script lang="ts">
	import { onMount } from 'svelte';
	import { Container, Graphics, Sprite, Text } from 'pixi-svelte';
	import { BOOK_AMOUNT_MULTIPLIER } from 'constants-shared/bet';
	import { stateBet } from 'state-shared';

	import BoardContainer from './BoardContainer.svelte';
	import BoardMask from './BoardMask.svelte';
	import SymbolSpine from './SymbolSpine.svelte';
	import SymbolSprite from './SymbolSprite.svelte';
	import { BOARD_DIMENSIONS, SYMBOL_SIZE, zIndexes } from '../game/constants';
	import { COIN_ART, coinFaceDigitCount, coinFaceLabelOffset } from '../game/symbolSpriteLayout';
	import { getSymbolInfo, getSymbolX } from '../game/utils';
	import { stateGame } from '../game/stateGame.svelte';
	import { getContext } from '../game/context';
	import { eventEmitter } from '../game/eventEmitter';
	import { markCenterWinPopupShown } from '../game/bookEventHandlerMap';
	import {
		CENTER_WIN_COUNT_UP_MIN_MULTIPLIER,
		MAX_WIN_MULTIPLIER,
		capBookAmount,
		capPotToBoard,
		capWinMultiplier,
		isBoardAtMaxWin,
		leftoverCoinSum,
		maxWinBookAmount,
	} from '../game/winCountTier';
	import {
		coinFeatureGridItems,
		coinFeaturePaidTotal,
		coinOverlayLabel,
		ensurePrizesOnLitTiles,
		formatCoinFaceLabel,
		normalizeCoinFeatureItems,
	} from '../game/coinFeatureNormalize';
	import {
		beginCoinFeatureDim,
		beginPreCoinShrink,
		clearCoinCellCover,
		isHeldBoardDismissActive,
		tryFinishHeldBoardDismiss,
		PRE_COIN_SHRINK_MS,
		releaseCoinCellCover,
		setCoinCellCover,
	} from '../game/coinFeatureCover.svelte';
	import { getLastTileLevels } from '../game/lastTileLevels';
	import { scaleFeatureMs } from '../game/winPresentationTempo';
	import {
		markFxLabPresenterReady,
		getActiveCoinFaceStyle,
		getCoinDigitLab,
		getCoinCharLab,
		isFxLabActive,
		stateFxLab,
	} from '../game/fxLab.svelte';
	import { ensurePrizeNumberFont } from '../game/introFont';
	import { PRIZE_NUMBER_FONT, PRIZE_NUMBER_WEIGHT } from '../game/prizeNumberFont';
	import { coinMetalForFace, tileLevelToCoinSymbol } from '../game/tileLevelVisual';
	import { isHeldFeatureBoardMode } from '../game/betModes';
	import CoinFaceNumber from './CoinFaceNumber.svelte';
	import CoinShine from './CoinShine.svelte';
	import type { CoinFeatureItem } from '../game/typesBookEvent';

	type ActiveReveal = CoinFeatureItem & {
		key: string;
		spawnAt: number;
		pulseAt: number;
		/** Coin/pot sprite fades in place after its number bolts to the sack. */
		drainStart?: number;
		drainDelay?: number;
		hideLabel?: boolean;
		/** Running sack total while numbers land (0 until first hit). */
		potShown?: number;
		/** MULTI: xN pops after hollow spawn + eye fade. */
		showMultiLabel?: boolean;
		multiLabelAt?: number;
		/** Hollow → green/yellow/red eye fade. */
		eyeTone?: 'green' | 'yellow' | 'red';
		eyeFadeAt?: number;
		/** Next face waiting for a distribute bolt to land. */
		pending?: CoinFeatureItem;
		/** False while the blank-coin wave is on; true after the face flip. */
		showFace?: boolean;
		/** When the face number may appear (staggered TL→BR after blank coins). */
		faceAt?: number;
		/** When this cell scales out after numbers have flown to the sack. */
		clearAt?: number;
		/** Exaggerated overshoot pop (MULTI xN, or a face that just got multiplied). */
		xnPop?: boolean;
	};

	type Motion = {
		x: number;
		y: number;
		scale: number;
		alpha: number;
		labelScale: number;
		labelAlpha?: number;
		eyeAlpha?: number;
		showLabel?: boolean;
	};

	type Bolt = {
		key: string;
		fromReel: number;
		fromRow: number;
		toReel: number;
		toRow: number;
		toX?: number;
		toY?: number;
		startAt: number;
		duration: number;
		label: string;
		tone: 'multi' | 'collect' | 'face';
		eyeTone?: 'green' | 'yellow' | 'red';
		/** Coin metal for face bolts using CoinFaceNumber. */
		symbol?: string;
		/** Leftover gather: fly into the board center. */
		arcToCenter?: boolean;
		ctrlX?: number;
		ctrlY?: number;
	};

	const context = getContext();
	/** Coin spawn + number sweep — top-left → bottom-right. */
	const WAVE_DIAG_MS = 150;
	const NUMBER_WAVE_MS = 90;
	const FACE_POP_MS = 340;
	const HOLD_AFTER_NUMBERS_MS = 120;
	const HOLD_AFTER_SPAWN_MS = 200;
	const EYE_FADE_MS = 300;
	const HOLD_AFTER_EYES_MS = 70;
	const HOLD_AFTER_XN_MS = 160;
	const XN_POP_MS = 360;
	/** Pot face ≥ 100×: overshoot, then slam back to rest. */
	const POT_SMACK_MS = 440;
	const POT_SMACK_MIN = 100;
	const HOLD_AFTER_MULTI_MS = 260;
	const HOLD_AFTER_UPDATE_MS = 1100;
	const VACUUM_MS = 420;
	const VACUUM_STAGGER_MS = 80;
	const CLEAR_MS = 220;
	const HOLD_AFTER_VACUUM_MS = 280;
	const HOLD_AFTER_MAX_WIN_POT_MS = 360;
	const HOLD_AFTER_COLLECT_MS = 640;
	/** After a 50×+ coin-feature win, leave the board up so the player can read it. */
	const HOLD_AFTER_BIG_WIN_BOARD_MS = 1800;
	const COLLECT_STAGGER_MS = 95;
	/** Leftover faces meet in the middle — hard 1s, not turbo-scaled. */
	const GATHER_MS = 1000;
	const GATHER_FADE_START = 0.28;
	const GATHER_END_SCALE = 0.55;
	const GATHER_BEND = SYMBOL_SIZE * 0.55;
	const GATHER_CTRL_LIFT = SYMBOL_SIZE * 0.35;
	const GATHER_STAGGER_MS = 180;
	const GATHER_DURATION_JITTER_MS = 140;
	const ROUND_GAP_MS = 220;
	const POP_MS = 520;
	const PULSE_MS = 280;
	const BOLT_MS = 260;
	const BOLT_STAGGER_MS = 50;
	const ADJACENT_8: Array<[number, number]> = [
		[-1, -1],
		[-1, 0],
		[-1, 1],
		[0, -1],
		[0, 1],
		[1, -1],
		[1, 0],
		[1, 1],
	];

	let activeReveals = $state<ActiveReveal[]>([]);
	const leaving = $derived(isHeldBoardDismissActive());
	let motions = $state<Record<string, Motion>>({});
	let bolts = $state<Bolt[]>([]);
	let boltMotions = $state<Record<string, Motion>>({});
	let hideTimer: ReturnType<typeof setTimeout> | undefined;
	let pendingWaits = new Set<() => void>();
	let raf = 0;
	let revealComplete: (() => void) | null = null;
	let runToken = 0;
	let fontReady = $state(false);
	let collectTotal = $state(0);
	let showCollectTotal = $state(false);
	/** Book coin-feature pay (pots + leftover coins). Overlay must count to this. */
	let featurePaidTotal = 0;
	/** One center count-up per reveal — MULTI/vacuum must not also fire leftover collect. */
	let winPresentedThisReveal = false;

	onMount(() => {
		void ensurePrizeNumberFont().then(() => {
			fontReady = true;
		});
	});

	const cellKey = (item: Pick<CoinFeatureItem, 'reel' | 'row'>) => `${item.reel}:${item.row}`;

	const coverWithPots = (positions: Array<{ reel: number; row: number }>) => {
		setCoinCellCover([
			...positions,
			...activeReveals
				.filter((reveal) => reveal.kind === 'collector')
				.map((reveal) => ({ reel: reveal.reel, row: reveal.row })),
		]);
	};

	const potCell = (item: Pick<CoinFeatureItem, 'kind'>) => item.kind === 'collector';

	const isDrained = (prev: ActiveReveal | undefined) =>
		!!prev && (prev.collected === true || prev.drainStart != null);

	const sameSittingClover = (
		item: Pick<CoinFeatureItem, 'kind' | 'reactivate'>,
		prev: ActiveReveal | undefined,
	) =>
		item.kind === 'multiplier' &&
		prev?.kind === 'multiplier' &&
		!item.reactivate &&
		!prev.collected &&
		prev.drainStart == null;

	const cloverVisuals = (
		item: Pick<CoinFeatureItem, 'kind' | 'reactivate'>,
		prev: ActiveReveal | undefined,
	) => {
		if (item.kind === 'multiplier' && isFxLabActive() && stateFxLab.forceShowPowerLabels) {
			return {
				showMultiLabel: true,
				multiLabelAt: prev?.multiLabelAt,
				eyeTone: prev?.eyeTone ?? ('green' as const),
				eyeFadeAt: prev?.eyeFadeAt,
			};
		}
		if (item.kind === 'multiplier' && !sameSittingClover(item, prev)) {
			return {
				showMultiLabel: false,
				multiLabelAt: undefined as number | undefined,
				eyeTone: undefined as ActiveReveal['eyeTone'],
				eyeFadeAt: undefined as number | undefined,
			};
		}
		return {
			showMultiLabel: prev?.showMultiLabel ?? false,
			multiLabelAt: prev?.multiLabelAt,
			eyeTone: prev?.eyeTone,
			eyeFadeAt: prev?.eyeFadeAt,
		};
	};

	const keepExistingPot = (item: CoinFeatureItem, prev: ActiveReveal | undefined) => {
		if (item.collected) return null;
		if (prev?.kind === 'collector' && !prev.collected && item.kind !== 'collector') return prev;
		return null;
	};

	const retainMissingPots = (
		next: ActiveReveal[],
		prevList: ActiveReveal[],
		collectedKeys?: Set<string>,
	) => {
		const occupied = new Set(next.map((reveal) => cellKey(reveal)));
		const gone = collectedKeys ?? new Set<string>();
		const missing = prevList.filter(
			(reveal) =>
				reveal.kind === 'collector' &&
				!reveal.collected &&
				!occupied.has(cellKey(reveal)) &&
				!gone.has(cellKey(reveal)),
		);
		return missing.length > 0 ? [...next, ...missing] : next;
	};

	const columnOrder = (
		a: Pick<CoinFeatureItem, 'reel' | 'row'>,
		b: Pick<CoinFeatureItem, 'reel' | 'row'>,
	) => a.reel - b.reel || a.row - b.row;

	const waveIndex = (item: Pick<CoinFeatureItem, 'reel' | 'row'>) => item.reel + item.row;

	const waveOrder = (
		a: Pick<CoinFeatureItem, 'reel' | 'row'>,
		b: Pick<CoinFeatureItem, 'reel' | 'row'>,
	) => waveIndex(a) - waveIndex(b) || a.reel - b.reel || a.row - b.row;

	const homePos = (reel: number, row: number) => ({
		x: getSymbolX(reel),
		y: (row + 0.5) * SYMBOL_SIZE,
	});

	const reelCellY = (reel: number, row: number) => {
		const symbol = stateGame.board[reel]?.reelState.symbols.find(
			(reelSymbol) => reelSymbol.symbolIndexOfBoard === row,
		);
		return symbol?.symbolY.current ?? homePos(reel, row).y;
	};

	const boardCenterPos = () => ({
		x: SYMBOL_SIZE * 3,
		y: SYMBOL_SIZE * 2.5,
	});

	const gatherUnitHash = (reel: number, row: number, salt: number) => {
		const n = ((reel + 1) * 73856093) ^ ((row + 1) * 19349663) ^ (salt * 83492791);
		return ((n >>> 0) % 1000) / 999;
	};

	const gatherControl = (from: { x: number; y: number }, to: { x: number; y: number }, reel: number, row: number) => {
		const dx = to.x - from.x;
		const dy = to.y - from.y;
		const len = Math.hypot(dx, dy) || 1;
		const px = -dy / len;
		const py = dx / len;
		const bend = (gatherUnitHash(reel, row, 1) * 2 - 1) * GATHER_BEND;
		const lift = (gatherUnitHash(reel, row, 2) * 2 - 1) * GATHER_CTRL_LIFT;
		return {
			x: (from.x + to.x) / 2 + px * bend,
			y: (from.y + to.y) / 2 + py * bend + lift,
		};
	};

	const isAdjacent8 = (a: { reel: number; row: number }, b: { reel: number; row: number }) =>
		ADJACENT_8.some(([dr, dc]) => a.reel + dr === b.reel && a.row + dc === b.row);

	const isPower = (item: CoinFeatureItem) =>
		item.kind === 'multiplier' || item.kind === 'collector' || item.kind === 'tier_shift';

	const displaySymbol = (item: CoinFeatureItem) => {
		if (item.symbol === 'CB' || item.symbol === 'CS' || item.symbol === 'CG') {
			return item.symbol;
		}
		return tileLevelToCoinSymbol(item.tileLevel) ?? 'CB';
	};

	const faceNumberSymbol = (item: CoinFeatureItem & { eyeTone?: 'green' | 'yellow' | 'red' }) => {
		if (item.kind === 'multiplier') {
			const tone = item.eyeTone ?? multiEyeTone(item.value);
			return tone === 'yellow' ? 'XM_yellow' : tone === 'red' ? 'XM_red' : 'XM_green';
		}
		if (item.kind === 'collector') return 'CG';
		return displaySymbol(item);
	};

	const powerColors = (kind: CoinFeatureItem['kind']) => {
		if (kind === 'multiplier') return { fill: 0x1b5e20, stroke: 0x69f0ae, label: 0xffffff };
		if (kind === 'collector') return { fill: 0xe65100, stroke: 0xffe082, label: 0xfff4c2 };
		if (kind === 'tier_shift') return { fill: 0x6b3fd6, stroke: 0xd4b8ff, label: 0xf0e8ff };
		return { fill: 0x5a3a18, stroke: 0xffe066, label: 0xfff4c2 };
	};

	const collectorTotal = (item: CoinFeatureItem) =>
		item.resolvedValue ?? item.payout ?? item.displayValue ?? 0;

	const leftoverOnBoard = (
		items: Array<{
			kind?: string;
			collected?: boolean;
			pending?: { kind?: string; displayValue?: number; value?: number; payout?: number };
			displayValue?: number;
			value?: number;
			payout?: number;
		}> = activeReveals,
	) =>
		leftoverCoinSum(
			items.map((item) => {
				if (item.kind !== 'coin' || item.collected || !item.pending) return item;
				return { ...item, ...item.pending };
			}),
		);

	const capPotFace = (value: number, leftover = leftoverOnBoard()) => capPotToBoard(value, leftover);

	const potFaceOf = (
		item: {
			potShown?: number;
			resolvedValue?: number;
			payout?: number;
			displayValue?: number;
			value?: number;
		},
	) =>
		capWinMultiplier(
			Math.max(
				0,
				Math.round(
					Number(item.potShown ?? item.resolvedValue ?? item.payout ?? item.displayValue ?? item.value ?? 0) ||
						0,
				),
			),
		);

	const withPotFace = <T extends Record<string, unknown>>(item: T, face: number) => {
		const n = capPotFace(face);
		return {
			...item,
			potShown: n,
			value: n,
			displayValue: n,
			resolvedValue: n,
			payout: n,
		};
	};

	const sittingPotMax = () =>
		activeReveals
			.filter((reveal) => reveal.kind === 'collector' && !reveal.collected)
			.reduce((max, reveal) => Math.max(max, potFaceOf(reveal)), 0);

	const leftoverAtCap = () => leftoverOnBoard() >= MAX_WIN_MULTIPLIER;

	const boardAtMaxWin = () => isBoardAtMaxWin(leftoverOnBoard(), sittingPotMax());

	/** 10k leftover path: same center gather as a normal end collect. */
	const collectTowardMaxWin = async (token: number) => playDefaultCollect(token);

	const isMaxWinPot = (value: number) => value >= MAX_WIN_MULTIPLIER;

	const presentSpinWinOnce = async (
		token: number,
		bookAmount: number,
		opts?: { amountOnly?: boolean },
	) => {
		if (token !== runToken || winPresentedThisReveal) return false;
		winPresentedThisReveal = true;
		markCenterWinPopupShown(bookAmount);
		await eventEmitter.broadcastAsync({
			type: 'spinWinPresent',
			totalWin: bookAmount,
			lines: [],
			...(opts?.amountOnly ? { lab: { amountOnly: true } } : {}),
		});
		return token === runToken;
	};

	const powerSpriteKey = (item: CoinFeatureItem & { potShown?: number }): 'XM' | 'CL' | 'CL_empty' | null => {
		if (item.kind === 'multiplier') return 'XM';
		if (item.kind === 'collector') {
			if (item.collected) return null;
			const total = item.potShown ?? collectorTotal(item);
			return total > 0 ? 'CL' : 'CL_empty';
		}
		return null;
	};

	/** 2/3/4 green · 5/10 yellow · 20 red. Easy to retune. */
	const multiEyeTone = (value: number): 'green' | 'yellow' | 'red' => {
		if (value >= 20) return 'red';
		if (value >= 5) return 'yellow';
		return 'green';
	};

	const multiEyeSpriteKey = (tone: 'green' | 'yellow' | 'red') =>
		tone === 'green' ? 'XM_green' : tone === 'yellow' ? 'XM_yellow' : 'XM_red';

	const labelFontSize = (label: string) => {
		if (label.length >= 5) return 20;
		if (label.length >= 4) return 24;
		if (label.length >= 3) return 30;
		if (label.length >= 2) return 36;
		return 42;
	};

	const potLabelFontSize = (label: string) => {
		if (label.length >= 5) return 26;
		if (label.length >= 4) return 32;
		if (label.length >= 3) return 40;
		if (label.length >= 2) return 48;
		return 56;
	};

	const coinFaceFont = $derived(fontReady ? PRIZE_NUMBER_FONT : 'Arial');
	const coinFacePreset = $derived(getActiveCoinFaceStyle());
	const coinArtNudge = $derived({
		x: COIN_ART.x + (isFxLabActive() ? stateFxLab.coinArtX : 0),
		y: COIN_ART.y + (isFxLabActive() ? stateFxLab.coinArtY : 0),
		scale: COIN_ART.scale * (isFxLabActive() ? stateFxLab.coinArtScale : 1),
	});
	const coinLabelNudge = (label: string) => {
		const sit = coinFaceLabelOffset(label);
		const lab = getCoinDigitLab(coinFaceDigitCount(label));
		const glyph = getCoinCharLab(label);
		return {
			x: sit.x + lab.x + glyph.x,
			y: sit.y + lab.y + glyph.y,
		};
	};

	/** Heads are not coin discs — do not apply COIN_ART sit. */
	const multiLabelNudge = () => ({ x: 0, y: 0 });

	const MULTI_SPRITE_SIZE = SYMBOL_SIZE * 0.92;
	const COLLECTOR_SPRITE_SIZE = SYMBOL_SIZE * 1.15;

	const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

	const easeInCubic = (t: number) => t * t * t;

	const easeInOutCubic = (t: number) =>
		t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

	const fadeFaceLabel = (elapsed: number, duration: number) => {
		const t = easeOutCubic(Math.min(1, Math.max(0, elapsed) / Math.max(1, duration)));
		return { scale: 0.72 + t * 0.28, alpha: t, done: elapsed >= duration };
	};

	/** Pot 100×+: number jumps out, then slams back onto the sack. */
	const smackPotLabel = (elapsed: number, duration: number) => {
		const t = Math.min(1, Math.max(0, elapsed) / Math.max(1, duration));
		const peak = 1.72;
		const trough = 0.86;
		const peakAt = 0.3;
		const smackAt = 0.72;
		let scale: number;
		if (t < peakAt) {
			scale = easeOutCubic(t / peakAt) * peak;
		} else if (t < smackAt) {
			const u = easeInCubic((t - peakAt) / (smackAt - peakAt));
			scale = peak + (trough - peak) * u;
		} else {
			const u = easeOutCubic((t - smackAt) / (1 - smackAt));
			scale = trough + (1 - trough) * u;
		}
		return {
			scale,
			alpha: Math.min(1, t / 0.08),
			done: elapsed >= duration,
		};
	};

	/** Recording 2026-08-24 + Le Bandit clover: xN overlaps neighbor cells, then settles. */
	const popXnLabel = (elapsed: number, duration: number, peak = 1.38) => {
		const t = Math.min(1, Math.max(0, elapsed) / Math.max(1, duration));
		const peakAt = 0.36;
		let scale: number;
		if (t < peakAt) {
			const u = t / peakAt;
			scale = easeOutCubic(u) * peak;
		} else {
			const u = (t - peakAt) / (1 - peakAt);
			scale = peak + (1 - peak) * easeInOutCubic(u);
		}
		return {
			scale,
			alpha: Math.min(1, t / 0.1),
			done: elapsed >= duration,
		};
	};
	const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

	const pacedMs = (ms: number) => scaleFeatureMs(ms, 0);

	const waitMs = (ms: number) =>
		new Promise<void>((resolve) => {
			const duration = pacedMs(ms);
			if (duration <= 0) {
				resolve();
				return;
			}
			let settled = false;
			const finish = () => {
				if (settled) return;
				settled = true;
				clearTimeout(id);
				pendingWaits.delete(finish);
				resolve();
			};
			const id = setTimeout(finish, duration);
			hideTimer = id;
			pendingWaits.add(finish);
		});

	const waitRawMs = (ms: number) =>
		new Promise<void>((resolve) => {
			if (ms <= 0) {
				resolve();
				return;
			}
			let settled = false;
			const finish = () => {
				if (settled) return;
				settled = true;
				clearTimeout(id);
				pendingWaits.delete(finish);
				resolve();
			};
			const id = setTimeout(finish, ms);
			hideTimer = id;
			pendingWaits.add(finish);
		});

	const flushWaits = () => {
		for (const finish of [...pendingWaits]) finish();
	};

	const clearRevealTimers = () => {
		flushWaits();
		clearTimeout(hideTimer);
		cancelAnimationFrame(raf);
	};

	const hiddenMotion = (reel: number, row: number): Motion => {
		const home = homePos(reel, row);
		return { x: home.x, y: home.y, scale: 0, alpha: 0, labelScale: 0, labelAlpha: 0, showLabel: false };
	};

	const prizeValue = (item: Pick<CoinFeatureItem, 'displayValue' | 'value' | 'payout'>) => {
		const n = Number(item.displayValue ?? item.value ?? item.payout ?? 0);
		return Number.isFinite(n) ? capWinMultiplier(Math.round(n * 100) / 100) : 0;
	};

	const spawnBurstFace = (item: Pick<CoinFeatureItem, 'kind' | 'displayValue' | 'value' | 'payout'> & { potShown?: number }) => {
		if (item.kind !== 'coin' && item.kind !== 'collector') return false;
		const n = item.kind === 'collector' ? potFaceOf(item) : prizeValue(item);
		return n >= 500;
	};

	const spawnFaceWaitMs = (items: Array<Parameters<typeof spawnBurstFace>[0]>) =>
		items.some(spawnBurstFace) ? XN_POP_MS : FACE_POP_MS;

	const releaseRevealWait = () => {
		const complete = revealComplete;
		revealComplete = null;
		complete?.();
	};

	const finishReveal = () => {
		clearRevealTimers();
		activeReveals = [];
		motions = {};
		bolts = [];
		boltMotions = {};
		collectTotal = 0;
		showCollectTotal = false;
		featurePaidTotal = 0;
		clearCoinCellCover();
		if (isHeldBoardDismissActive()) tryFinishHeldBoardDismiss();
		releaseRevealWait();
	};

	/** Overlay coins ride the reel leave — no second fall clock. */
	const beginHeldBoardFollowReel = () => {
		if (activeReveals.length === 0) {
			finishReveal();
			return;
		}
		activeReveals = activeReveals.filter((reveal) => !reveal.collected);
		bolts = [];
		boltMotions = {};
		if (activeReveals.length === 0) {
			finishReveal();
			return;
		}
		ensureRaf();
	};

	/** After a 10k pot collect, only that pot stays numbered. */
	const keepMaxWinPotLabel = () => {
		activeReveals = activeReveals.map((reveal) => {
			if (reveal.kind === 'multiplier' || reveal.kind === 'tier_shift') return reveal;
			if (
				reveal.kind === 'collector' &&
				!reveal.collected &&
				isMaxWinPot(potFaceOf(reveal))
			) {
				return { ...reveal, hideLabel: false, showFace: true };
			}
			if (reveal.kind === 'coin' || reveal.kind === 'collector') {
				return { ...reveal, hideLabel: true };
			}
			return reveal;
		});
		bolts = [];
		boltMotions = {};
		ensureRaf();
	};

	const finishMaxWinAfterCollect = async (token: number) => {
		if (token !== runToken) return;
		keepMaxWinPotLabel();
		await waitMs(HOLD_AFTER_MAX_WIN_POT_MS);
		if (token !== runToken) return;
		const shown = await presentSpinWinOnce(token, maxWinBookAmount());
		if (!shown) return;
		await waitRawMs(HOLD_AFTER_BIG_WIN_BOARD_MS);
		if (token !== runToken) return;
		restoreHeldFaceLabels();
		releaseRevealWait();
	};

	const tickMotions = () => {
		const now = performance.now();
		const next: Record<string, Motion> = {};
		let animating = false;
		const dismissing = isHeldBoardDismissActive();
		const maskBottom = BOARD_DIMENSIONS.y * SYMBOL_SIZE;
		const clearedKeys: string[] = [];

		for (const reveal of activeReveals) {
			const home = homePos(reveal.reel, reveal.row);

			if (dismissing) {
				const y = reelCellY(reveal.reel, reveal.row);
				if (y >= maskBottom || y < home.y - 4) {
					releaseCoinCellCover(reveal.reel, reveal.row);
					clearedKeys.push(reveal.key);
					continue;
				}
				next[reveal.key] = {
					x: home.x,
					y,
					scale: 1,
					alpha: 1,
					labelScale: 0,
					labelAlpha: 0,
					showLabel: false,
				};
				animating = true;
				continue;
			}

			if (reveal.clearAt != null) {
				const elapsed = now - reveal.clearAt;
				if (elapsed < 0) {
					next[reveal.key] = {
						x: home.x,
						y: home.y,
						scale: 1,
						alpha: 1,
						labelScale: 0,
						showLabel: false,
					};
					animating = true;
					continue;
				}
				const t = Math.min(1, elapsed / pacedMs(CLEAR_MS));
				const e = easeInCubic(t);
				next[reveal.key] = {
					x: home.x,
					y: home.y,
					scale: 1 - e * 0.45,
					alpha: 1 - e,
					labelScale: 0,
					showLabel: false,
				};
				if (t < 1) animating = true;
				continue;
			}

			if (reveal.drainStart != null) {
				const delay = reveal.drainDelay ?? 0;
				const elapsed = now - reveal.drainStart - delay;
				if (elapsed < 0) {
					next[reveal.key] = {
						x: home.x,
						y: home.y,
						scale: 1,
						alpha: 1,
						labelScale: 0,
						showLabel: false,
					};
					animating = true;
					continue;
				}
				const t = Math.min(1, elapsed / pacedMs(CLEAR_MS));
				const e = easeInCubic(t);
				next[reveal.key] = {
					x: home.x,
					y: home.y,
					scale: 1 - e * 0.45,
					alpha: 1 - e,
					labelScale: 0,
					showLabel: false,
				};
				if (t < 1) animating = true;
				continue;
			}

			const spawnElapsed = now - reveal.spawnAt;
			if (spawnElapsed < 0) {
				next[reveal.key] = {
					x: home.x,
					y: home.y,
					scale: 0,
					alpha: 0,
					labelScale: 0,
					showLabel: false,
				};
				animating = true;
				continue;
			}

			const popMs = pacedMs(POP_MS);
			const pulseMs = pacedMs(PULSE_MS);
			let scale = easeOutCubic(Math.min(1, spawnElapsed / popMs));
			if (
				reveal.pulseAt > reveal.spawnAt &&
				!(reveal.kind === 'multiplier' && reveal.powerResolved)
			) {
				const pulseElapsed = now - reveal.pulseAt;
				if (pulseElapsed >= 0 && pulseElapsed < pulseMs) {
					const pt = pulseElapsed / pulseMs;
					scale *= 1 + Math.sin(pt * Math.PI) * 0.18;
					animating = true;
				}
			}

			const faceReady = reveal.showFace !== false;
			const labelOn = faceReady && (reveal.faceAt == null || now >= reveal.faceAt);
			if (reveal.faceAt != null && !labelOn) animating = true;

			let labelScale = 0;
			let labelAlpha = 0;
			if (reveal.kind === 'multiplier' && reveal.showMultiLabel) {
				const labelAt = reveal.multiLabelAt ?? reveal.spawnAt;
				const labelElapsed = now - labelAt;
				const xnPopMs = pacedMs(XN_POP_MS);
				if (labelElapsed < 0) {
					animating = true;
				} else if (stateFxLab.forceShowPowerLabels) {
					labelScale = 1;
					labelAlpha = 1;
				} else {
					const popped = popXnLabel(labelElapsed, xnPopMs);
					labelScale = popped.scale;
					labelAlpha = popped.alpha;
					if (!popped.done) animating = true;
				}
			} else if (reveal.kind === 'collector') {
				if (!labelOn) {
					labelScale = 0;
					labelAlpha = 0;
				} else if (stateFxLab.forceShowPowerLabels) {
					labelScale = 1;
					labelAlpha = 1;
				} else {
					const labelElapsed = now - (reveal.faceAt ?? reveal.spawnAt);
					const faceValue = potFaceOf(reveal);
					if (labelElapsed < 0) {
						animating = true;
					} else if (faceValue >= POT_SMACK_MIN) {
						const popped = smackPotLabel(labelElapsed, pacedMs(POT_SMACK_MS));
						labelScale = popped.scale;
						labelAlpha = popped.alpha;
						if (!popped.done) animating = true;
					} else {
						const faded = fadeFaceLabel(labelElapsed, pacedMs(FACE_POP_MS));
						labelScale = faded.scale;
						labelAlpha = faded.alpha;
						if (!faded.done) animating = true;
					}
				}
			} else if (reveal.kind === 'coin') {
				if (!labelOn) {
					labelScale = 0;
					labelAlpha = 0;
				} else if (stateFxLab.forceShowPowerLabels) {
					labelScale = 1;
					labelAlpha = 1;
				} else {
					const labelElapsed = now - (reveal.faceAt ?? reveal.spawnAt);
					const faceValue = prizeValue(reveal);
					const burst = reveal.xnPop || faceValue >= 500;
					const popMs = pacedMs(burst ? XN_POP_MS : FACE_POP_MS);
					if (labelElapsed < 0) {
						animating = true;
					} else {
						const faded = burst
							? popXnLabel(labelElapsed, popMs)
							: fadeFaceLabel(labelElapsed, popMs);
						labelScale = faded.scale;
						labelAlpha = faded.alpha;
						if (!faded.done) animating = true;
					}
				}
			}

			let eyeAlpha = 0;
			if (reveal.kind === 'multiplier' && reveal.eyeTone) {
				if (reveal.eyeFadeAt != null) {
					const eyeElapsed = now - reveal.eyeFadeAt;
					if (eyeElapsed < 0) {
						eyeAlpha = 0;
						animating = true;
					} else {
						const et = Math.min(1, eyeElapsed / pacedMs(EYE_FADE_MS));
						eyeAlpha = easeInOutQuad(et);
						if (et < 1) animating = true;
					}
				} else {
					eyeAlpha = 1;
				}
			}

			next[reveal.key] = {
				x: home.x,
				y: home.y,
				scale,
				alpha: Math.min(1, scale),
				labelScale,
				labelAlpha,
				eyeAlpha,
				showLabel: labelOn,
			};
			if (spawnElapsed < popMs) animating = true;
		}

		const nextBolts: Record<string, Motion> = {};
		for (const bolt of bolts) {
			const from = homePos(bolt.fromReel, bolt.fromRow);
			const to =
				bolt.toX != null && bolt.toY != null
					? { x: bolt.toX, y: bolt.toY }
					: homePos(bolt.toReel, bolt.toRow);
			const elapsed = now - bolt.startAt;
			if (elapsed < 0) {
				nextBolts[bolt.key] = {
					x: from.x,
					y: from.y,
					scale: bolt.arcToCenter ? 1 : 0,
					alpha: bolt.arcToCenter ? 1 : 0,
					labelScale: 1,
				};
				animating = true;
				continue;
			}
			const t = Math.min(1, elapsed / bolt.duration);
			if (bolt.arcToCenter) {
				const e = easeInOutCubic(t);
				const ctrlX = bolt.ctrlX ?? (from.x + to.x) / 2;
				const ctrlY = bolt.ctrlY ?? (from.y + to.y) / 2;
				const one = 1 - e;
				const fade = t <= GATHER_FADE_START ? 0 : (t - GATHER_FADE_START) / (1 - GATHER_FADE_START);
				const shrink = easeInCubic(t);
				nextBolts[bolt.key] = {
					x: one * one * from.x + 2 * one * e * ctrlX + e * e * to.x,
					y: one * one * from.y + 2 * one * e * ctrlY + e * e * to.y,
					scale: 1 - shrink * (1 - GATHER_END_SCALE),
					alpha: 1 - fade,
					labelScale: 1,
				};
			} else {
				const e = easeInCubic(t);
				const midX = (from.x + to.x) / 2;
				const midY = (from.y + to.y) / 2 - SYMBOL_SIZE * 0.28;
				const one = 1 - e;
				nextBolts[bolt.key] = {
					x: one * one * from.x + 2 * one * e * midX + e * e * to.x,
					y: one * one * from.y + 2 * one * e * midY + e * e * to.y,
					scale: 0.85 + e * 0.25,
					alpha: t >= 1 ? 0 : 1,
					labelScale: 1,
				};
			}
			if (t < 1) animating = true;
		}

		motions = next;
		boltMotions = nextBolts;
		if (clearedKeys.length > 0) {
			activeReveals = activeReveals.filter((reveal) => !clearedKeys.includes(reveal.key));
		}
		if (dismissing && activeReveals.length === 0) {
			finishReveal();
			return;
		}
		if (animating || activeReveals.length > 0 || bolts.length > 0) {
			raf = requestAnimationFrame(tickMotions);
		}
	};

	const ensureRaf = () => {
		cancelAnimationFrame(raf);
		raf = requestAnimationFrame(tickMotions);
	};

	const restoreHeldFaceLabels = () => {
		activeReveals = activeReveals.map((reveal) =>
			reveal.kind !== 'coin' && reveal.kind !== 'collector'
				? reveal
				: { ...reveal, hideLabel: false, drainStart: undefined, drainDelay: 0, clearAt: undefined },
		);
		bolts = [];
		boltMotions = {};
		ensureRaf();
	};

	/** After 25,000×, only the capped pot stays numbered. Leftovers never paid. */
	const hideNonMaxWinPayLabels = () => {
		const maxPot = activeReveals.find(
			(reveal) =>
				reveal.kind === 'collector' &&
				!reveal.collected &&
				isMaxWinPot(potFaceOf(reveal)),
		);
		activeReveals = activeReveals.map((reveal) => {
			if (reveal.kind !== 'coin' && reveal.kind !== 'collector') return reveal;
			if (
				maxPot &&
				reveal.kind === 'collector' &&
				reveal.reel === maxPot.reel &&
				reveal.row === maxPot.row
			) {
				return { ...reveal, hideLabel: false, showFace: true };
			}
			return { ...reveal, hideLabel: true };
		});
		bolts = [];
		boltMotions = {};
		ensureRaf();
	};

	const spawnItems = async (
		roundItems: CoinFeatureItem[],
		token: number,
		opts?: { append?: boolean },
	): Promise<number> => {
		if (token !== runToken || roundItems.length === 0) return 0;

		const append = opts?.append === true;
		const potKeys = new Set(
			activeReveals
				.filter((reveal) => reveal.kind === 'collector' && !reveal.collected)
				.map((reveal) => cellKey(reveal)),
		);
		const ordered = [...roundItems]
			.filter((item) => item.kind === 'collector' || !potKeys.has(cellKey(item)))
			.sort(waveOrder);
		const minDiag = ordered.reduce((min, item) => Math.min(min, waveIndex(item)), Infinity);
		const maxDiag = ordered.reduce((max, item) => Math.max(max, waveIndex(item)), 0);
		const waveStep = pacedMs(WAVE_DIAG_MS);
		const baseTime = performance.now() + pacedMs(60);
		const freezeSit = isFxLabActive() && stateFxLab.forceShowPowerLabels;
		const spawned: ActiveReveal[] = ordered.map((item) => {
			const at = Number.isFinite(minDiag)
				? baseTime + (waveIndex(item) - minDiag) * waveStep
				: baseTime;
			const isCoin = item.kind === 'coin';
			const isPot = item.kind === 'collector';
			return {
				...item,
				key: `${cellKey(item)}:r${item.round ?? 1}`,
				spawnAt: at,
				pulseAt: at,
				showMultiLabel: freezeSit && item.kind === 'multiplier',
				multiLabelAt: freezeSit && item.kind === 'multiplier' ? at : undefined,
				eyeTone: freezeSit && item.kind === 'multiplier' ? multiEyeTone(item.value) : undefined,
				showFace: true,
				faceAt:
					isCoin || isPot
						? at + (freezeSit ? 0 : pacedMs(POP_MS))
						: undefined,
			};
		});

		activeReveals = append ? [...activeReveals, ...spawned] : spawned;
		activeReveals = activeReveals.map((reveal) =>
			reveal.kind !== 'coin' && reveal.showFace === false
				? { ...reveal, showFace: true }
				: reveal,
		);
		motions = {
			...(append ? motions : {}),
			...Object.fromEntries(spawned.map((r) => [r.key, hiddenMotion(r.reel, r.row)])),
		};
		ensureRaf();

		return Math.max(0, maxDiag - minDiag) * WAVE_DIAG_MS;
	};

	const revealFaces = async (token: number) => {
		if (token !== runToken) return;
		const pending = activeReveals.filter(
			(reveal) => reveal.showFace === false && reveal.kind === 'coin',
		);
		if (pending.length === 0) {
			return;
		}
		const minDiag = pending.reduce((min, item) => Math.min(min, waveIndex(item)), Infinity);
		const maxDiag = pending.reduce((max, item) => Math.max(max, waveIndex(item)), 0);
		const now = performance.now();
		const waveStep = pacedMs(NUMBER_WAVE_MS);
		activeReveals = activeReveals.map((reveal) => {
			if (reveal.kind !== 'coin' || reveal.showFace !== false) return reveal;
			const faceAt = Number.isFinite(minDiag)
				? now + (waveIndex(reveal) - minDiag) * waveStep
				: now;
			return { ...reveal, showFace: true, faceAt };
		});
		motions = Object.fromEntries(
			activeReveals.map((reveal) => {
				const prev = motions[reveal.key] ?? hiddenMotion(reveal.reel, reveal.row);
				if (reveal.kind === 'coin' && reveal.faceAt != null) {
					return [reveal.key, { ...prev, labelScale: 0, showLabel: false }];
				}
				return [reveal.key, prev];
			}),
		);
		ensureRaf();
		await waitMs(
			Math.max(0, maxDiag - minDiag) * NUMBER_WAVE_MS +
				spawnFaceWaitMs(pending) +
				HOLD_AFTER_NUMBERS_MS,
		);
	};

	const revealOneMulti = async (
		head: Pick<CoinFeatureItem, 'reel' | 'row' | 'value'>,
		token: number,
	) => {
		if (token !== runToken) return;
		const current = activeReveals.find(
			(reveal) =>
				reveal.kind === 'multiplier' &&
				reveal.reel === head.reel &&
				reveal.row === head.row,
		);
		if (!current) return;

		if (!current.eyeTone) {
			const now = performance.now();
			activeReveals = activeReveals.map((reveal) => {
				if (reveal.reel !== head.reel || reveal.row !== head.row || reveal.kind !== 'multiplier') {
					return reveal;
				}
				return {
					...reveal,
					eyeTone: multiEyeTone(reveal.value),
					eyeFadeAt: now,
				};
			});
			ensureRaf();
			await waitMs(EYE_FADE_MS + HOLD_AFTER_EYES_MS);
			if (token !== runToken) return;
		}

		const afterEyes = activeReveals.find(
			(reveal) =>
				reveal.kind === 'multiplier' &&
				reveal.reel === head.reel &&
				reveal.row === head.row,
		);
		if (afterEyes && !afterEyes.showMultiLabel) {
			const now = performance.now();
			activeReveals = activeReveals.map((reveal) => {
				if (reveal.reel !== head.reel || reveal.row !== head.row || reveal.kind !== 'multiplier') {
					return reveal;
				}
				return { ...reveal, showMultiLabel: true, multiLabelAt: now };
			});
			ensureRaf();
			await waitMs(XN_POP_MS + HOLD_AFTER_XN_MS);
		}
	};

	const spawnRound = async (
		roundItems: CoinFeatureItem[],
		token: number,
		opts?: { append?: boolean },
	) => {
		if (token !== runToken) return;

		coverWithPots(
			[...activeReveals, ...roundItems].map((item) => ({ reel: item.reel, row: item.row })),
		);

		const append = opts?.append === true;

		if (roundItems.length > 0) {
			const spawnSpan = await spawnItems(roundItems, token, { append });
			if (token !== runToken) return;
			await waitMs(60 + spawnSpan + POP_MS + spawnFaceWaitMs(roundItems) + HOLD_AFTER_NUMBERS_MS);
			if (token !== runToken) return;
		}

		await waitMs(HOLD_AFTER_SPAWN_MS);
	};

	const playVacuumRound = async (roundItems: CoinFeatureItem[], token: number) => {
		if (token !== runToken) return;

		const now = performance.now();
		const prevByKey = new Map(activeReveals.map((r) => [cellKey(r), r]));
		const uncollectedPots = roundItems
			.filter((item) => item.kind === 'collector' && !item.collected)
			.sort(columnOrder);
		const justCollected = uncollectedPots.filter((item) => {
			const prev = prevByKey.get(cellKey(item));
			if (!item.powerResolved) return false;
			if (!prev || prev.kind !== 'collector') return true;
			if (!prev.powerResolved) return true;
			const prevFace = Number(prev.potShown ?? prev.displayValue ?? prev.value ?? 0);
			const nextFace = Number(item.displayValue ?? item.value ?? 0);
			return prevFace !== nextFace;
		});
		const pot = justCollected[0] ?? uncollectedPots[0] ?? null;
		if (!pot) return;

		const sucked = roundItems
			.filter((item) => {
				if (!item.collected) return false;
				if (item.kind !== 'coin' && item.kind !== 'collector') return false;
				const prev = prevByKey.get(cellKey(item));
				return !prev?.collected;
			})
			.sort(waveOrder);

		const flyMinDiag = sucked.reduce((min, item) => Math.min(min, waveIndex(item)), Infinity);

		activeReveals = roundItems.map((item) => {
			const prev = prevByKey.get(cellKey(item));
			const lockedPot = keepExistingPot(item, prev);
			if (lockedPot) return lockedPot;
			const isActingPot =
				item.kind === 'collector' &&
				item.reel === pot.reel &&
				item.row === pot.row &&
				!item.collected;
			const vacuumIndex = sucked.findIndex(
				(c) => c.reel === item.reel && c.row === item.row,
			);
			const isSucked = vacuumIndex >= 0;

			if (isActingPot) {
				const onScreen = prev ? potFaceOf(prev) : 0;
				return withPotFace(
					{
						...item,
						key: prev?.key ?? `${cellKey(item)}:r${item.round ?? 1}`,
						symbol: item.symbol ?? prev?.symbol,
						tileLevel: item.tileLevel ?? prev?.tileLevel,
						spawnAt: prev?.spawnAt ?? now,
						faceAt: prev?.faceAt,
						pulseAt: prev?.pulseAt ?? now,
						showMultiLabel: prev?.showMultiLabel,
						multiLabelAt: prev?.multiLabelAt,
						eyeTone: prev?.eyeTone,
						eyeFadeAt: prev?.eyeFadeAt,
						showFace: true,
						hideLabel: false,
					},
					onScreen,
				);
			}

			return {
				...item,
				key: prev?.key ?? `${cellKey(item)}:r${item.round ?? 1}`,
				spawnAt: prev?.spawnAt ?? now,
				pulseAt: prev?.pulseAt ?? now,
				showMultiLabel:
					item.kind === 'multiplier'
						? isFxLabActive() && stateFxLab.forceShowPowerLabels
							? true
							: false
						: (prev?.showMultiLabel ?? false),
				multiLabelAt: prev?.multiLabelAt,
				eyeTone: prev?.eyeTone,
				eyeFadeAt: prev?.eyeFadeAt,
				showFace: prev?.showFace ?? true,
				collected: isSucked ? false : item.collected,
				hideLabel: isSucked,
				drainStart: isSucked ? undefined : prev?.drainStart,
				drainDelay: isSucked ? 0 : prev?.drainDelay,
			};
		});
		const suckedKeys = new Set(sucked.map((item) => cellKey(item)));
		activeReveals = retainMissingPots(activeReveals, [...prevByKey.values()], suckedKeys);

		bolts = sucked
			.map((sourceItem) => {
				const prev = prevByKey.get(cellKey(sourceItem));
				const source = prev
					? { ...prev, collected: false }
					: { ...sourceItem, collected: false };
				const amount =
					source.kind === 'collector'
						? potFaceOf(source)
						: capWinMultiplier(Math.round(Number(source.displayValue ?? source.value ?? 0) || 0));
				if (amount <= 0) return null;
				return {
					key: `suck:${cellKey(sourceItem)}`,
					fromReel: sourceItem.reel,
					fromRow: sourceItem.row,
					toReel: pot.reel,
					toRow: pot.row,
					startAt:
						now +
						(Number.isFinite(flyMinDiag)
							? (waveIndex(sourceItem) - flyMinDiag) * pacedMs(NUMBER_WAVE_MS)
							: 0),
					duration: pacedMs(VACUUM_MS),
					label: formatCoinFaceLabel(amount),
					tone: 'face' as const,
					symbol: displaySymbol(source),
				};
			})
			.filter((bolt): bolt is NonNullable<typeof bolt> => bolt != null);

		coverWithPots(roundItems.map((item) => ({ reel: item.reel, row: item.row })));
		ensureRaf();

		const prevPot = prevByKey.get(cellKey(pot));
		let running = prevPot ? potFaceOf(prevPot) : 0;

		if (sucked.length > 0) {
			await waitMs(VACUUM_MS);
			for (let i = 0; i < sucked.length; i += 1) {
				if (token !== runToken) return;
				if (i > 0) {
					const prevDiag = waveIndex(sucked[i - 1]!);
					const thisDiag = waveIndex(sucked[i]!);
					await waitMs(Math.max(0, thisDiag - prevDiag) * NUMBER_WAVE_MS);
				}
				if (token !== runToken) return;
				const sourceItem = sucked[i]!;
				const landedKey = cellKey(sourceItem);
				const prev = prevByKey.get(landedKey);
				const landed = new Set(sucked.slice(0, i + 1).map((item) => cellKey(item)));
				const leftoverAfter = leftoverCoinSum(
					activeReveals.filter(
						(reveal) => reveal.kind === 'coin' && !reveal.collected && !landed.has(cellKey(reveal)),
					),
				);
				running = capPotToBoard(
					running +
						Math.round(
							Number(
								prev?.potShown ??
									prev?.displayValue ??
									prev?.value ??
									sourceItem.displayValue ??
									sourceItem.value,
							) || 0,
						),
					leftoverAfter,
				);
				const lastHit = i === sucked.length - 1;
				const hitAt = performance.now();
				activeReveals = activeReveals.map((reveal) => {
					if (reveal.reel !== pot.reel || reveal.row !== pot.row || reveal.kind !== 'collector') {
						return reveal;
					}
					return withPotFace(
						{
							...reveal,
							pulseAt: lastHit ? hitAt : reveal.pulseAt,
							faceAt: lastHit && running >= POT_SMACK_MIN ? hitAt : reveal.faceAt,
						},
						running,
					);
				});
				ensureRaf();
			}
			if (token !== runToken) return;
			if (running >= POT_SMACK_MIN) await waitMs(POT_SMACK_MS);
			if (token !== runToken) return;
		}

		bolts = [];
		boltMotions = {};
		activeReveals = activeReveals.map((reveal) =>
			reveal.kind === 'coin' || reveal.kind === 'collector'
				? { ...reveal, hideLabel: false, drainStart: undefined, drainDelay: 0 }
				: reveal,
		);
		await waitMs(HOLD_AFTER_VACUUM_MS);
		if (token !== runToken) return;
		ensureRaf();
	};

	const playMultiDistribute = async (roundItems: CoinFeatureItem[], token: number) => {
		if (token !== runToken) return;

		const now = performance.now();
		const prevByCell = new Map(activeReveals.map((r) => [cellKey(r), r]));
		coverWithPots(roundItems.map((item) => ({ reel: item.reel, row: item.row })));

		activeReveals = roundItems.map((item) => {
			const prev = prevByCell.get(cellKey(item));
			const lockedPot = keepExistingPot(item, prev);
			if (lockedPot) return lockedPot;
			const prevUsable = !!prev && !isDrained(prev);
			const valueChanged =
				prevUsable &&
				(item.kind === 'coin' || item.kind === 'collector') &&
				(prev.displayValue !== item.displayValue || prev.value !== item.value);

			if (valueChanged && prevUsable) {
				return {
					...prev,
					key: prev.key,
					spawnAt: prev.spawnAt,
					pulseAt: prev.pulseAt,
					showMultiLabel: prev.showMultiLabel,
					multiLabelAt: prev.multiLabelAt,
					eyeTone: prev.eyeTone,
					eyeFadeAt: prev.eyeFadeAt,
					showFace: prev.showFace ?? true,
					pending: item,
				};
			}

			const visuals = cloverVisuals(item, prevUsable ? prev : undefined);
			return {
				...item,
				key: prevUsable ? prev.key : `${cellKey(item)}:r${item.round ?? 1}`,
				spawnAt: prevUsable ? prev.spawnAt : now,
				pulseAt: prevUsable ? (prev.pulseAt ?? now) : now,
				...visuals,
				showFace: prevUsable ? (prev.showFace ?? true) : true,
			};
		});
		activeReveals = retainMissingPots(
			activeReveals,
			[...prevByCell.values()],
			new Set(roundItems.filter((item) => item.collected).map((item) => cellKey(item))),
		);

		const heads = activeReveals.filter((r) => r.kind === 'multiplier');
		const actingHead =
			heads.find((head) => {
				const prev = prevByCell.get(cellKey(head));
				return head.powerResolved && !prev?.powerResolved;
			}) ?? null;

		if (actingHead) {
			await revealOneMulti(actingHead, token);
			if (token !== runToken) return;
		}

		const revealedHead =
			actingHead == null
				? null
				: (activeReveals.find(
						(reveal) =>
							reveal.kind === 'multiplier' &&
							reveal.reel === actingHead.reel &&
							reveal.row === actingHead.row,
					) ?? actingHead);
		const targets = activeReveals
			.filter((r) => (r.kind === 'coin' || r.kind === 'collector') && r.pending)
			.sort(columnOrder);
		const pairs =
			revealedHead == null
				? []
				: targets
						.filter((target) => isAdjacent8(revealedHead, target))
						.map((target) => ({ target, head: revealedHead }));

		const flyAt = performance.now();
		bolts = pairs.map((pair, index) => ({
			key: `bolt:${cellKey(pair.target)}`,
			fromReel: pair.head.reel,
			fromRow: pair.head.row,
			toReel: pair.target.reel,
			toRow: pair.target.row,
			startAt: flyAt + index * pacedMs(BOLT_STAGGER_MS),
			duration: pacedMs(BOLT_MS),
			label: coinOverlayLabel(pair.head),
			tone: 'multi' as const,
			eyeTone: pair.head.eyeTone ?? multiEyeTone(pair.head.value),
		}));
		ensureRaf();

		if (pairs.length === 0) {
			await waitMs(HOLD_AFTER_MULTI_MS);
			return;
		}

		await waitMs(BOLT_MS);
		for (let i = 0; i < pairs.length; i += 1) {
			if (token !== runToken) return;
			if (i > 0) await waitMs(BOLT_STAGGER_MS);
			if (token !== runToken) return;
			const hit = pairs[i]!.target;
			const hitAt = performance.now();
			activeReveals = activeReveals.map((reveal) => {
				if (reveal.reel !== hit.reel || reveal.row !== hit.row || !reveal.pending) {
					return reveal;
				}
				const next = reveal.pending;
				const rawNext = Number(next.displayValue ?? next.value ?? 0);
				const nextFace =
					next.kind === 'collector'
						? capPotFace(rawNext)
						: capWinMultiplier(rawNext);
				const shown =
					next.kind === 'collector'
						? nextFace > 0
							? nextFace
							: potFaceOf(reveal)
						: nextFace;
				const metal =
					next.kind === 'coin'
						? coinMetalForFace(
								nextFace,
								Number(next.tileLevel ?? reveal.tileLevel ?? 1),
							)
						: null;
				return {
					...reveal,
					...next,
					key: reveal.key,
					symbol: metal?.symbol ?? next.symbol ?? reveal.symbol,
					tileLevel: metal?.tileLevel ?? next.tileLevel ?? reveal.tileLevel,
					value: shown,
					displayValue: shown,
					resolvedValue: shown,
					payout: shown,
					spawnAt: reveal.spawnAt,
					faceAt: hitAt,
					pulseAt: hitAt,
					xnPop: true,
					showMultiLabel: reveal.showMultiLabel,
					multiLabelAt: reveal.multiLabelAt,
					eyeTone: reveal.eyeTone,
					eyeFadeAt: reveal.eyeFadeAt,
					showFace: true,
					hideLabel: false,
					pending: undefined,
					potShown: next.kind === 'collector' ? shown : reveal.potShown,
				};
			});
			ensureRaf();
		}

		await waitMs(Math.max(HOLD_AFTER_MULTI_MS, XN_POP_MS));
		if (token !== runToken) return;
		bolts = [];
		boltMotions = {};
	};

	const playDefaultCollect = async (token: number) => {
		if (token !== runToken) return 0;

		const leftovers = activeReveals
			.filter(
				(reveal) =>
					!reveal.collected &&
					(reveal.kind === 'coin' || reveal.kind === 'collector'),
			)
			.sort(waveOrder);
		const flyerFace = (item: (typeof leftovers)[number]) =>
			item.kind === 'collector' ? potFaceOf(item) : prizeValue(item);
		const valued = leftovers.filter((item) => flyerFace(item) > 0);
		let running = 0;
		const flyers: typeof valued = [];
		const skipKeys = new Set<string>();
		for (const item of valued) {
			if (running >= MAX_WIN_MULTIPLIER) {
				skipKeys.add(cellKey(item));
				continue;
			}
			flyers.push(item);
			running = Math.min(MAX_WIN_MULTIPLIER, running + flyerFace(item));
		}
		const paid = capWinMultiplier(
			featurePaidTotal > 0
				? featurePaidTotal
				: Math.round(running * 100) / 100,
		);
		if (paid <= 0 && leftovers.length === 0) {
			return 0;
		}

		const leftoverKeys = new Set(leftovers.map((item) => cellKey(item)));
		const hideLeftoverNumbers = () => {
			activeReveals = activeReveals.map((reveal) =>
				leftoverKeys.has(cellKey(reveal)) ? { ...reveal, hideLabel: true } : reveal,
			);
			bolts = [];
			boltMotions = {};
			ensureRaf();
		};

		collectTotal = 0;
		showCollectTotal = false;

		if (flyers.length > 0) {
			const now = performance.now();
			const sink = boardCenterPos();
			activeReveals = activeReveals.map((reveal) =>
				leftoverKeys.has(cellKey(reveal)) ? { ...reveal, hideLabel: true } : reveal,
			);
			bolts = flyers.map((item) => {
				const amount = flyerFace(item);
				const from = homePos(item.reel, item.row);
				const ctrl = gatherControl(from, sink, item.reel, item.row);
				const leave = gatherUnitHash(item.reel, item.row, 3) * GATHER_STAGGER_MS;
				const duration =
					GATHER_MS + (gatherUnitHash(item.reel, item.row, 4) * 2 - 1) * GATHER_DURATION_JITTER_MS;
				return {
					key: `pay:${cellKey(item)}`,
					fromReel: item.reel,
					fromRow: item.row,
					toReel: 2,
					toRow: 2,
					toX: sink.x,
					toY: sink.y,
					ctrlX: ctrl.x,
					ctrlY: ctrl.y,
					startAt: now + leave,
					duration,
					label: formatCoinFaceLabel(amount),
					tone: 'face' as const,
					symbol: displaySymbol(item),
					arcToCenter: true,
				};
			});
			ensureRaf();
			const lastLeave = flyers.reduce(
				(max, item) => Math.max(max, gatherUnitHash(item.reel, item.row, 3) * GATHER_STAGGER_MS),
				0,
			);
			await waitRawMs(GATHER_MS + lastLeave + GATHER_DURATION_JITTER_MS);
			if (token !== runToken) return 0;
		}

		bolts = [];
		boltMotions = {};
		showCollectTotal = false;
		collectTotal = 0;

		if (paid <= 0) {
			hideLeftoverNumbers();
			return 0;
		}

		const hitCap = paid >= MAX_WIN_MULTIPLIER || running >= MAX_WIN_MULTIPLIER;
		if (hitCap) {
			hideLeftoverNumbers();
			hideNonMaxWinPayLabels();
			await waitMs(HOLD_AFTER_MAX_WIN_POT_MS);
			if (token !== runToken) return MAX_WIN_MULTIPLIER;
			const shown = await presentSpinWinOnce(token, maxWinBookAmount());
			if (!shown) return MAX_WIN_MULTIPLIER;
			await waitRawMs(HOLD_AFTER_BIG_WIN_BOARD_MS);
			if (token !== runToken) return MAX_WIN_MULTIPLIER;
			restoreHeldFaceLabels();
			releaseRevealWait();
			return MAX_WIN_MULTIPLIER;
		}

		const bookAmount = capBookAmount(paid * BOOK_AMOUNT_MULTIPLIER);
		const amountOnly = paid < CENTER_WIN_COUNT_UP_MIN_MULTIPLIER;
		if (amountOnly) {
			hideLeftoverNumbers();
		} else {
			activeReveals = activeReveals.map((reveal) =>
				leftoverKeys.has(cellKey(reveal)) && !skipKeys.has(cellKey(reveal))
					? { ...reveal, hideLabel: false }
					: leftoverKeys.has(cellKey(reveal))
						? { ...reveal, hideLabel: true }
						: reveal,
			);
			bolts = [];
			boltMotions = {};
			ensureRaf();
		}
		const shown = await presentSpinWinOnce(token, bookAmount, { amountOnly });
		if (!shown) return paid;
		if (!amountOnly) {
			await waitRawMs(HOLD_AFTER_BIG_WIN_BOARD_MS);
		}
		return paid;
	};

	const playRegenRound = async (roundItems: CoinFeatureItem[], token: number) => {
		if (token !== runToken) return;

		const prevByCell = new Map(activeReveals.map((r) => [cellKey(r), r]));
		const sittingPotKeys = new Set(
			activeReveals
				.filter((reveal) => reveal.kind === 'collector' && !reveal.collected)
				.map((reveal) => cellKey(reveal)),
		);
		const sittingPot = (item: CoinFeatureItem) => sittingPotKeys.has(cellKey(item));
		const newcomers = roundItems.filter(
			(item) => item.reactivate && !sittingPot(item),
		);
		const stayingPots = activeReveals
			.filter((reveal) => reveal.kind === 'collector' && !reveal.collected)
			.map((prev) => {
				const next = roundItems.find(
					(item) => item.kind === 'collector' && !item.collected && cellKey(item) === cellKey(prev),
				);
				return next ?? prev;
			});
		const staying = [
			...stayingPots,
			...roundItems.filter(
				(item) => !sittingPot(item) && !item.reactivate && !item.collected,
			),
		];
		const now = performance.now();
		activeReveals = staying.map((item) => {
			const prev = prevByCell.get(cellKey(item));
			const prevUsable = !!prev && !isDrained(prev);
			const visuals = cloverVisuals(item, prevUsable ? prev : undefined);
			const sucked = potCell(item) && item.collected;
			const face = sucked
				? 0
				: item.kind === 'collector'
					? Math.max(prevUsable ? potFaceOf(prev) : 0, potFaceOf(item))
					: 0;
			const mapped = {
				...item,
				key: prevUsable ? prev.key : `${cellKey(item)}:r${item.round ?? 1}`,
				spawnAt: prevUsable ? prev.spawnAt : now,
				pulseAt: prevUsable ? (prev.pulseAt ?? now) : now,
				...visuals,
				showFace: prevUsable ? (prev.showFace ?? true) : item.kind !== 'coin',
				hideLabel: sucked || (prevUsable ? prev.hideLabel : undefined),
				potShown: item.kind === 'collector' ? face : prevUsable ? prev.potShown : undefined,
			};
			return item.kind === 'collector' && !sucked ? withPotFace(mapped, face) : mapped;
		});
		const stayKeys = new Set(activeReveals.map((r) => r.key));
		motions = Object.fromEntries(
			Object.entries(motions).filter(([key]) => stayKeys.has(key)),
		);
		if (newcomers.length > 0) {
			await spawnRound(newcomers, token, { append: true });
		} else {
			ensureRaf();
			await waitMs(HOLD_AFTER_UPDATE_MS);
		}
	};

	const updateRound = async (roundItems: CoinFeatureItem[], token: number) => {
		if (token !== runToken) return;

		const prevByCell = new Map(activeReveals.map((r) => [cellKey(r), r]));
		const sittingPotKeys = new Set(
			activeReveals
				.filter((reveal) => reveal.kind === 'collector' && !reveal.collected)
				.map((reveal) => cellKey(reveal)),
		);
		const sittingPot = (item: CoinFeatureItem) => sittingPotKeys.has(cellKey(item));

		const taggedAction = roundItems.find((item) => item.action)?.action;
		const cloverJustApplied = roundItems.some((item) => {
			if (item.kind !== 'multiplier' || !item.powerResolved) return false;
			const prev = prevByCell.get(cellKey(item));
			return !prev?.powerResolved;
		});
		const isCollect = roundItems.some((item) => {
			if (!item.collected) return false;
			if (item.kind !== 'coin' && item.kind !== 'collector') return false;
			const prev = prevByCell.get(cellKey(item));
			return !prev?.collected;
		});
		const newcomers = roundItems.filter(
			(item) => item.reactivate && !sittingPot(item),
		);
		const isReactivate = newcomers.length > 0;

		if (taggedAction === 'collect' || (!taggedAction && isCollect)) {
			await playVacuumRound(roundItems, token);
			return;
		}

		if (taggedAction === 'regen' || taggedAction === 'spawn' || (!taggedAction && isReactivate)) {
			await playRegenRound(roundItems, token);
			return;
		}

		if (taggedAction === 'multi' || (!taggedAction && cloverJustApplied)) {
			await playMultiDistribute(roundItems, token);
			return;
		}

		const now = performance.now();
		coverWithPots(roundItems.map((item) => ({ reel: item.reel, row: item.row })));

		const newMinDiag = roundItems
			.filter((item) => {
				const prev = prevByCell.get(cellKey(item));
				return !prev || isDrained(prev);
			})
			.reduce((min, item) => Math.min(min, waveIndex(item)), Infinity);
		activeReveals = roundItems.map((item) => {
			const prev = prevByCell.get(cellKey(item));
			const lockedPot = keepExistingPot(item, prev);
			if (lockedPot) return lockedPot;
			const prevUsable = !!prev && !isDrained(prev);
			const isNew = !prevUsable;
			const valueChanged =
				prevUsable &&
				(prev.displayValue !== item.displayValue ||
					prev.value !== item.value ||
					prev.symbol !== item.symbol ||
					prev.kind !== item.kind);
			const waveAt =
				isNew && Number.isFinite(newMinDiag)
					? now + (waveIndex(item) - newMinDiag) * pacedMs(WAVE_DIAG_MS)
					: now;
			const visuals = cloverVisuals(item, prevUsable ? prev : undefined);

			const mapped = {
				...item,
				key: prevUsable ? prev.key : `${cellKey(item)}:r${item.round ?? 1}`,
				spawnAt: isNew ? waveAt : prev.spawnAt,
				pulseAt: valueChanged || isNew ? (isNew ? waveAt : now) : prev.pulseAt,
				...visuals,
				showFace: prevUsable ? (prev.showFace ?? true) : item.kind !== 'coin',
			};
			if (item.kind === 'collector') {
				return withPotFace(mapped, Math.max(prevUsable ? potFaceOf(prev) : 0, potFaceOf(item)));
			}
			if (item.kind === 'coin') {
				const n = capWinMultiplier(Number(item.displayValue ?? item.value ?? 0));
				return { ...mapped, value: n, displayValue: n, resolvedValue: n, payout: n };
			}
			return mapped;
		});
		activeReveals = retainMissingPots(
			activeReveals,
			[...prevByCell.values()],
			new Set(roundItems.filter((item) => item.collected).map((item) => cellKey(item))),
		);

		ensureRaf();
		await waitMs(HOLD_AFTER_UPDATE_MS);
	};

	const showReveals = async (items: CoinFeatureItem[], paidTotal = 0): Promise<void> => {
		runToken += 1;
		const token = runToken;
		winPresentedThisReveal = false;
		clearRevealTimers();
		bolts = [];
		boltMotions = {};
		featurePaidTotal = capWinMultiplier(paidTotal);

		const prior = revealComplete;
		revealComplete = null;
		prior?.();

		const gridItems = coinFeatureGridItems(items);
		if (gridItems.length === 0) {
			finishReveal();
			return;
		}

		beginPreCoinShrink(gridItems);
		beginCoinFeatureDim(gridItems);
		await waitMs(PRE_COIN_SHRINK_MS);
		if (token !== runToken) return;

		return new Promise((resolve) => {
			revealComplete = resolve;

			const rounds = [...new Set(gridItems.map((item) => item.round ?? 1))].sort(
				(a, b) => a - b,
			);

			void (async () => {
				try {
					for (let i = 0; i < rounds.length; i += 1) {
						if (token !== runToken) return;
						const round = rounds[i]!;
						const roundItems = gridItems.filter((item) => (item.round ?? 1) === round);
						const isLast = i === rounds.length - 1;

						if (i === 0) await spawnRound(roundItems, token);
						else await updateRound(roundItems, token);

						if (token !== runToken) return;
						if (isFxLabActive() && stateFxLab.forceShowPowerLabels) {
							releaseRevealWait();
							return;
						}
						if (winPresentedThisReveal) {
							restoreHeldFaceLabels();
							releaseRevealWait();
							return;
						}
						if (boardAtMaxWin() || leftoverAtCap()) {
							await collectTowardMaxWin(token);
							return;
						}
						if (!isLast) {
							await waitMs(ROUND_GAP_MS);
							continue;
						}

						const hasPowers = gridItems.some(
							(item) => item.kind === 'multiplier' || item.kind === 'collector',
						);
						// Sit-freeze only for Coin-powers lab mocks — not live books under ?debug=true.
						if (stateFxLab.forceShowPowerLabels && !hasPowers) {
							releaseRevealWait();
							return;
						}

						const collectedPaid = await playDefaultCollect(token);
						if (token !== runToken) return;
						restoreHeldFaceLabels();
						releaseRevealWait();
					}
				} catch (error) {
					if (import.meta.env.DEV) {
						console.warn('[coinFeature] reveal failed', error);
					}
					if (token === runToken) finishReveal();
				}
			})();
		});
	};

	const drawPowerPlaque =
		(kind: CoinFeatureItem['kind']) => (g: import('pixi.js').Graphics) => {
			const { fill, stroke } = powerColors(kind);
			const size = SYMBOL_SIZE * 0.88;
			const half = size / 2;
			g.clear();
			g.roundRect(-half + 2, -half + 3, size, size, 8);
			g.fill({ color: 0x000000, alpha: 0.35 });
			g.roundRect(-half, -half, size, size, 8);
			g.fill({ color: fill, alpha: 1 });
			g.stroke({ color: stroke, width: 4, alpha: 1 });
			g.roundRect(-half + 6, -half + 6, size - 12, size - 12, 4);
			g.stroke({ color: 0xffffff, width: 2, alpha: 0.35 });
		};

	const drawCollectChip = (g: import('pixi.js').Graphics) => {
		g.clear();
		g.circle(0, 0, 16);
		g.fill({ color: 0xc47a12, alpha: 0.95 });
		g.stroke({ color: 0xffe082, width: 3, alpha: 1 });
	};

	onMount(() => {
		markFxLabPresenterReady();
		return () => {
			runToken += 1;
			finishReveal();
		};
	});

	context.eventEmitter.subscribeOnMount({
		monkeyBoardActivation: async (event) => {
			const items = ensurePrizesOnLitTiles(
				normalizeCoinFeatureItems(
					event.payload.coinFeature,
					event.payload.tileMultipliers,
				),
				event.payload.tileLevels ?? getLastTileLevels(),
			);
			const bookTotal =
				event.payload.coinFeature?.totalPayout ??
				(event.payload.activationWin > 0 ? event.payload.activationWin / 100 : undefined);
			await showReveals(items, coinFeaturePaidTotal(items, bookTotal));
		},

		monkeyMechanicsReset: (event) => {
			if (!event.instant && isHeldBoardDismissActive()) return;
			// Bonus after-screen: keep the last coin sit. Next base spin still leaves them.
			if (!event.instant && stateGame.gameType === 'freegame') return;
			runToken += 1;
			finishReveal();
		},

		heldBoardSpinAway: () => {
			runToken += 1;
			beginHeldBoardFollowReel();
		},

		winSkip: () => {
			if (!revealComplete) return;
			flushWaits();
		},

		spinSkipPressToContinue: () => {
			if (!revealComplete) return;
			flushWaits();
		},
	});
</script>

{#snippet coinDisc(name: 'CB' | 'CS' | 'CG')}
	{@const info = getSymbolInfo({ rawSymbol: { name }, state: 'static' })}
	{#if info.type === 'spine'}
		<SymbolSpine symbolInfo={info} loop listener={{}} />
	{:else}
		<SymbolSprite symbolInfo={info} />
	{/if}
{/snippet}

{#snippet coinFaceNumber(label: string, symbol: string, fontSize: number, scale: number, alpha: number)}
	<CoinFaceNumber
		{label}
		{symbol}
		{fontSize}
		{scale}
		{alpha}
		fontFamily={coinFaceFont}
		preset={coinFacePreset}
	/>
{/snippet}

<BoardContainer zIndex={leaving ? zIndexes.boardSymbols : zIndexes.paylineWin}>
	<BoardMask />
	{#each activeReveals as reveal (reveal.key)}
		{@const blank = reveal.showFace === false}
		{@const motion = motions[reveal.key] ?? hiddenMotion(reveal.reel, reveal.row)}
		{@const spriteKey = powerSpriteKey(reveal)}
		{@const power = isPower(reveal)}
		<Container
			x={motion.x}
			y={motion.y}
			zIndex={20}
			scale={motion.scale}
			alpha={motion.alpha}
		>
			{#if blank}
				{@render coinDisc(displaySymbol(reveal))}
			{:else if reveal.kind === 'multiplier'}
				<Sprite
					key="XM_hollow"
					anchor={0.5}
					width={MULTI_SPRITE_SIZE}
					height={MULTI_SPRITE_SIZE}
				/>
				{#if reveal.eyeTone}
					<Container alpha={motion.eyeAlpha ?? 0}>
						<Sprite
							key={multiEyeSpriteKey(reveal.eyeTone)}
							anchor={0.5}
							width={MULTI_SPRITE_SIZE}
							height={MULTI_SPRITE_SIZE}
						/>
					</Container>
				{/if}
			{:else if power && spriteKey}
				{@const powerSize = reveal.kind === 'collector' ? COLLECTOR_SPRITE_SIZE : MULTI_SPRITE_SIZE}
				<Sprite
					key={spriteKey}
					anchor={0.5}
					width={powerSize}
					height={powerSize}
				/>
			{:else if power}
				<Graphics draw={drawPowerPlaque(reveal.kind)} />
			{:else}
				<Container x={coinArtNudge.x} y={coinArtNudge.y} scale={coinArtNudge.scale}>
					{@render coinDisc(displaySymbol(reveal))}
					<CoinShine live={motion.alpha >= 0.35 && motion.scale >= 0.4} />
				</Container>
			{/if}
		</Container>
	{/each}
</BoardContainer>

<BoardContainer zIndex={leaving ? zIndexes.boardSymbols : zIndexes.coinFeature}>
	<BoardMask enabled={leaving} />
	{#each activeReveals as reveal (reveal.key)}
		{@const blank = reveal.showFace === false}
		{@const motion = motions[reveal.key] ?? hiddenMotion(reveal.reel, reveal.row)}
		{@const rawLabel =
			leaving ||
			blank ||
			reveal.hideLabel ||
			motion.showLabel !== true ||
			motion.labelScale <= 0
				? ''
				: reveal.kind === 'collector'
					? (potFaceOf(reveal) > 0 ? formatCoinFaceLabel(potFaceOf(reveal)) : '')
					: coinOverlayLabel(reveal)}
		{@const label =
			reveal.kind === 'collector' && rawLabel === 'POT'
				? ''
				: reveal.kind === 'multiplier' && !reveal.showMultiLabel
					? ''
					: rawLabel}
		{#if label}
			{@const sit = reveal.kind === 'multiplier' ? multiLabelNudge() : coinLabelNudge(label)}
			<Container
				x={motion.x}
				y={motion.y}
				zIndex={motion.labelScale > 1.08 ? 36 : 20}
				scale={motion.scale}
				alpha={motion.alpha}
			>
				<Container x={sit.x} y={sit.y}>
					{@render coinFaceNumber(
						label,
						faceNumberSymbol(reveal),
						reveal.kind === 'collector' ? potLabelFontSize(label) : labelFontSize(label),
						motion.labelScale,
						motion.labelAlpha ?? Math.min(1, motion.labelScale),
					)}
				</Container>
			</Container>
		{/if}
	{/each}

	{#each bolts as bolt (bolt.key)}
		{@const motion = boltMotions[bolt.key] ?? hiddenMotion(bolt.fromReel, bolt.fromRow)}
		{@const collect = bolt.tone === 'collect'}
		{@const face = bolt.tone === 'face'}
		<Container
			x={motion.x}
			y={motion.y}
			zIndex={30}
			scale={motion.scale}
			alpha={motion.alpha}
		>
			{#if collect}
				<Graphics draw={drawCollectChip} />
			{/if}
			{#if face}
				{@const sit = coinLabelNudge(bolt.label)}
				<Container x={sit.x} y={sit.y}>
					<CoinFaceNumber
						label={bolt.label}
						symbol={bolt.symbol ?? 'CB'}
						fontSize={labelFontSize(bolt.label)}
						fontFamily={coinFaceFont}
						preset={coinFacePreset}
					/>
				</Container>
			{:else if collect}
				<Text
					anchor={0.5}
					text={bolt.label}
					style={{
						fontFamily: fontReady ? PRIZE_NUMBER_FONT : 'Arial',
						fontSize: 22,
						fontWeight: PRIZE_NUMBER_WEIGHT,
						fill: 0xffffff,
						align: 'center',
						stroke: { color: 0x3a2208, width: 4, join: 'round', cap: 'round' },
					}}
				/>
			{:else}
				{@const sit = multiLabelNudge()}
				<Container x={sit.x} y={sit.y}>
					<CoinFaceNumber
						label={bolt.label}
						symbol={bolt.eyeTone === 'yellow'
							? 'XM_yellow'
							: bolt.eyeTone === 'red'
								? 'XM_red'
								: 'XM_green'}
						fontSize={28}
						fontFamily={coinFaceFont}
						preset={coinFacePreset}
					/>
				</Container>
			{/if}
		</Container>
	{/each}

	{#if showCollectTotal && collectTotal > 0}
		{@const totalLabel = formatCoinFaceLabel(collectTotal)}
		{@const sit = coinLabelNudge(totalLabel)}
		<Container x={SYMBOL_SIZE * 3 + sit.x} y={SYMBOL_SIZE * 2.5 + sit.y} zIndex={40}>
			<CoinFaceNumber
				label={totalLabel}
				symbol={coinMetalForFace(collectTotal).symbol}
				fontSize={collectTotal >= 100 ? 36 : 48}
				fontFamily={coinFaceFont}
				preset={coinFacePreset}
			/>
		</Container>
	{/if}
</BoardContainer>
