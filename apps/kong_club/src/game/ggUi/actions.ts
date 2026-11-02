import {
	INFINITY_MARK,
	stateBet,
	stateBetDerived,
	stateModal,
	stateSound,
	stateUi,
} from 'state-shared';

import { unlockGameAudio } from '../audioUnlock.svelte';
import {
	applyToolbarBetAmount,
	isToolbarBetUpBlockedByAffordability,
	stepToolbarBetAmount,
} from '../betAmountChange';
import {
	ANTE_BET_MODE_KEY,
	FEATURE_SPIN_BET_MODE_KEY,
	FOOTBALL_DEFAULT_BET_MODE_KEY,
	activateToggleBetMode,
	deactivateToggleBetModes,
	isActivateBetMode,
	type ActivateBetModeKey,
	type OneShotBuyModeKey,
} from '../betModes';
import { startBuyBonusRound } from '../buyBonusEntry';
import { requestAutoBet, requestBet } from '../commitWager';
import { eventEmitter } from '../eventEmitter';
import { notifyExtraChanceActivated } from '../extraChancePresentation.svelte';
import { notifyFeatureSpinActivated } from '../featureSpinPresentation.svelte';
import { isGameplayInputAllowed } from '../gameplayLock.svelte';
import { showInsufficientBalanceModal } from '../insufficientBalance';
import {
	isAutoplayDisabled,
	isBuyFeatureDisabled,
	isSpinSpeedControlDisabled,
} from '../jurisdiction';
import { syncMonkeyBgmVolume } from '../MonkeyBgm';
import { syncMonkeySfxVolume } from '../MonkeySoundPlayer';
import { insufficientBalanceMessage, insufficientBetIncreaseMessage } from '../socialCopy';
import { canRequestSpinSkip, requestSpinSkip, stateSpinSkip } from '../spinSkip.svelte';
import { cycleSpinSpeedTier } from '../spinSpeed.svelte';
import { invalidateWinPresentation } from '../spinWinOverlay.svelte';
import { stateGame } from '../stateGame.svelte';
import { stateXstateDerived } from '../stateXstate';
import type { BonusOffer } from './offers';

export const playUi = (type: 'soundPressGeneral' | 'soundPressBet' = 'soundPressGeneral') => {
	eventEmitter.broadcast({ type });
};

export const controlsLocked = () => !stateXstateDerived.isIdle() || !isGameplayInputAllowed();

export const autoplayBusy = () =>
	stateXstateDerived.isAutoBetting() || stateBetDerived.hasAutoBetCounter();

export const onSpinPress = () => {
	if (stateGame.gameType === 'freegame') return;
	if (stateXstateDerived.isIdle() && !isGameplayInputAllowed()) return;
	playUi('soundPressBet');
	const autoPlayRunning = stateXstateDerived.isAutoBetting();
	const autoPlayArmed = stateBetDerived.hasAutoBetCounter() && !autoPlayRunning;
	if (stateXstateDerived.isIdle()) {
		if (!stateBetDerived.isBetCostAvailable()) {
			showInsufficientBalanceModal();
			return;
		}
		invalidateWinPresentation();
		eventEmitter.broadcast({ type: 'paylineWinHide' });
		if (autoPlayArmed) requestAutoBet();
		else requestBet();
		return;
	}
	if (autoPlayRunning) {
		stateBet.autoSpinsCounter = 0;
		if (canRequestSpinSkip()) requestSpinSkip();
		eventEmitter.broadcast({ type: 'stopButtonClick' });
		return;
	}
	if (!stateSpinSkip.active) return;
	if (
		stateSpinSkip.boardSkipUsed ||
		stateSpinSkip.quickLandUsed ||
		stateSpinSkip.quickLandInProgress
	) {
		return;
	}
	if (canRequestSpinSkip()) requestSpinSkip();
	eventEmitter.broadcast({ type: 'stopButtonClick' });
};

