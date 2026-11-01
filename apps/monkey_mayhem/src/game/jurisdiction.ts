import { stateConfig } from 'state-shared';

import type { SpinSpeedTier } from './spinSpeed.svelte';

const jurisdiction = () => stateConfig.jurisdiction;

export const isBuyFeatureDisabled = () => jurisdiction()?.disabledBuyFeature === true;
export const isAutoplayDisabled = () => jurisdiction()?.disabledAutoplay === true;
export const isTurboDisabled = () => jurisdiction()?.disabledTurbo === true;
export const isSuperTurboDisabled = () => jurisdiction()?.disabledSuperTurbo === true;
export const isSpacebarDisabled = () => jurisdiction()?.disabledSpacebar === true;
export const isSlamstopDisabled = () => jurisdiction()?.disabledSlamstop === true;

/** Stake Info must always show RTP — do not gate on RGS displayRTP. */
export const shouldDisplayRtp = () => true;
export const shouldDisplaySessionTimer = () => jurisdiction()?.displaySessionTimer === true;
export const shouldDisplayNetPosition = () => jurisdiction()?.displayNetPosition === true;

export const isSpinSpeedTierAllowed = (tier: SpinSpeedTier) => {
	if (tier === 'normal') return true;
	if (tier === 'turbo') return !isTurboDisabled();
	return !isTurboDisabled() && !isSuperTurboDisabled();
};

export const allowedSpinSpeedTiers = (): SpinSpeedTier[] =>
	(['normal', 'turbo', 'superTurbo'] as SpinSpeedTier[]).filter(isSpinSpeedTierAllowed);

export const isSpinSpeedControlDisabled = () => allowedSpinSpeedTiers().length <= 1;

export const nearestAllowedSpinSpeedTier = (tier: SpinSpeedTier): SpinSpeedTier => {
	if (isSpinSpeedTierAllowed(tier)) return tier;
	if (tier === 'superTurbo' && isSpinSpeedTierAllowed('turbo')) return 'turbo';
	return 'normal';
};
