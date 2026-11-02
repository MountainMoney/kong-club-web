import { page } from '$app/state';

import { API_AMOUNT_MULTIPLIER } from 'constants-shared/bet';
import { requestReplay } from 'rgs-requests';
import { stateBet, stateUi } from 'state-shared';

import { normalizeLegacyBetModeKey, setActiveBetModeKey } from './betModes';
import { MAX_WIN_MULTIPLIER, capWinMultiplier } from './winCountTier';
import { getMathBookByIndex } from './localMathBooks';
import { stateSpinSpeed } from './spinSpeed.svelte';
import type { Bet, BookEvent } from './typesBookEvent';

export type ReplayQuery = {
	game: string;
	version: string;
	mode: string;
	event: string;
	rgsUrl: string;
	currency: string;
	amount: number;
	lang: string;
	device: string;
	social: boolean;
};

export type ReplayFetchResult = {
	payout?: number;
	payoutMultiplier: number;
	costMultiplier: number;
	bet: Bet;
};

const normalizeReplayResponse = (raw: unknown) => {
	const root = raw as Record<string, unknown> | null | undefined;
	if (root?.round && typeof root.round === 'object') {
		return root.round as Record<string, unknown>;
	}
	return root ?? {};
};

const replayStateFromResponse = (data: Record<string, unknown>) => {
	const candidates = [data.state, data.events, data.bookEvents];
	return candidates.find((candidate): candidate is BookEvent[] =>
		Array.isArray(candidate) && candidate.length > 0,
	);
};

const eventTypes = (events: BookEvent[]) => events.map((event) => event.type);

const replayDebugLog = (...args: Parameters<typeof console.info>) => {
	if (import.meta.env.DEV) console.info(...args);
};

const replayDebugWarn = (...args: Parameters<typeof console.warn>) => {
	if (import.meta.env.DEV) console.warn(...args);
};

const replayStateWithFullBookFallback = async (
	query: ReplayQuery,
	rgsState: BookEvent[],
	payoutMultiplier: number,
) => {
	const mode = normalizeLegacyBetModeKey(query.mode);
	const bookIndex = Number(query.event);

	if (!import.meta.env.DEV) return rgsState;

	if (!Number.isInteger(bookIndex) || bookIndex < 0) {
		return rgsState;
	}

	try {
		const book = await getMathBookByIndex(mode, bookIndex);
		if (book.events.length > rgsState.length) {
			replayDebugLog('[ReplayMode] using packaged full book for animation', {
				mode,
				event: query.event,
				rgsEvents: rgsState.length,
				bookEvents: book.events.length,
				rgsTypes: eventTypes(rgsState),
				bookPayoutMultiplier: book.payoutMultiplier,
				rgsPayoutMultiplier: payoutMultiplier,
			});
			return book.events;
		}
	} catch (error) {
		replayDebugWarn('[ReplayMode] packaged full book fallback unavailable', {
			mode,
			event: query.event,
			error,
		});
	}

	return rgsState;
};

export const replayBaseBetCurrency = (amountApi: number) => amountApi / API_AMOUNT_MULTIPLIER;

/** URL amount is authoritative when present; otherwise use RGS round amount (API scale). */
export const resolveReplayAmountApi = (query: ReplayQuery, rgsAmount: unknown) =>
	query.amount || Number(rgsAmount) || 0;

/** RGS payoutMultiplier is a direct win multiple (e.g. 96 = 96× base bet), not book ÷100 scale. */
export const replayTotalWinCurrency = (
	payoutMultiplier: number,
	baseBetApi: number,
	payoutApi?: number,
) => {
	const bet = replayBaseBetCurrency(baseBetApi);
	const cap = (bet > 0 ? bet : 1) * MAX_WIN_MULTIPLIER;
	if (payoutApi != null && Number.isFinite(payoutApi) && payoutApi > 0) {
		return Math.min(payoutApi / API_AMOUNT_MULTIPLIER, cap);
	}
	return Math.min(bet * capWinMultiplier(payoutMultiplier), cap);
};

export const formatReplayPayoutMultiplier = (payoutMultiplier: number) => {
	if (!Number.isFinite(payoutMultiplier)) return '—';
	const n = capWinMultiplier(payoutMultiplier);
	if (Number.isInteger(n)) return `${n}×`;
	return `${n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}×`;
};

export type ReplayPhase = 'idle' | 'loading' | 'ready' | 'playing' | 'ended' | 'error';

