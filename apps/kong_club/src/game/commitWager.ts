import { stateBet, stateBetDerived, stateUi } from 'state-shared';

import { eventEmitter } from './eventEmitter';
import { tryCommitWager } from './gameplayLock.svelte';
import { showInsufficientBalanceModal } from './insufficientBalance';

const canCommitWager = () => stateUi.config.mode !== 'replay';

/** Lock gameplay for a wager that will dispatch shortly (e.g. buy bonus after modal close). */
export const acquireWagerCommit = (): boolean => {
	if (!canCommitWager()) return false;
	return tryCommitWager();
};

/** Acquire gameplay lock and emit a manual spin bet (single-fire). */
export const requestBet = (): boolean => {
	if (!canCommitWager()) return false;
	if (!stateBetDerived.isBetCostAvailable()) {
		showInsufficientBalanceModal();
		return false;
	}
	if (!tryCommitWager()) return false;
	eventEmitter.broadcast({ type: 'bet' });
	return true;
};

/** Acquire gameplay lock and emit an autoplay start (single-fire). */
export const requestAutoBet = (): boolean => {
	if (!canCommitWager()) return false;
	if (!stateBetDerived.isBetCostAvailable()) {
		showInsufficientBalanceModal();
		return false;
	}
	if (!tryCommitWager()) return false;
	eventEmitter.broadcast({ type: 'autoBet' });
	return true;
};
