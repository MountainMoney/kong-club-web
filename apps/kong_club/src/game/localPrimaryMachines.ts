import { fromPromise } from 'xstate';

import { API_AMOUNT_MULTIPLIER, BOOK_AMOUNT_MULTIPLIER } from 'constants-shared/bet';
import { stateBet, stateBetDerived } from 'state-shared';
import { checkIsMultipleRevealEvents } from 'utils-book';
import type { BaseBet } from 'utils-xstate';

import { normalizeLegacyBetModeKey, normalizeResumeBetState } from './betModes';
import { resetGameplayAfterBookError } from './gameplayErrorReset';
import { pickMathBook, type MathBook } from './localMathBooks';
import type { Bet } from './typesBookEvent';

let localFinalBalanceAmount: number | null = null;

const balancePayload = (amount = stateBet.balanceAmount) => ({
	amount: Math.round(amount * API_AMOUNT_MULTIPLIER),
	currency: stateBet.currency,
});

const bookToRound = (book: MathBook): Bet => ({
	id: book.id,
	payoutMultiplier: book.payoutMultiplier,
	state: book.events as Bet['state'],
	active: checkIsMultipleRevealEvents({ bookEvents: book.events }),
	event: '0',
	mode: stateBet.activeBetModeKey,
	amount: Math.round(stateBet.betAmount * API_AMOUNT_MULTIPLIER),
});

const handleLocalRequestBet = async () => {
	const mode = normalizeLegacyBetModeKey(stateBet.activeBetModeKey);
	const book = await pickMathBook(mode);
	const round = bookToRound(book);
	const betCost = stateBetDerived.betCost();
	stateBet.wageredBetAmount = stateBet.betAmount;
	const win = stateBet.betAmount * ((book.payoutMultiplier ?? 0) / BOOK_AMOUNT_MULTIPLIER);
	localFinalBalanceAmount = Math.max(0, stateBet.balanceAmount - betCost + win);
	return { balance: balancePayload(localFinalBalanceAmount), round };
};

const handleLocalRequestEndRound = async () => ({
	balance: balancePayload(localFinalBalanceAmount ?? stateBet.balanceAmount),
});

const handleUpdateBalance = ({ balanceAmountFromApi }: { balanceAmountFromApi: number }) => {
	stateBet.balanceAmount = balanceAmountFromApi / API_AMOUNT_MULTIPLIER;
};

const debitWageredBet = () => {
	stateBet.balanceAmount = Math.max(0, stateBet.balanceAmount - stateBetDerived.betCost());
};

type Options<TBet extends BaseBet> = {
	onResumeGameActive: (betToResume: TBet) => TBet;
	onResumeGameInactive: (betToResume: TBet) => void;
	onNewGameStart: () => Promise<void> | undefined;
	onPlayGame: (bet: TBet) => Promise<void>;
	checkIsBonusGame: (bet: TBet) => boolean;
};

export function createLocalPrimaryMachines<TBet extends BaseBet>(options: Options<TBet>) {
	const {
		onResumeGameActive,
		onResumeGameInactive,
		onNewGameStart,
		onPlayGame,
		checkIsBonusGame,
	} = options;

	let balanceAmountFromApiHolder: null | number = null;

	const BET_TYPE_METHODS_MAP = {
		noWin: {
			newGame: async () => undefined,
			endGame: async () => {
				if (balanceAmountFromApiHolder !== null) {
					handleUpdateBalance({ balanceAmountFromApi: balanceAmountFromApiHolder });
					balanceAmountFromApiHolder = null;
				}
				localFinalBalanceAmount = null;
			},
		},
		singleRoundWin: {
			newGame: async () => {
				const endRoundData = await handleLocalRequestEndRound();
				if (endRoundData?.balance) {
					balanceAmountFromApiHolder = endRoundData.balance.amount;
				}
			},
			endGame: async () => {
				if (balanceAmountFromApiHolder !== null) {
					handleUpdateBalance({ balanceAmountFromApi: balanceAmountFromApiHolder });
					balanceAmountFromApiHolder = null;
				}
				localFinalBalanceAmount = null;
			},
		},
		bonusWin: {
			newGame: async () => undefined,
			endGame: async () => {
				const data = await handleLocalRequestEndRound();
				if (data?.balance) {
					handleUpdateBalance({ balanceAmountFromApi: data.balance.amount });
					balanceAmountFromApiHolder = null;
				}
				localFinalBalanceAmount = null;
			},
		},
	} as const;

	const getBetType = ({ bet }: { bet: TBet }) => {
		const isBonusGame = checkIsBonusGame(bet);
		if (bet.active === true && isBonusGame) return 'bonusWin';
		if (bet.payoutMultiplier && bet.payoutMultiplier > 0) {
			return isBonusGame ? 'bonusWin' : 'singleRoundWin';
		}
		return 'noWin';
	};

	const newGame = fromPromise(async () => {
		try {
			await onNewGameStart();
			const data = await handleLocalRequestBet();
			if (data?.balance) {
				balanceAmountFromApiHolder = data.balance.amount;
			}
			debitWageredBet();
			const bet = data.round as TBet;
			const betType = getBetType({ bet });
			await BET_TYPE_METHODS_MAP[betType].newGame();
			return { bet };
		} catch (error) {
			resetGameplayAfterBookError(error);
			throw error;
		}
	});

	const resumeGame = fromPromise(async () => {
		normalizeResumeBetState();
		const betToResume = stateBet.betToResume as TBet;
		if (betToResume?.active) {
			stateBet.betToResume = null;
			const betType = getBetType({ bet: betToResume });
			await BET_TYPE_METHODS_MAP[betType].newGame();
			return { bet: onResumeGameActive(betToResume), rawBet: betToResume };
		}
		if (betToResume?.state?.length) {
			onResumeGameInactive(betToResume);
		}
		throw new Error('inactive Bet');
	});

	const playGame = fromPromise<void, { bet: TBet | null }>(async ({ input }) => {
		if (input.bet) await onPlayGame(input.bet);
	});

	const endGame = fromPromise<void, { bet: TBet | null; rawBet: TBet | null }>(async ({ input }) => {
		const targetBet = input.rawBet || input.bet;
		if (targetBet) {
			const betType = getBetType({ bet: targetBet });
			await BET_TYPE_METHODS_MAP[betType].endGame();
		}
	});

	return { newGame, playGame, endGame, resumeGame };
}
