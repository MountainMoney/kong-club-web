import { stateI18n } from 'state-shared';

import { BOOK_AMOUNT_MULTIPLIER } from 'constants-shared/bet';
import { stateBet } from 'state-shared';

const NO_LOCALISATION_CURRENCY_MAP: Record<string, string> = {
	XGC: 'GC',
	XSC: 'SC',
};

export const bookEventAmountToBetAmountMultiplier = (bookEventAmount: number) =>
	bookEventAmount / BOOK_AMOUNT_MULTIPLIER;

export const bookEventAmountToNormalisedAmount = (bookEventAmount: number) => {
	const betAmountMultiplier = bookEventAmountToBetAmountMultiplier(bookEventAmount);
	const chip = stateBet.betAmount || stateBet.wageredBetAmount;
	return chip * betAmountMultiplier;
};

export const numberToFloat = (value: number) => Number.parseFloat(`${value}`);

/** Stake: show 3 fractional cents when bet or amount is below 5¢. */
export const EXTENDED_DECIMAL_THRESHOLD = 0.05;

export const usesExtendedAmountDecimals = (amount: number) =>
	Number.isFinite(amount) && amount > 0 && amount < EXTENDED_DECIMAL_THRESHOLD;

/** Win displays use 3 decimals on sub-5¢ current bets/wins; balance stays at 2. */
export const usesExtendedWinDecimals = (normalisedWinAmount: number) =>
	usesExtendedAmountDecimals(stateBet.betAmount) ||
	usesExtendedAmountDecimals(normalisedWinAmount);

/** Bet / cost displays use 3 decimals when the wager or shown value is under 5¢. */
export const usesExtendedBetDecimals = (displayAmount: number) =>
	usesExtendedAmountDecimals(stateBet.betAmount) ||
	usesExtendedAmountDecimals(stateBet.wageredBetAmount) ||
	usesExtendedAmountDecimals(displayAmount);

const formatCurrencyAmount = (value: number, fractionDigits: 2 | 3) => {
	if (stateBet.currency in NO_LOCALISATION_CURRENCY_MAP) {
		return `${NO_LOCALISATION_CURRENCY_MAP[stateBet.currency]} ${numberToFloat(value).toFixed(fractionDigits)}`;
	}

	return stateI18n.i18n.number(value, {
		minimumFractionDigits: fractionDigits,
		maximumFractionDigits: fractionDigits,
		style: 'currency',
		currency: stateBet.currency,
	});
};

export const numberToCurrencyString = (value: number) => formatCurrencyAmount(value, 2);

export const numberToBetCurrencyString = (value: number) =>
	formatCurrencyAmount(value, usesExtendedBetDecimals(value) ? 3 : 2);

export const numberToWinCurrencyString = (value: number) =>
	formatCurrencyAmount(value, usesExtendedWinDecimals(value) ? 3 : 2);

export const bookEventAmountToCurrencyString = (bookEventAmount: number) => {
	const normalisedAmount = bookEventAmountToNormalisedAmount(bookEventAmount);
	return numberToCurrencyString(normalisedAmount);
};

export const bookEventAmountToWinCurrencyString = (bookEventAmount: number) => {
	const normalisedAmount = bookEventAmountToNormalisedAmount(bookEventAmount);
	return numberToWinCurrencyString(normalisedAmount);
};
