import type { WinCountTier } from './winCountTier';
import { capBookAmount } from './winCountTier';
import { resetWinCelebration } from './winCelebrationPresentation.svelte';
import { stopWinCoinLoop } from './winCoinLoop';
import { resetSpinWinDim } from './spinWinDim.svelte';

/** Canvas-space spin win count-up (SpinWinOverlay reads this). */
export const spinWinOverlay = $state({
	show: false,
	displayAmount: 0,
	targetAmount: 0,
	tier: null as WinCountTier,
	dimAlpha: 0,
	targetDimAlpha: 0,
	contentAlpha: 1,
	labelScale: 0,
	counting: false,
	shakeX: 0,
	shakeY: 0,
	vignetteAlpha: 0,
	popupGlowStrength: 0,
	flashAlpha: 0,
	glowPulse: 0,
	particleBurstId: 0,
	coinBurstId: 0,
	countUpCoinBurstId: 0,
	/** Duration for the overlay-local count-up ramp. */
	countUpDurationMs: 0,
	/** Bumped when a new count-up starts — stale overlay effects bail out. */
	countUpSession: 0,
	cancelCountUp: false,
});

let skipWinCount: (() => void) | null = null;
let countUpFinish: (() => void) | null = null;
let countUpReject: ((reason?: unknown) => void) | null = null;
let presentationGeneration = 0;

export const setSkipWinCount = (fn: (() => void) | null) => {
	skipWinCount = fn;
};

export const runSkipWinCount = () => {
	skipWinCount?.();
};

/** PaylineWinHighlight awaits; driver resolves when the visual ramp finishes. */
export const beginCenterCountUp = () =>
	new Promise<void>((resolve, reject) => {
		countUpFinish = resolve;
		countUpReject = reject;
	});

export const signalCountUpComplete = (finalAmount: number) => {
	if (!spinWinOverlay.counting) return;
	spinWinOverlay.displayAmount = capBookAmount(finalAmount);
	spinWinOverlay.counting = false;
	spinWinOverlay.cancelCountUp = false;
	const finish = countUpFinish;
	countUpFinish = null;
	countUpReject = null;
	finish?.();
};

const skipCountUpToFinal = () => {
	const target = spinWinOverlay.targetAmount;
	if (target <= 0) return;
	spinWinOverlay.cancelCountUp = true;
};

export const runCountUpDriverSkip = () => {
	skipCountUpToFinal();
};

export type StartSpinWinCountUpOpts = {
	target: number;
	durationMs: number;
	session: number;
};

export const startSpinWinCountUp = (targetAmount: number, durationMs = 1200) => {
	spinWinOverlay.displayAmount = 0;
	spinWinOverlay.targetAmount = capBookAmount(targetAmount);
	spinWinOverlay.countUpDurationMs = durationMs;
	spinWinOverlay.cancelCountUp = false;
	spinWinOverlay.countUpSession += 1;
	// SpinWinOverlay.svelte drives the Tween via $effect and calls signalCountUpComplete when done.
};

export const stopSpinWinCountUp = () => {
	spinWinOverlay.cancelCountUp = true;
};

type ClearCountUpBridgeOpts = {
	/** Invalidate/reset mid-ramp — reject presenter await instead of treating as success. */
	abandon?: boolean;
};

const clearCountUpBridge = ({ abandon = false }: ClearCountUpBridgeOpts = {}) => {
	if (abandon) {
		countUpReject?.(new Error('spinWinCountUpAbandoned'));
	} else {
		countUpFinish?.();
	}
	countUpFinish = null;
	countUpReject = null;
};

type ResetSpinWinOverlayOpts = {
	abandonCountUp?: boolean;
};

export const resetSpinWinOverlay = ({ abandonCountUp = false }: ResetSpinWinOverlayOpts = {}) => {
	stopWinCoinLoop();
	resetSpinWinDim();
	clearCountUpBridge({ abandon: abandonCountUp });
	spinWinOverlay.show = false;
	spinWinOverlay.displayAmount = 0;
	spinWinOverlay.targetAmount = 0;
	spinWinOverlay.tier = null;
	spinWinOverlay.dimAlpha = 0;
	spinWinOverlay.targetDimAlpha = 0;
	spinWinOverlay.contentAlpha = 1;
	spinWinOverlay.labelScale = 0;
	spinWinOverlay.counting = false;
	spinWinOverlay.shakeX = 0;
	spinWinOverlay.shakeY = 0;
	spinWinOverlay.vignetteAlpha = 0;
	spinWinOverlay.popupGlowStrength = 0;
	spinWinOverlay.flashAlpha = 0;
	spinWinOverlay.glowPulse = 0;
	spinWinOverlay.coinBurstId = 0;
	spinWinOverlay.countUpCoinBurstId = 0;
	spinWinOverlay.countUpDurationMs = 0;
	spinWinOverlay.cancelCountUp = false;
	skipWinCount = null;
};

export const beginWinPresentation = () => {
	presentationGeneration += 1;
	return presentationGeneration;
};

export const isWinPresentationCurrent = (generation: number) =>
	generation === presentationGeneration;

export const invalidateWinPresentation = () => {
	presentationGeneration += 1;
	resetWinCelebration();
	resetSpinWinOverlay({ abandonCountUp: true });
};
