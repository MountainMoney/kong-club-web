/**
 * Stake DisplayAmount helpers (from Summit drop-in stakeCompliance.ts).
 * Penguin MODE_RTP / INFO_PAYTABLE omitted — MM math lives in math-sdk.
 */
import { bookEventAmountToNormalisedAmount, numberToFloat } from 'utils-shared/amount';
import { stateBet } from 'state-shared';

import { MAX_WIN_MULTIPLIER } from './winCountTier';

export type MoneyKind = 'balance' | 'bet' | 'win';

type CurrencyDisplayMeta = {
	symbol: string;
	decimals: number;
	symbolAfter?: boolean;
};

const STAKE_CURRENCY_META: Record<string, CurrencyDisplayMeta> = {
	USD: { symbol: '$', decimals: 2 },
	CAD: { symbol: 'CA$', decimals: 2 },
	JPY: { symbol: '¥', decimals: 0 },
	EUR: { symbol: '€', decimals: 2 },
	RUB: { symbol: '₽', decimals: 2 },
	CNY: { symbol: 'CN¥', decimals: 2 },
	PHP: { symbol: '₱', decimals: 2 },
	INR: { symbol: '₹', decimals: 2 },
	IDR: { symbol: 'Rp', decimals: 0 },
	KRW: { symbol: '₩', decimals: 0 },
	BRL: { symbol: 'R$', decimals: 2 },
	MXN: { symbol: 'MX$', decimals: 2 },
	DKK: { symbol: 'KR', decimals: 2, symbolAfter: true },
	PLN: { symbol: 'zł', decimals: 2, symbolAfter: true },
	VND: { symbol: '₫', decimals: 0, symbolAfter: true },
	TRY: { symbol: '₺', decimals: 2 },
	CLP: { symbol: 'CLP', decimals: 0, symbolAfter: true },
	ARS: { symbol: 'ARS', decimals: 2, symbolAfter: true },
	PEN: { symbol: 'S/', decimals: 2, symbolAfter: true },
	NGN: { symbol: '₦', decimals: 0 },
	SAR: { symbol: 'SAR', decimals: 2, symbolAfter: true },
	ILS: { symbol: 'ILS', decimals: 2, symbolAfter: true },
	AED: { symbol: 'AED', decimals: 2, symbolAfter: true },
	TWD: { symbol: 'NT$', decimals: 2 },
	NOK: { symbol: 'kr', decimals: 2 },
	KWD: { symbol: 'KD', decimals: 2 },
	JOD: { symbol: 'JD', decimals: 2 },
	CRC: { symbol: '₡', decimals: 2 },
	TND: { symbol: 'TND', decimals: 2, symbolAfter: true },
	SGD: { symbol: 'SG$', decimals: 2 },
	MYR: { symbol: 'RM', decimals: 2 },
	OMR: { symbol: 'OMR', decimals: 2, symbolAfter: true },
	QAR: { symbol: 'QAR', decimals: 2, symbolAfter: true },
	BHD: { symbol: 'BD', decimals: 2 },
	XGC: { symbol: 'GC', decimals: 2, symbolAfter: true },
	XSC: { symbol: 'SC', decimals: 2, symbolAfter: true },
	AGC: { symbol: 'AGC', decimals: 0, symbolAfter: true },
	GC: { symbol: 'GC', decimals: 2, symbolAfter: true },
	XEC: { symbol: 'SC', decimals: 2, symbolAfter: true },
	ASC: { symbol: 'SC', decimals: 2, symbolAfter: true },
	SC: { symbol: 'SC', decimals: 2, symbolAfter: true },
};

function currencyDisplayMeta(currency = stateBet.currency || 'USD'): CurrencyDisplayMeta {
	const code = currency.toUpperCase();
	return STAKE_CURRENCY_META[code] ?? { symbol: code, decimals: 2, symbolAfter: true };
}

function amountLocale(): string {
	if (typeof navigator !== 'undefined' && navigator.language) return navigator.language;
	return 'en-US';
}

function formatAmountNumber(amount: number, minDp: number, maxDp: number): string {
	return amount.toLocaleString(amountLocale(), {
		minimumFractionDigits: minDp,
		maximumFractionDigits: Math.max(minDp, maxDp),
	});
}

function attachCurrencySymbol(formattedAmount: string, meta: CurrencyDisplayMeta): string {
	if (meta.symbolAfter) return `${formattedAmount} ${meta.symbol}`;
	return `${meta.symbol}${formattedAmount}`;
}

function winFractionDigits(value: number): number {
	const scaled = Math.round(Math.abs(value) * 10_000);
	if (scaled === 0 && value !== 0) return 4;
	if (scaled % 100 === 0) return 2;
	if (scaled % 10 === 0) return 3;
	return 4;
}

