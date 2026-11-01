import { spinWinOverlay } from './spinWinOverlay.svelte';
import { stopWinScreenShake } from './winCelebrationShake';
import type { WinCelebrationTier } from './winCelebrationFx';

export const stateWinCelebration = $state({
	blurActive: false,
	blurStrength: 0,
	particleTier: null as WinCelebrationTier | null,
	particleCount: 0,
});

export const resetWinCelebration = () => {
	stopWinScreenShake();
	stateWinCelebration.blurActive = false;
	stateWinCelebration.blurStrength = 0;
	stateWinCelebration.particleTier = null;
	stateWinCelebration.particleCount = 0;
	spinWinOverlay.vignetteAlpha = 0;
	spinWinOverlay.popupGlowStrength = 0;
	spinWinOverlay.targetDimAlpha = 0;
	spinWinOverlay.flashAlpha = 0;
	spinWinOverlay.glowPulse = 0;
	spinWinOverlay.shakeX = 0;
	spinWinOverlay.shakeY = 0;
};