export const changeBet = (direction: 'up' | 'down') => {
	if (controlsLocked() || stateGame.gameType === 'freegame') return;
	playUi();
	if (direction === 'up' && isToolbarBetUpBlockedByAffordability()) {
		showInsufficientBalanceModal(insufficientBetIncreaseMessage());
		return;
	}
	stepToolbarBetAmount(direction);
};

export const pickBetAmount = (amount: number) => {
	if (controlsLocked() || stateGame.gameType === 'freegame') return;
	if (amount === stateBet.betAmount) return;
	playUi();
	applyToolbarBetAmount(amount);
};

/** Lit bonus button turns the running activation off. Otherwise the caller opens the menu. */
export const pressBonusButton = () => {
	if (controlsLocked() || stateGame.gameType === 'freegame') return false;
	playUi();
	if (isActivateBetMode(stateBet.activeBetModeKey)) {
		deactivateToggleBetModes();
		return false;
	}
	if (isBuyFeatureDisabled()) return false;
	return true;
};

export const cycleTurbo = () => {
	if (stateBet.isSpaceHold || isSpinSpeedControlDisabled()) return;
	playUi();
	cycleSpinSpeedTier();
};

export const stopAutoplay = () => {
	playUi();
	stateBet.autoSpinsCounter = 0;
	stateUi.autoSpinsText = '' as never;
};

/** GG's autoplay grid starts the run on the chip press. */
export const startAutoRounds = (rounds: number) => {
	if (isAutoplayDisabled() || controlsLocked()) return false;
	playUi();
	const option = rounds === Infinity ? '∞' : String(rounds);
	stateUi.autoSpinsText = option as never;
	stateBet.autoSpinsCounter = rounds;
	if (stateBetDerived.activeBetMode().type === 'buy') {
		stateBet.activeBetModeKey = FOOTBALL_DEFAULT_BET_MODE_KEY;
	}
	if (!stateBetDerived.isBetCostAvailable()) {
		showInsufficientBalanceModal();
		return false;
	}
	invalidateWinPresentation();
	eventEmitter.broadcast({ type: 'paylineWinHide' });
	requestAutoBet();
	return true;
};

export const setMusicVolume = (value: number) => {
	stateSound.volumeValueMusic = Math.round(Math.min(1, Math.max(0, value)) * 100);
	syncMonkeyBgmVolume();
};

export const setSfxVolume = (value: number) => {
	stateSound.volumeValueSoundEffect = Math.round(Math.min(1, Math.max(0, value)) * 100);
	syncMonkeySfxVolume();
};

export const openGameInfo = () => {
	playUi();
	stateModal.modal = { name: 'payTable' };
};

export const holdSkipBonus = () => {
	if (canRequestSpinSkip()) requestSpinSkip();
	eventEmitter.broadcast({ type: 'stopButtonClick' });
};

/** Same confirm path the HTML buy screen used: toggles stay toggles, See/Hear buy a round. */
export const confirmBonusOffer = async (offer: BonusOffer): Promise<boolean> => {
	if (autoplayBusy()) return false;
	const cost = offer.price * stateBet.betAmount;
	if (!(stateBet.betAmount > 0) || cost > stateBet.balanceAmount) {
		showInsufficientBalanceModal(insufficientBalanceMessage());
		return false;
	}
	if (offer.kind === 'buy' && !isActivateBetMode(offer.id) && isBuyFeatureDisabled()) return false;

	if (isActivateBetMode(offer.id)) {
		if (!activateToggleBetMode(offer.id as ActivateBetModeKey)) {
			showInsufficientBalanceModal(insufficientBalanceMessage());
			return false;
		}
		unlockGameAudio();
		stateUi.autoSpinsLossLimitText = INFINITY_MARK;
		stateUi.autoSpinsSingleWinLimitText = INFINITY_MARK;
		if (offer.id === ANTE_BET_MODE_KEY) notifyExtraChanceActivated();
		if (offer.id === FEATURE_SPIN_BET_MODE_KEY) notifyFeatureSpinActivated();
		playUi();
		return true;
	}

	unlockGameAudio();
	playUi();
	return startBuyBonusRound(offer.id as OneShotBuyModeKey);
};
