import { stateBet, stateBetDerived } from 'state-shared';

import {
	SPIN_OPTIONS_ANTICIPATED,
	SPIN_OPTIONS_DEFAULT,
	SPIN_OPTIONS_FAST,
	SPIN_OPTIONS_SCATTER_ROLLIN,
	SPIN_OPTIONS_SCATTER_ROLLIN_45,
	SPIN_OPTIONS_SCATTER_ROLLIN_TURBO,
	SPIN_OPTIONS_SCATTER_ROLLIN_TURBO_45,
	SPIN_OPTIONS_TURBO,
	type SpinOptions,
} from './constants';
import {
	allowedSpinSpeedTiers,
	isSpinSpeedTierAllowed,
	nearestAllowedSpinSpeedTier,
} from './jurisdiction';

export type SpinSpeedTier = 'normal' | 'turbo' | 'superTurbo';

let spinSpeedCommitBlocked = false;

export const stateSpinSpeed = $state({
	tier: 'normal' as SpinSpeedTier,
	pendingTier: null as SpinSpeedTier | null,
});

export const setSpinSpeedCommitBlocked = (blocked: boolean) => {
	spinSpeedCommitBlocked = blocked;
};

const canCommitSpinSpeedTierNow = () => !spinSpeedCommitBlocked;

const nextSpinSpeedTier = (tier: SpinSpeedTier) => {
	const tiers = allowedSpinSpeedTiers();
	const current = nearestAllowedSpinSpeedTier(tier);
	return tiers[(tiers.indexOf(current) + 1) % tiers.length] ?? 'normal';
};

const effectiveSpinSpeedTier = () => nearestAllowedSpinSpeedTier(stateSpinSpeed.tier);

export const getSpinSpeedDisplayTier = (): SpinSpeedTier =>
	nearestAllowedSpinSpeedTier(stateSpinSpeed.pendingTier ?? stateSpinSpeed.tier);

export const spinSpeedLabel = (tier: SpinSpeedTier = getSpinSpeedDisplayTier()) => {
	if (tier === 'superTurbo') return 'SUPER';
	if (tier === 'turbo') return 'TURBO';
	return 'NORMAL';
};

export const syncSpinSpeedToBet = () => {
	const tier = effectiveSpinSpeedTier();
	stateSpinSpeed.tier = tier;
	if (stateSpinSpeed.pendingTier && !isSpinSpeedTierAllowed(stateSpinSpeed.pendingTier)) {
		stateSpinSpeed.pendingTier = null;
	}
	stateBetDerived.updateIsTurbo(tier !== 'normal', { persistent: true });
};

export const commitPendingSpinSpeedTier = (force = false) => {
	// Mid-wager FS reveals fire stopButtonEnable; defer until playback ends (see endBetPlayback).
	if (!force && spinSpeedCommitBlocked) return;

	if (stateSpinSpeed.pendingTier) {
		stateSpinSpeed.tier = nearestAllowedSpinSpeedTier(stateSpinSpeed.pendingTier);
		stateSpinSpeed.pendingTier = null;
	}
	syncSpinSpeedToBet();
	setSpinSpeedCommitBlocked(false);
};

export const cycleSpinSpeedTier = () => {
	const base = getSpinSpeedDisplayTier();
	const next = nextSpinSpeedTier(base);

	if (canCommitSpinSpeedTierNow()) {
		stateSpinSpeed.tier = next;
		stateSpinSpeed.pendingTier = null;
		syncSpinSpeedToBet();
		return;
	}

	stateSpinSpeed.pendingTier = next;
};

export const isTurboOrFaster = () => effectiveSpinSpeedTier() !== 'normal';

export const isTurboSpinHeld = () =>
	stateBet.isSpaceHold || stateBet.isTurbo || isTurboOrFaster();

export const isSuperTurbo = () => effectiveSpinSpeedTier() === 'superTurbo';

export const getReelSpinOptions = (spinType: 'normal' | 'fast' | 'anticipated'): SpinOptions => {
	if (spinType === 'anticipated') return SPIN_OPTIONS_ANTICIPATED;
	const tier = effectiveSpinSpeedTier();
	if (tier === 'normal') return SPIN_OPTIONS_DEFAULT;
	if (tier === 'turbo') return SPIN_OPTIONS_TURBO;
	return SPIN_OPTIONS_FAST;
};

/** Scatter / buy-bonus roll-in — always paced; 4 ST slower than 3 (FF). */
export const getScatterRollInSpinOptions = (scatterCount: number = 3): SpinOptions => {
	if (isSuperTurbo()) {
		return scatterCount >= 4
			? { ...SPIN_OPTIONS_FAST, reelPaddingMultiplierAnticipated: 4.5 }
			: SPIN_OPTIONS_FAST;
	}
	if (scatterCount >= 4) {
		return isTurboOrFaster()
			? SPIN_OPTIONS_SCATTER_ROLLIN_TURBO_45
			: SPIN_OPTIONS_SCATTER_ROLLIN_45;
	}
	return isTurboOrFaster() ? SPIN_OPTIONS_SCATTER_ROLLIN_TURBO : SPIN_OPTIONS_SCATTER_ROLLIN;
};

export const getFreegameSpinOptions = (tier: SpinSpeedTier = stateSpinSpeed.tier): SpinOptions => {
	const allowedTier = nearestAllowedSpinSpeedTier(tier);
	if (allowedTier === 'normal') return SPIN_OPTIONS_DEFAULT;
	if (allowedTier === 'turbo') return SPIN_OPTIONS_TURBO;
	return SPIN_OPTIONS_FAST;
};

export const useFreegameSynchronizedSpin = () => false;

export const getFreegameSpinType = (): 'normal' | 'fast' =>
	effectiveSpinSpeedTier() === 'normal' ? 'normal' : 'fast';

export const getSynchronizedSpinOptions = (): SpinOptions => ({
	...getReelSpinOptions('fast'),
	symbolFallInInterval: 0,
});
