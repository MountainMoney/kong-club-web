import type { WinCountTier } from './winCountTier';
import { spinWinOverlay } from './spinWinOverlay.svelte';
import { stateWinCelebration } from './winCelebrationPresentation.svelte';
import { eventEmitter } from './eventEmitter';
import { FOOTBALL_PERFORMANCE } from './performance';

export type WinCelebrationTier = Exclude<WinCountTier, null>;

export type WinCelebrationFxConfig = {
	shakePulse: number;
	shakeAmbient: number;
	blurStrength: number;
	dimAlpha: number;
	vignetteAlpha: number;
	popupGlow: number;
	particleCount: number;
	flashAlpha: number;
};

export const WIN_CELEBRATION_FX: Record<WinCelebrationTier, WinCelebrationFxConfig> = {
	big: {
		shakePulse: 5,
		shakeAmbient: 2.2,
		blurStrength: 3,
		dimAlpha: 0.52,
		vignetteAlpha: 0.38,
		popupGlow: 7,
		particleCount: 28,
		flashAlpha: 0.22,
	},
	superwin: {
		shakePulse: 9,
		shakeAmbient: 3.8,
		blurStrength: 5,
		dimAlpha: 0.58,
		vignetteAlpha: 0.48,
		popupGlow: 11,
		particleCount: 48,
		flashAlpha: 0.32,
	},
	mega: {
		shakePulse: 15,
		shakeAmbient: 6,
		blurStrength: 7,
		dimAlpha: 0.66,
		vignetteAlpha: 0.58,
		popupGlow: 16,
		particleCount: 72,
		flashAlpha: 0.42,
	},
	epic: {
		shakePulse: 24,
		shakeAmbient: 9,
		blurStrength: 9,
		dimAlpha: 0.74,
		vignetteAlpha: 0.68,
		popupGlow: 22,
		particleCount: 110,
		flashAlpha: 0.55,
	},
	max: {
		shakePulse: 32,
		shakeAmbient: 12,
		blurStrength: 10,
		dimAlpha: 0.82,
		vignetteAlpha: 0.78,
		popupGlow: 28,
		particleCount: 140,
		flashAlpha: 0.72,
	},
};

/** Tier stings are handled by sfx_winlevel_* in PaylineWinHighlight applyTierCrossing. */
export const playTierCelebrationSounds = (_tier: WinCelebrationTier, _multiplier: number) => {
	if (_tier === 'max') {
		void eventEmitter.broadcastAsync({ type: 'uiHide' });
	}
};

export const applyTierVisuals = (
	tier: WinCelebrationTier,
	opts?: { forceFullFx?: boolean },
) => {
	const fx = WIN_CELEBRATION_FX[tier];
	const testingPerf = !opts?.forceFullFx && FOOTBALL_PERFORMANCE.disableExpensiveTestFx;

	stateWinCelebration.blurActive = false;
	stateWinCelebration.blurStrength = 0;

	spinWinOverlay.vignetteAlpha = testingPerf ? 0 : fx.vignetteAlpha;
	spinWinOverlay.popupGlowStrength = testingPerf ? 0 : fx.popupGlow;
	spinWinOverlay.targetDimAlpha = fx.dimAlpha;
	spinWinOverlay.glowPulse = testingPerf ? 0 : 1;
};

export const burstTierJuice = (
	tier: WinCelebrationTier,
	multiplier: number,
	opts?: { forceFullFx?: boolean },
) => {
	const fx = WIN_CELEBRATION_FX[tier];
	const testingPerf = !opts?.forceFullFx && FOOTBALL_PERFORMANCE.disableExpensiveTestFx;

	stateWinCelebration.particleTier = tier;
	stateWinCelebration.particleCount = testingPerf ? 0 : fx.particleCount;
	spinWinOverlay.flashAlpha = testingPerf ? 0 : fx.flashAlpha;
	if (!testingPerf) {
		spinWinOverlay.particleBurstId += 1;
		spinWinOverlay.coinBurstId += 1;
		if (spinWinOverlay.counting && spinWinOverlay.countUpCoinBurstId === 0) {
			spinWinOverlay.countUpCoinBurstId = spinWinOverlay.coinBurstId;
		}
	}

	playTierCelebrationSounds(tier, multiplier);
};

export const triggerWinCelebrationTier = (
	tier: WinCelebrationTier,
	multiplier: number,
	opts?: { forceFullFx?: boolean },
) => {
	applyTierVisuals(tier, opts);
	burstTierJuice(tier, multiplier, opts);
};