export const stateReplay = $state({
	phase: 'idle' as ReplayPhase,
	errorMessage: '',
	payoutMultiplier: 0,
	costMultiplier: 1,
	cachedBet: null as Bet | null,
	playbackInFlight: false,
});

export const isReplayActive = () => stateUi.config.mode === 'replay';

export const isReplayUrl = () => page.url.searchParams.get('replay') === 'true';

export const parseReplayQuery = (): ReplayQuery => {
	const params = page.url.searchParams;
	return {
		game: params.get('game') ?? '',
		version: params.get('version') ?? '',
		mode: params.get('mode') ?? '',
		event: params.get('event') ?? '',
		rgsUrl: params.get('rgs_url') ?? '',
		currency: params.get('currency') ?? 'USD',
		amount: Number(params.get('amount')) || 0,
		lang: params.get('lang') ?? 'en',
		device: params.get('device') ?? '',
		social: params.get('social') === 'true',
	};
};

const missingReplayParams = (query: ReplayQuery) => {
	const required: (keyof ReplayQuery)[] = ['game', 'version', 'mode', 'event', 'rgsUrl'];
	return required.filter((key) => !String(query[key]).trim());
};

export const enterReplayMode = () => {
	stateUi.config.mode = 'replay';
	stateReplay.phase = 'loading';
	stateReplay.errorMessage = '';
	stateReplay.cachedBet = null;
};

export const applyReplayBet = (data: ReplayFetchResult) => {
	const query = parseReplayQuery();
	const amountApi = resolveReplayAmountApi(query, data.bet.amount);
	const wagered = amountApi / API_AMOUNT_MULTIPLIER;

	stateBet.currency = query.currency || 'USD';
	stateBet.betAmount = wagered;
	stateBet.wageredBetAmount = wagered;
	setActiveBetModeKey(query.mode);
	stateBet.winBookEventAmount = 0;
	stateBet.autoSpinsCounter = 0;
	stateBet.isSpaceHold = false;
	stateBet.isTurbo = false;
	stateSpinSpeed.tier = 'normal';
	stateSpinSpeed.pendingTier = null;

	stateReplay.payoutMultiplier = data.payoutMultiplier;
	stateReplay.costMultiplier = data.costMultiplier;
	stateReplay.cachedBet = data.bet;

	stateBet.betToResume = {
		...data.bet,
		mode: normalizeLegacyBetModeKey(data.bet.mode ?? query.mode),
	};
};

export const fetchReplayRound = async (): Promise<ReplayFetchResult> => {
	const query = parseReplayQuery();
	const missing = missingReplayParams(query);

	if (missing.length) {
		throw new Error(`Missing replay parameters: ${missing.join(', ')}`);
	}

	if (!query.amount) {
		replayDebugWarn(
			'[ReplayMode] URL amount param missing or zero — defaulting wager from RGS response.',
			{ mode: query.mode, event: query.event },
		);
	}

	replayDebugLog('[ReplayMode] fetch', {
		game: query.game,
		version: query.version,
		mode: query.mode,
		event: query.event,
		amountApi: query.amount,
		amountCurrency: query.amount / API_AMOUNT_MULTIPLIER,
		language: query.lang,
		rgsUrl: query.rgsUrl,
	});

	const raw = await requestReplay({
		rgsUrl: query.rgsUrl,
		game: query.game,
		version: query.version,
		mode: query.mode,
		event: query.event,
		language: query.lang,
	});
	const data = normalizeReplayResponse(raw);
	const rgsState = replayStateFromResponse(data);

	if (!rgsState) {
		throw new Error('Replay response did not include round state.');
	}

	const payoutMultiplier = Number(data.payoutMultiplier) || 0;
	const fullState = await replayStateWithFullBookFallback(query, rgsState, payoutMultiplier);

	replayDebugLog('[ReplayMode] ready', {
		mode: normalizeLegacyBetModeKey(query.mode),
		event: query.event,
		eventCount: fullState.length,
		eventTypes: eventTypes(fullState),
	});

	const bet: Bet = {
		...(data as Bet),
		state: fullState as Bet['state'],
		event: '0',
		active: data.active === true,
		mode: normalizeLegacyBetModeKey(query.mode),
		amount: resolveReplayAmountApi(query, data.amount),
	};

	return {
		payout: typeof data.payout === 'number' ? data.payout : undefined,
		payoutMultiplier,
		costMultiplier: Number(data.costMultiplier) || 1,
		bet,
	};
};
