import { stateBet, stateBetDerived, stateConfig } from 'state-shared';

import { syncActivateModeToBalance } from './betModes';
import { showInsufficientBalanceModal } from './insufficientBalance';
import { insufficientBetIncreaseMessage } from './socialCopy';

const sortedBetOptions = () => [...stateConfig.betAmountOptions].sort((a, b) => a - b);

export const nextToolbarBetUp = () => {
	const options = sortedBetOptions();
	return options.find((step) => step > stateBet.betAmount) ?? null;
};

/** True when this ladder denomination covers the active bet mode cost at current balance. */
export const canAffordBetAmountForActiveMode = (betAmount: number) => {
	if (betAmount <= 0) return false;
	return betAmount <= stateBetDerived.maxAffordableBet();
};

/** True when a higher ladder step exists but balance cannot cover it in the active mode. */
export const isToolbarBetUpBlockedByAffordability = () => {
	const next = nextToolbarBetUp();
	return next != null && !canAffordBetAmountForActiveMode(next);
};

/** Apply a ladder bet change and keep activate toggles affordable. */
export const applyToolbarBetAmount = (value: number): boolean => {
	if (!canAffordBetAmountForActiveMode(value)) {
		showInsufficientBalanceModal(
			value > stateBet.betAmount
				? insufficientBetIncreaseMessage()
				: undefined,
		);
		return false;
	}

	stateBetDerived.setBetAmount(value);
	syncActivateModeToBalance();
	return true;
};

/** Step bet up/down on the configured ladder with affordability guards. */
export const stepToolbarBetAmount = (direction: 'up' | 'down'): boolean => {
	const options = sortedBetOptions();
	const current = stateBet.betAmount;
	const next =
		direction === 'up'
			? options.find((step) => step > current) ?? options[options.length - 1]!
			: [...options].reverse().find((step) => step < current) ?? options[0]!;

	return applyToolbarBetAmount(next);
};

export const canStepToolbarBetUpForActiveMode = () => {
	const next = nextToolbarBetUp();
	if (next == null) return false;
	return canAffordBetAmountForActiveMode(next);
};
