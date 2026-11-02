import { stateBet } from 'state-shared';
import { waitForResolve, waitForTimeout } from 'utils-shared/wait';

import { stateSlots } from './stateSlots.svelte';
import type { Reel, GetRawSymbolFromReel } from './types';

export function createEnhanceBoardSpin<TReel extends Reel<any, any>>({
	board,
	overlapFallInWithFallOut = false,
}: {
	board: TReel[];
	overlapFallInWithFallOut?: boolean;
}) {
	type TRawSymbol = GetRawSymbolFromReel<TReel>;

	/** Wait until this reel finished fallOut. Do not treat `stopped` as ready — preSpin may still be in its reel delay. */
	const waitUntilReelHanging = (reel: TReel) => {
		if (reel.reelState.motion === 'hanging') return Promise.resolve();

		return new Promise<void>((resolve) => {
			let settled = false;
			const prev = reel.reelState.readyToSpin;
			const finish = () => {
				if (settled) return;
				settled = true;
				resolve();
				if (prev && prev !== finish) prev();
			};
			reel.reelState.readyToSpin = finish;
			if (reel.reelState.motion === 'hanging') finish();
		});
	};

	const rollInRange = (min: number, max: number) => {
		if (!Number.isFinite(min)) return 0;
		if (!Number.isFinite(max) || max <= min) return min;
		return min + Math.random() * (max - min);
	};

	/** Later remaining tease reels hang longer (1.0, 1.2, 1.4…). */
	const teaseStepScale = (stepIndex: number) => 1 + (stepIndex - 1) * 0.2;

	const teaseExtraMs = (reelIndex: number, firstAnticipatedReelIndex: number, teaseStagger: number) => {
		const steps = reelIndex - firstAnticipatedReelIndex;
		let extra = 0;
		for (let step = 1; step <= steps; step += 1) {
			extra += teaseStagger * teaseStepScale(step);
		}
		return extra;
	};

	/** Tight L→R incoming wave — several columns in the air at once. */
	const waitForFallInWave = async (reel: TReel, slamFromReel?: number) => {
		if (stateBet.isTurbo) return;
		if (reel.reelState.spinType === 'anticipated') return;
		if (slamFromReel != null && reel.reelIndex >= slamFromReel) {
			const lead = slamFromReel > 0 ? board[slamFromReel - 1] : undefined;
			while (
				lead &&
				lead.reelState.motion !== 'fallingIn' &&
				lead.reelState.motion !== 'stopped' &&
				!stateBet.isTurbo
			) {
				await waitForTimeout(16);
			}
			return;
		}
		const startedAt = stateSlots.fallOutStartedAt;
		if (!startedAt) return;

		const options = reel.reelState.spinOptions();
		const outDelay = options.reelFallOutDelay ?? 145;
		const stagger = options.reelFallInStagger ?? Math.min(48, Math.round(outDelay * 0.35));
		const waitMs = reel.reelIndex * stagger - (performance.now() - startedAt);
		if (waitMs > 0) await waitForTimeout(waitMs);
	};

	type BaseRevealEvent = {
		index: number;
		type: 'reveal';
		board: TRawSymbol[][];
		anticipation: number[];
		paddingPositions?: number[];
		/** After this reel index (inclusive), drop together — no tease hang. */
		slamFromReel?: number;
	};

	async function spin<RevealEvent extends BaseRevealEvent>({
		revealEvent,
		paddingBoard,
	}: {
		revealEvent: RevealEvent;
		paddingBoard?: TRawSymbol[][];
	}) {
		const wasPreSpinning = stateSlots.isPreSpinning;
		if (wasPreSpinning && !overlapFallInWithFallOut) {
			await Promise.all(
				board.map(async (reel) => {
					await waitForResolve((resolve) => (reel.reelState.readyToSpin = resolve));
				}),
			);
			stateSlots.isPreSpinning = false;
		}

		const globalSpinType = stateBet.isTurbo ? 'fast' : 'normal';
		const slamFromReel = revealEvent.slamFromReel;
		const slamActive = typeof slamFromReel === 'number' && slamFromReel > 0;
		const globalHasAnticipation = !slamActive && revealEvent.anticipation.some(Boolean);
		const firstAnticipatedReelIndex = globalHasAnticipation
			? revealEvent.anticipation.findIndex(Boolean)
			: -1;
		const getSpinType = ({
			noStop,
			isAnticipated,
		}: {
			noStop: boolean;
			isAnticipated: boolean;
		}) => {
			if (isAnticipated) return 'anticipated';
			if (noStop) return 'normal';
			return globalSpinType;
		};

		const lightTeaseReels = () => {
			board.forEach((teaseReel, teaseIndex) => {
				const level = revealEvent.anticipation?.[teaseIndex] || 0;
				if (level <= 0) return;
				teaseReel.reelState.anticipating = true;
				teaseReel.reelState.anticipationLevel = level;
			});
		};

		let releaseTeaseDrip = () => {};
		const teaseDripGate = new Promise<void>((resolve) => {
			releaseTeaseDrip = resolve;
		});
		const lightAndBeginTease = () => {
			lightTeaseReels();
			releaseTeaseDrip();
		};

		board.reduce((previousPaddingSize, reel, reelIndex) => {
			const isSlamReel = slamActive && reelIndex >= slamFromReel;
			const noStop = !isSlamReel && globalHasAnticipation && reelIndex >= firstAnticipatedReelIndex;
			const isAnticipated = !isSlamReel && (revealEvent.anticipation?.[reelIndex] || 0) > 0;
			const spinType = isSlamReel ? 'fast' : getSpinType({ noStop, isAnticipated });
			const symbols = revealEvent.board[reelIndex] as TRawSymbol[];
			const paddingReel = paddingBoard?.[reelIndex];
			const paddingPosition = revealEvent?.paddingPositions?.[reelIndex];

			const paddingSize = reel.prepareToSpin({
				noStop,
				spinType,
				symbols,
				// @ts-ignore Ignored because paddingReel is not required by createCascadingReel
				paddingReel,
				// @ts-ignore Ignored because paddingPosition is not required by createCascadingReel
				paddingPosition,
				previousPaddingSize: overlapFallInWithFallOut ? 0 : previousPaddingSize,
				onSpinFinishing: () => {
					reel.onReelStopping();
					if (overlapFallInWithFallOut && reelIndex === firstAnticipatedReelIndex - 1) {
						lightAndBeginTease();
						return;
					}
					const nextReelIndex = reelIndex + 1;
					const level = revealEvent.anticipation?.[nextReelIndex] || 0;
					if (level > 0) {
						board[nextReelIndex].reelState.anticipating = true;
						board[nextReelIndex].reelState.anticipationLevel = level;
					}
				},
			});

			return overlapFallInWithFallOut ? 0 : paddingSize;
		}, 0);

		if (overlapFallInWithFallOut && firstAnticipatedReelIndex === 0 && globalHasAnticipation) {
			lightAndBeginTease();
		}
		if (!overlapFallInWithFallOut) {
			releaseTeaseDrip();
		}

		let teaseHang = 0;
		let teaseStagger = 0;
		if (globalHasAnticipation && firstAnticipatedReelIndex >= 0) {
			const options = board[firstAnticipatedReelIndex].reelState.spinOptions();
			const outDelay = options.reelFallOutDelay ?? 145;
			const normalStagger = options.reelFallInStagger ?? Math.min(48, Math.round(outDelay * 0.35));
			const hangMin = options.reelAnticipationHangMsMin ?? options.reelAnticipationHangMs ?? 0;
			const hangMax = options.reelAnticipationHangMsMax ?? hangMin;
			const staggerMin =
				options.reelAnticipationStaggerMsMin ?? options.reelAnticipationStaggerMs ?? normalStagger;
			const staggerMax = options.reelAnticipationStaggerMsMax ?? staggerMin;
			teaseHang = Math.round(rollInRange(hangMin, hangMax));
			teaseStagger = Math.round(rollInRange(staggerMin, staggerMax));
			if (overlapFallInWithFallOut) {
				const startedAt = stateSlots.fallOutStartedAt || performance.now();
				const landStagger = options.reelFallInStagger ?? Math.min(48, Math.round(outDelay * 0.35));
				board.forEach((reel, reelIndex) => {
					if (reel.reelState.spinType !== 'anticipated') {
						reel.reelState.teaseLandAt = 0;
						return;
					}
					reel.reelState.teaseLandAt =
						startedAt +
						firstAnticipatedReelIndex * landStagger +
						teaseHang +
						teaseExtraMs(reelIndex, firstAnticipatedReelIndex, teaseStagger);
				});
			}
		}

		if (firstAnticipatedReelIndex > 0) {
			void (async () => {
				const prev = board[firstAnticipatedReelIndex - 1];
				while (prev && prev.reelState.motion !== 'stopped' && !stateBet.isTurbo) {
					await waitForTimeout(16);
				}
				lightAndBeginTease();
			})();
		}

		await Promise.all(
			board.map(async (reel) => {
				if (wasPreSpinning && overlapFallInWithFallOut) {
					await waitUntilReelHanging(reel);
					await waitForFallInWave(reel, slamActive ? slamFromReel : undefined);
				}
				await reel.spin();
			}),
		);

		if (wasPreSpinning && overlapFallInWithFallOut) {
			stateSlots.isPreSpinning = false;
		}
	}

	return { spin };
}
