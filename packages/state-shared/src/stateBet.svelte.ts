import type { BaseBet } from 'utils-bet';
import { stateConfig } from './stateConfig.svelte';
import { stateMeta } from './stateMeta.svelte';

export type Currency = string;
export type BetToResume = BaseBet | null;
export type BetModeKey = string;

export const stateBet = $state({
	currency: 'USD' as Currency,
	balanceAmount: 0,
	betAmount: 1,
	wageredBetAmount: 1,
	betToResume: null as BetToResume,
	activeBetModeKey: 'BASE' as BetModeKey,
	winBookEventAmount: 0,
	autoSpinsLoss: 0,
	autoSpinsCounter: 0,
	autoSpinsLossLimitAmount: Infinity,
	autoSpinsSingleWinLimitAmount: Infinity,
	isSpaceHold: false,
	isTurbo: false,
	/**
	 * Kong Club speed tier (1 normal, 2 turbo, 4 super). 0 means "not set" so
	 * other games keep the isTurbo boolean. Slam-stop still raises timeScale via isTurbo.
	 */
	playbackTimeScale: 0,
});

const sortedLadder = () => [...stateConfig.betAmountOptions].sort((a, b) => a - b);

const betCostMultiplier = () => {
	const mode = stateBetDerived.activeBetMode();
	if (!mode) return 1;
	if (mode.type === 'activate' || mode.type === 'buy') return mode.costMultiplier;
	return 1;
};

/** Highest ladder step whose total cost fits in the current balance. */
const maxAffordableBet = () => {
	const costMultiplier = betCostMultiplier();
	if (costMultiplier <= 0) return 0;
	const balance = stateBet.balanceAmount;
	const ladder = sortedLadder();
	let best = 0;
	for (const step of ladder) {
		if (step * costMultiplier <= balance) best = step;
	}
	return best;
};

/** Snap to a valid ladder step only. Balance must never change the player's denomination. */
const snapToLadder = (value: number): number => {
	const ladder = sortedLadder();
	if (value <= 0) return 0;
	if (!ladder.length) return value;

	if (ladder.includes(value)) {
		return value;
	}

	let bestAtOrBelow = ladder[0]!;
	for (const step of ladder) {
		if (step <= value) {
			bestAtOrBelow = step;
		}
	}

	return bestAtOrBelow;
};

const correctBetAmount = (value: number) => snapToLadder(value);

const setBetAmount = (value: number) => {
	const corrected = correctBetAmount(value);
	stateBet.betAmount = corrected;
	stateBet.wageredBetAmount = corrected;
};

const updateBetAmount = (update: (value: number) => number) => {
	const corrected = correctBetAmount(update(stateBet.betAmount));
	stateBet.betAmount = corrected;
	stateBet.wageredBetAmount = corrected;
};

/** Keep current denomination on the configured ladder without considering affordability. */
const syncBetToAffordableLadder = () => {
	stateBet.betAmount = snapToLadder(stateBet.betAmount);
	stateBet.wageredBetAmount = stateBet.betAmount;
};

const nextAffordableBetUp = () => {
	const ladder = sortedLadder();
	const current = stateBet.betAmount;
	const next = ladder.find((step) => step > current);
	return next ?? current;
};

const nextAffordableBetDown = () => {
	const ladder = sortedLadder();
	const current = stateBet.betAmount;
	const candidates = ladder.filter((step) => step < current);
	return candidates.length ? candidates[candidates.length - 1]! : ladder[0] ?? current;
};

const canIncreaseBet = () => {
	if (!sortedLadder().length) return false;
	const next = nextAffordableBetUp();
	return next > stateBet.betAmount;
};

const canDecreaseBet = () => {
	const ladder = sortedLadder();
	if (!ladder.length) return false;
	const min = ladder[0]!;
	return stateBet.betAmount > min;
};

let isTurboLocked = false;

const updateIsTurbo = (value: boolean, options: { persistent: boolean }) => {
	const { persistent } = options;

	if (!persistent && isTurboLocked) return;
	if (persistent) isTurboLocked = value;

	stateBet.isTurbo = value;
};

const activeBetMode = () =>
	stateMeta.betModeMeta?.[stateBet.activeBetModeKey.toUpperCase()] ??
	stateMeta.betModeMeta?.[stateBet.activeBetModeKey.toLowerCase()] ??
	null;
const isContinuousBet = () => stateBet.autoSpinsCounter > 1 || stateBet.isSpaceHold;
const timeScale = () => {
	const flagged = stateBet.isTurbo ? 2 : 1;
	if (stateBet.playbackTimeScale > 0) return Math.max(flagged, stateBet.playbackTimeScale);
	return flagged;
};
const betCost = () => stateBet.betAmount * betCostMultiplier();
const isBetCostAvailable = () => betCost() > 0 && betCost() <= stateBet.balanceAmount;
/** True when balance cannot cover the current bet at any ladder step. */
const cannotAffordCurrentBet = () => !isBetCostAvailable();
const hasAutoBetCounter = () => stateBet.autoSpinsCounter !== 0;

export const stateBetDerived = {
	setBetAmount,
	updateBetAmount,
	syncBetToAffordableLadder,
	maxAffordableBet,
	nextAffordableBetUp,
	nextAffordableBetDown,
	canIncreaseBet,
	canDecreaseBet,
	updateIsTurbo,
	activeBetMode,
	isContinuousBet,
	timeScale,
	betCost,
	isBetCostAvailable,
	cannotAffordCurrentBet,
	hasAutoBetCounter,
};