function fractionDigits(amount: number, kind: MoneyKind, decimals: number): number {
	if (decimals <= 0) return 0;
	if (kind !== 'win') return decimals;
	return Math.max(decimals, winFractionDigits(Math.abs(amount)));
}

function formatCurrencyAmount(value: number, kind: MoneyKind): string {
	const amount = numberToFloat(value);
	const meta = currencyDisplayMeta();
	const dp = fractionDigits(amount, kind, meta.decimals);
	const formatted = formatAmountNumber(amount, dp, dp);
	return attachCurrencySymbol(formatted, meta);
}

export function formatMoney(value: number, kind: MoneyKind = 'balance', _social = false): string {
	const amount = Number.isFinite(value) ? value : 0;
	void _social;
	return formatCurrencyAmount(amount, kind);
}

export type MoneyParts = {
	prefix: string;
	whole: string;
	cents: string;
	suffix: string;
};

export function currencyDisplayPrefix(_social = false): string {
	void _social;
	const meta = currencyDisplayMeta();
	return meta.symbolAfter ? '' : meta.symbol;
}

export function currencyDisplaySuffix(_social = false): string {
	void _social;
	const meta = currencyDisplayMeta();
	return meta.symbolAfter ? ` ${meta.symbol}` : '';
}

export function formatMoneyParts(
	value: number,
	social = false,
	opts?: { maxFractionDigits?: number },
): MoneyParts {
	const abs = Number.isFinite(value) ? value : 0;
	const decimals = currencyDisplayMeta().decimals;
	let maxDp =
		opts?.maxFractionDigits != null
			? Math.max(0, Math.min(4, opts.maxFractionDigits))
			: decimals <= 0
				? 0
				: Math.max(decimals, winFractionDigits(abs));
	if (decimals <= 0) maxDp = 0;
	const minDp = decimals <= 0 ? 0 : Math.min(decimals, maxDp);
	const fixed = abs.toLocaleString('en-US', {
		minimumFractionDigits: minDp,
		maximumFractionDigits: maxDp,
	});
	const dot = fixed.lastIndexOf('.');
	const whole = dot >= 0 ? fixed.slice(0, dot) : fixed;
	const frac = dot >= 0 ? fixed.slice(dot + 1) : maxDp > 0 ? '00' : '';
	const cents = maxDp > 0 ? frac.padEnd(minDp, '0') : '';
	return {
		prefix: currencyDisplayPrefix(social),
		whole,
		cents,
		suffix: currencyDisplaySuffix(social),
	};
}

function currencyWouldHide(value: number): boolean {
	const abs = Math.abs(value);
	if (abs === 0) return false;
	const metaDp = currencyDisplayMeta().decimals;
	const factor = 10 ** Math.max(0, metaDp);
	return Math.round((abs + Number.EPSILON) * factor) / factor === 0;
}

export function roundMoney(value: number, kind: MoneyKind = 'balance'): number {
	const places = kind === 'win' ? 4 : 2;
	const factor = 10 ** places;
	return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function roundBoardMoney(value: number): number {
	const abs = Number.isFinite(value) ? value : 0;
	if (currencyWouldHide(abs)) return roundMoney(abs, 'win');
	const metaDp = currencyDisplayMeta().decimals;
	const factor = 10 ** Math.max(0, metaDp);
	return Math.round((abs + Number.EPSILON) * factor) / factor;
}

export function boardDisplayFractionDigits(value: number): number {
	const abs = Number.isFinite(value) ? Math.abs(value) : 0;
	if (currencyWouldHide(abs)) return winFractionDigits(abs);
	return currencyDisplayMeta().decimals;
}

/** Cash shown as a win must never exceed 25,000× the active bet. */
export function capWinCurrency(value: number, bet = stateBet.wageredBetAmount || stateBet.betAmount): number {
	const n = Number(value);
	if (!Number.isFinite(n) || n <= 0) return 0;
	const betN = Number(bet);
	const cap = (Number.isFinite(betN) && betN > 0 ? betN : 1) * MAX_WIN_MULTIPLIER;
	return Math.min(n, cap);
}

export function formatBoardWin(value: number, social = false): string {
	const abs = capWinCurrency(Number.isFinite(value) ? value : 0);
	if (currencyDisplayMeta().decimals <= 0) return formatMoney(abs, 'balance', social);
	if (currencyWouldHide(abs)) return formatMoney(abs, 'win', social);
	return formatMoney(abs, 'balance', social);
}

/** Book-event win amounts (popup count-up, cluster floats) in the active currency. */
export function formatBookWin(bookAmount: number, social = false): string {
	const normalised = bookEventAmountToNormalisedAmount(
		Number.isFinite(bookAmount) ? bookAmount : 0,
	);
	return formatBoardWin(normalised, social);
}
