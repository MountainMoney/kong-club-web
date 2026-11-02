import { Tween } from 'svelte/motion';
import { cubicIn } from 'svelte/easing';

import { stateBet } from 'state-shared';
import { waitForTimeout } from 'utils-shared/wait';
import { createInterruptible } from 'utils-shared/interruptible';

import { slideSymbolFallIn } from './slideSymbolFallIn';
import type { CascadingReelCreateOptions, CascadingReelSpinOptions, SpinType } from './types';

export type CascadingReelMotion = 'fallingOut' | 'hanging' | 'fallingIn' | 'stopped';
export type CascadingReelSymbolState = 'static' | 'land' | 'spin';

export function createReelForCascading<TRawSymbol extends object, TSymbolState extends string>(
	reelOptions: CascadingReelCreateOptions<TRawSymbol, TSymbolState>,
) {
	// reelSymbols
	const getSymbolY = (symbolIndexOfBoard: number) =>
		(symbolIndexOfBoard + 0.5) * reelOptions.symbolHeight;

	const createReelSymbol = (reelSymbolOptions: { rawSymbol: TRawSymbol; symbolIndex: number }) => {
		const symbolIndexOfBoard = reelSymbolOptions.symbolIndex - 1;
		const rawSymbol = reelSymbolOptions.rawSymbol;
		const symbolState = reelOptions.initialSymbolState;

		const initY = getSymbolY(symbolIndexOfBoard);
		const symbolY = new Tween(initY);
		const oncomplete = () => {};

		const reelSymbol = $state({
			rawSymbol,
			symbolIndexOfBoard,
			symbolY,
			symbolState,
			oncomplete,
		});

		return reelSymbol;
	};

	type ReelSymbol = ReturnType<typeof createReelSymbol>;

	const createReelSymbols: (value: TRawSymbol[]) => ReelSymbol[] = (rawSymbols) => {
		const reelSymbols = rawSymbols.map((rawSymbol, symbolIndex) =>
			createReelSymbol({ rawSymbol, symbolIndex }),
		);

		return reelSymbols;
	};

	const updateSymbols = (value: TRawSymbol[]) =>
		reelState.symbols.map((reelSymbol, symbolIndex) => {
			const next = value[symbolIndex];
			if (next) reelSymbol.rawSymbol = next;
			reelSymbol.symbolState = 'static' as TSymbolState;
		});

	// constants
	const reelLength = reelOptions.initialSymbols.length;
	const reelLengthInBoard = reelLength - 2;

	// interruptible
	const interruptible = createInterruptible();

	// reactive states
	const reelState = $state({
		symbols: createReelSymbols(reelOptions.initialSymbols),
		motion: 'stopped' as CascadingReelMotion,
		spinType: 'normal' as SpinType,
		anticipating: false,
		anticipationLevel: 0,
		teaseLandAt: 0,
		/** Visible board rows a tease symbol is currently falling into. */
		teaseIncomingRows: [] as number[],
		readyToSpin: () => {},
		spinOptions: () => ({}) as CascadingReelSpinOptions,
	});
	const basePaddingSize = () => reelLength * reelState.spinOptions().reelPaddingMultiplierNormal;
	const anticipatedPaddingSize = () =>
		reelLength * reelState.spinOptions().reelPaddingMultiplierAnticipated;

	// internal states
	let targetSymbols = reelOptions.initialSymbols;
	let onSpinFinishing: () => void = () => {};
	let noStop = false;
	let paddingSize = 0;
	/** Per-symbol leave — fall-in starts as soon as that cell has cleared the mask. */
	let fallOutCleared: Promise<void>[] = [];
	let cancelTease = false;
	let skipFallInDelay = false;

	const delaySpinByReelIndex = async () => {
		await waitForTimeout(reelState.spinOptions().reelFallOutDelay * reelOptions.reelIndex);
	};

	const preSpin = async ({
		isTurboBeforeAll,
	}: {
		isTurboBeforeAll: boolean; // To avoid previous spinType has effect on "getSpinOption" in "slideDownLoop"
	}) => {
		cancelTease = false;
		skipFallInDelay = false;
		reelState.spinType = isTurboBeforeAll ? 'fast' : 'normal';
		if (!isTurboBeforeAll) await delaySpinByReelIndex();
		await fallOut();
	};

	const msUntilOffMask = (oldSymbolY: number, newSymbolY: number, duration: number) => {
		const maskBottom = reelLengthInBoard * reelOptions.symbolHeight;
		if (oldSymbolY >= maskBottom) return 0;
		const distance = newSymbolY - oldSymbolY;
		if (distance <= 0 || duration <= 0) return 0;
		const travel = Math.min(Math.max(maskBottom - oldSymbolY, 0), distance);
		return duration * Math.cbrt(travel / distance);
	};

	const leaveColumn = () => {
		const options = reelState.spinOptions();
		const fallSpeed = options.symbolFallInSpeed;

		fallOutCleared = reelState.symbols.map(async (reelSymbol) => {
			const oldSymbolY = reelSymbol.symbolY.current;
			const newSymbolY = getSymbolY(reelSymbol.symbolIndexOfBoard + reelLength);
			const duration = Math.max((newSymbolY - oldSymbolY) / fallSpeed, 0);
			const delay =
				options.symbolFallOutInterval * (reelLengthInBoard - reelSymbol.symbolIndexOfBoard);

			await waitForTimeout(delay);
			reelSymbol.symbolState = 'spin' as TSymbolState;
			void reelSymbol.symbolY.set(newSymbolY, { duration, easing: cubicIn });
			await waitForTimeout(msUntilOffMask(oldSymbolY, newSymbolY, duration));
		});
	};

	const fallOut = async () => {
		if (reelState.motion === 'fallingOut' || reelState.motion === 'hanging') return;

		reelState.motion = 'fallingOut';
		leaveColumn();
		reelState.motion = 'hanging';
	};

	const recycleThenDrop = async (reelSymbol: ReelSymbol, symbolIndex: number) => {
		await (fallOutCleared[symbolIndex] ?? Promise.resolve());
		const next = targetSymbols[symbolIndex];
		if (next) reelSymbol.rawSymbol = next;
		await dropSymbol(reelSymbol, { bounce: true, announce: true });
	};

	const waitToStartFallingIn = async () => {
		const fallInDelayMultiplier = paddingSize / reelLength - 1;
		const wait = () =>
			waitForTimeout(reelState.spinOptions().reelFallInDelay * fallInDelayMultiplier);

		// Q: When to skip the waitToStartFallingIn?
		// A: When stop button is clicked(isTurbo) and is noStop is false
		if (skipFallInDelay) return;
		if (noStop) {
			await wait();
		} else if (stateBet.isTurbo) {
			// skip
		} else {
			await interruptible.add(wait);
		}
	};

	const dropSymbol = async (
		reelSymbol: ReelSymbol,
		{
			bounce,
			announce,
			fromSky = true,
			stagger = true,
			finishReel = true,
			parkIndex,
			fallSpeed,
			bounceSpeed,
			bounceSize,
		}: {
			bounce: boolean;
			announce: boolean;
			fromSky?: boolean;
			stagger?: boolean;
			finishReel?: boolean;
			parkIndex?: number;
			fallSpeed?: number;
			bounceSpeed?: number;
			bounceSize?: number;
		},
	) => {
		reelSymbol.symbolState = 'static' as TSymbolState;
		const boardRow = reelSymbol.symbolIndexOfBoard;
		const trackIncoming =
			reelState.spinType === 'anticipated' &&
			boardRow >= 0 &&
			boardRow < reelLengthInBoard;
		let incomingMarked = false;
		const markIncoming = () => {
			if (!trackIncoming || incomingMarked) return;
			incomingMarked = true;
			if (!reelState.teaseIncomingRows.includes(boardRow)) {
				reelState.teaseIncomingRows = [...reelState.teaseIncomingRows, boardRow];
			}
		};
		const clearIncoming = () => {
			if (!incomingMarked) return;
			incomingMarked = false;
			reelState.teaseIncomingRows = reelState.teaseIncomingRows.filter((row) => row !== boardRow);
		};
		if (fromSky) {
			const parkedY = getSymbolY(
				parkIndex ?? reelSymbol.symbolIndexOfBoard - reelLength + 0.5,
			);
			if (Math.abs(reelSymbol.symbolY.current - parkedY) > 1) {
				await reelSymbol.symbolY.set(parkedY, { duration: 0 });
			}
		}
		const oldSymbolY = reelSymbol.symbolY.current;
		const newSymbolY = getSymbolY(reelSymbol.symbolIndexOfBoard);
		const baseOptions = reelState.spinOptions();
		const symbolIndexInBoard = fromSky ? reelSymbol.symbolIndexOfBoard : reelLengthInBoard;
		const interval = stagger ? baseOptions.symbolFallInInterval : 0;
		if (trackIncoming && interval > 0) {
			const delay = interval * (reelLengthInBoard - symbolIndexInBoard);
			if (delay > 0) await waitForTimeout(delay);
		}
		markIncoming();
		try {
			await slideSymbolFallIn({
				symbolY: reelSymbol.symbolY,
				oldSymbolY,
				newSymbolY,
				symbolIndexInBoard,
				reelLengthInBoard,
				spinOptions: {
					...baseOptions,
					...(stagger && !trackIncoming ? {} : { symbolFallInInterval: 0 }),
					...(fallSpeed != null ? { symbolFallInSpeed: fallSpeed } : {}),
					...(bounceSpeed != null ? { symbolFallInBounceSpeed: bounceSpeed } : {}),
					...(bounceSize != null ? { symbolFallInBounceSizeMulti: bounceSize } : {}),
					...(bounce
						? {}
						: { symbolFallInBounceSizeMulti: 0, symbolFallInEasing: cubicIn }),
				},
				symbolHeight: reelOptions.symbolHeight,
				onLand: () => {
					clearIncoming();
					if (!announce) return;
					reelOptions.onSymbolLand({ rawSymbol: reelSymbol.rawSymbol });
					if (finishReel && reelSymbol.symbolIndexOfBoard === reelLengthInBoard - 1) {
						onSpinFinishing();
					}
				},
			});
		} finally {
			clearIncoming();
		}
	};

	const waitForTeaseTurn = async () => {
		const landAt = reelState.teaseLandAt;
		if (!landAt || cancelTease || stateBet.isTurbo) return;
		const waitMs = landAt - performance.now();
		if (waitMs > 0) await waitForTimeout(waitMs);
	};

	const fallIn = async () => {
		await waitToStartFallingIn();
		reelState.motion = 'fallingIn';
		await Promise.all(reelState.symbols.map((reelSymbol, symbolIndex) => recycleThenDrop(reelSymbol, symbolIndex)));
		reelState.motion = 'stopped';
	};

	const generalSpin = async () => {
		if (reelState.motion !== 'hanging' && reelState.motion !== 'fallingOut') {
			await fallOut();
		}
		await fallIn();
	};

	const fastSpin = () => generalSpin();
	const normalSpin = () => generalSpin();
	const anticipatedSpin = async () => {
		if (reelState.motion !== 'hanging' && reelState.motion !== 'fallingOut') {
			await fallOut();
		}
		skipFallInDelay = true;
		await waitForTeaseTurn();
		await fallIn();
		reelState.teaseIncomingRows = [];
	};

	const SPIN_MAP = {
		fast: fastSpin,
		normal: normalSpin,
		anticipated: anticipatedSpin,
	};

	const prepareToSpin = (prepareToSpinOptions: {
		noStop: boolean;
		spinType: SpinType;
		symbols: TRawSymbol[];
		paddingPosition: number;
		onSpinFinishing: () => void;
		previousPaddingSize: number;
	}) => {
		reelState.spinType = prepareToSpinOptions.spinType;

		noStop = prepareToSpinOptions.noStop;
		targetSymbols = prepareToSpinOptions.symbols;
		onSpinFinishing = prepareToSpinOptions.onSpinFinishing;

		const GET_PADDING_SIZE_MAP = {
			fast: 0,
			normal: prepareToSpinOptions.previousPaddingSize + basePaddingSize(),
			anticipated: prepareToSpinOptions.previousPaddingSize + anticipatedPaddingSize(),
		};

		paddingSize = GET_PADDING_SIZE_MAP[prepareToSpinOptions.spinType];

		return paddingSize;
	};

	const spin = async () => {
		cancelTease = false;
		skipFallInDelay = false;
		await SPIN_MAP[reelState.spinType]();
	};

	const setSymbolsWithRawSymbols = (value?: TRawSymbol[]) => {
		reelState.motion = 'stopped';
		if (value) {
			updateSymbols(value);
		}
	};

	const stop = () => {
		cancelTease = true;
		reelState.teaseIncomingRows = [];
		interruptible.interrupt();
	};

	const readyToSpinEffect = () => {
		$effect(() => {
			if (reelState.motion === 'hanging') {
				reelState.readyToSpin();
			}
		});
	};

	return {
		// from options
		reelIndex: reelOptions.reelIndex,
		symbolHeight: reelOptions.symbolHeight,
		onReelStopping: reelOptions.onReelStopping,
		reelLength,
		// reactive states
		reelState,
		// methods
		preSpin,
		prepareToSpin,
		spin,
		stop,
		setSymbolsWithRawSymbols,
		readyToSpinEffect,
		waitForTeaseTurn,
	};
}
