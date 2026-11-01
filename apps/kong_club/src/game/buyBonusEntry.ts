import { stateBet } from 'state-shared';

import {
	abortBuyBonusEntry,
	activateToggleBetMode,
	FEATURE_SPIN_BET_MODE_KEY,
	PEAK_SPIN_BET_MODE_KEY,
	isOneShotBuyBetMode,
	oneShotBuyModeCost,
	type OneShotBuyModeKey,
} from './betModes';
import { eventEmitter } from './eventEmitter';
import { showInsufficientBalanceModal } from './insufficientBalance';
import { insufficientBalanceMessage } from './socialCopy';
import { acquireWagerCommit } from './commitWager';
import { unlockGameplayInput } from './gameplayLock.svelte';
import { awaitBuyBonusPresentationReady, beginBuyBonusEntryBlock } from './spinSkip.svelte';

/** Close modal → validate cost → arm mode → wait for listeners → fire bet. */
export const startBuyBonusRound = async (buyModeKey: OneShotBuyModeKey): Promise<boolean> => {
	if (!isOneShotBuyBetMode(buyModeKey)) {
		abortBuyBonusEntry();
		return false;
	}

	const cost = oneShotBuyModeCost(buyModeKey);
	if (cost <= 0 || cost > stateBet.balanceAmount) {
		abortBuyBonusEntry();
		showInsufficientBalanceModal(insufficientBalanceMessage());
		return false;
	}

	if (!acquireWagerCommit()) {
		return false;
	}

	stateBet.activeBetModeKey = buyModeKey;
	eventEmitter.broadcast({ type: 'freeSpinIntroHide' });
	beginBuyBonusEntryBlock();
	try {
		await awaitBuyBonusPresentationReady();
		eventEmitter.broadcast({ type: 'bet' });
		return true;
	} catch (error) {
		abortBuyBonusEntry();
		unlockGameplayInput();
		throw error;
	}
};

/** Arm Feature Spin. Buy-screen confirm only activates; the player clicks spin. */
export const startFeatureSpinRound = async (): Promise<boolean> => {
	if (!activateToggleBetMode(FEATURE_SPIN_BET_MODE_KEY)) {
		showInsufficientBalanceModal(insufficientBalanceMessage());
		return false;
	}
	eventEmitter.broadcast({ type: 'freeSpinIntroHide' });
	eventEmitter.broadcast({ type: 'monkeyMechanicsReset' });
	return true;
};

/** Arm PEAK. Buy-screen confirm only activates; the player clicks spin. */
export const startPeakSpinRound = async (): Promise<boolean> => {
	if (!activateToggleBetMode(PEAK_SPIN_BET_MODE_KEY)) {
		showInsufficientBalanceModal(insufficientBalanceMessage());
		return false;
	}
	eventEmitter.broadcast({ type: 'freeSpinIntroHide' });
	eventEmitter.broadcast({ type: 'monkeyMechanicsReset' });
	return true;
};
