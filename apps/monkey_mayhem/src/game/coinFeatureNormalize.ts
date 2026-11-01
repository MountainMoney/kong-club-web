import { normalizeTileLevel, tileLevelToCoinSymbol } from './tileLevelVisual';
import { stateGame } from './stateGame.svelte';
import type { CoinFeatureActivation, CoinFeatureItem } from './typesBookEvent';
import { capWinMultiplier } from './winCountTier';

type LegacyCoinFeatureItem = {
	reel: number;
	row: number;
	level?: number;
	tileLevel?: number;
	kind?: string;
	value?: number;
	multiplier?: number;
	tileMultiplier?: number;
	collectedValue?: number;
	resolvedValue?: number;
	payout?: number;
	symbol?: string;
	round?: number;
	displayValue?: number;
	action?: 'spawn' | 'multi' | 'collect' | 'regen';
	/** True when face was altered by MULTI / collect — do not snap to pool. */
	powerResolved?: boolean;
	collected?: boolean;
	reactivate?: boolean;
};

type LegacyCoinFeatureRound = {
	index: number;
	items: LegacyCoinFeatureItem[];
};

export type RawCoinFeature = Partial<CoinFeatureActivation> & {
	totalMultiplier?: number;
	rounds?: number | LegacyCoinFeatureRound[];
	items?: Array<CoinFeatureItem & { powerResolved?: boolean }>;
};

/** Exact face pools — initial reveal labels must be one of these. */
export const COIN_FACE_VALUES = {
	CB: [1, 2, 3, 4],
	CS: [5, 7, 10, 15, 20],
	CG: [25, 50, 100, 250, 500],
} as const;

/** Clover / MULTI values — matches math `coin_game_multi_values`. */
export const COIN_POWER_MULTI_VALUES = [2, 3, 4, 5, 10, 20] as const;

/** Weights for MULTI faces — locked 35/28/18/12/5/2 (matches math). */
export const COIN_POWER_MULTI_WEIGHTS = [35, 28, 18, 12, 5, 2] as const;

/** Weighted pick from the MULTI pool (lab / FE previews). */
export const pickWeightedMultiValue = (rng: () => number = Math.random): number => {
	const values = COIN_POWER_MULTI_VALUES;
	const weights = COIN_POWER_MULTI_WEIGHTS;
	let total = 0;
	for (const w of weights) total += w;
	let roll = rng() * total;
	for (let i = 0; i < values.length; i += 1) {
		roll -= weights[i]!;
		if (roll <= 0) return values[i]!;
	}
	return values[values.length - 1]!;
};

const ALL_COIN_FACES = new Set<number>([
	...COIN_FACE_VALUES.CB,
	...COIN_FACE_VALUES.CS,
	...COIN_FACE_VALUES.CG,
]);

const coinSymbolForLevel = (level: number): CoinFeatureItem['symbol'] =>
	tileLevelToCoinSymbol(level) ?? 'CB';

const formatNumericDisplay = (value: number): number => Math.round(value);

/** Coin face label — keep up to 2 decimals so scaled bonus faces match paid total. Never show over 25,000×. */
export const formatCoinFaceLabel = (value: number): string => {
	const n = Math.round(capWinMultiplier(value) * 100) / 100;
	if (!Number.isFinite(n) || n <= 0) return '0';
	if (Math.abs(n - Math.round(n)) < 1e-6) return `${Math.round(n)}`;
	return n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
};

const parseCoinFace = (raw: unknown): number => {
	const n = Number(raw);
	if (!Number.isFinite(n)) return 0;
	return Math.round(n * 100) / 100;
};

/** Snap corrupted face×tile labels back to a legal base face. */
export const snapCoinFace = (raw: number, symbol: CoinFeatureItem['symbol']): number => {
	const n = formatNumericDisplay(raw);
	if (ALL_COIN_FACES.has(n)) return n;
	const pool =
		symbol === 'CG'
			? COIN_FACE_VALUES.CG
			: symbol === 'CS'
				? COIN_FACE_VALUES.CS
				: COIN_FACE_VALUES.CB;
	let best = pool[0]!;
	let bestDist = Math.abs(n - best);
	for (const face of pool) {
		const dist = Math.abs(n - face);
		if (dist < bestDist) {
			best = face;
			bestDist = dist;
		}
	}
	return best;
};

const asAction = (
	raw?: string,
): CoinFeatureItem['action'] => {
	if (raw === 'spawn' || raw === 'multi' || raw === 'collect' || raw === 'regen') return raw;
	return undefined;
};

const asKind = (raw?: string): CoinFeatureItem['kind'] => {
	if (raw === 'multiplier' || raw === 'collector' || raw === 'tier_shift') return raw;
	return 'coin';
};

const powerSymbol = (kind: CoinFeatureItem['kind']): CoinFeatureItem['symbol'] => {
	if (kind === 'multiplier') return 'XM';
	if (kind === 'collector') return 'CL';
	if (kind === 'tier_shift') return 'TS';
	return 'CB';
};

const normalizePowerItem = (raw: LegacyCoinFeatureItem, round: number): CoinFeatureItem => {
	const kind = asKind(raw.kind);
	const tileLevel = raw.tileLevel ?? raw.level ?? 1;
	const value = capWinMultiplier(formatNumericDisplay(raw.value ?? raw.displayValue ?? 0));
	const resolved = capWinMultiplier(
		formatNumericDisplay(raw.resolvedValue ?? raw.collectedValue ?? raw.payout ?? value),
	);

	return {
		reel: raw.reel,
		row: raw.row,
		kind,
		symbol: (raw.symbol as CoinFeatureItem['symbol']) ?? powerSymbol(kind),
		value,
		displayValue: kind === 'collector' ? resolved : value,
		tileLevel,
		tileMultiplier: 1,
		resolvedValue: resolved,
		payout: capWinMultiplier(raw.payout ?? resolved),
		round,
		action: asAction(raw.action),
		powerResolved: raw.powerResolved === true ? true : undefined,
		collected: raw.collected === true ? true : undefined,
		reactivate: raw.reactivate === true ? true : undefined,
	};
};

const normalizeCoinItem = (raw: LegacyCoinFeatureItem, round: number): CoinFeatureItem => {
	const tileLevel = raw.tileLevel ?? raw.level ?? 1;
	const symbol = (raw.symbol ?? coinSymbolForLevel(tileLevel)) as CoinFeatureItem['symbol'];
	const coinSymbol =
		symbol === 'CB' || symbol === 'CS' || symbol === 'CG' ? symbol : coinSymbolForLevel(tileLevel);

	const rawFace = parseCoinFace(raw.displayValue ?? raw.value ?? 0);
	const powerResolved = raw.powerResolved === true;
	const isWhole = Math.abs(rawFace - Math.round(rawFace)) < 1e-9;
	const wholeFace = Math.round(rawFace);
	const inPool = isWhole && ALL_COIN_FACES.has(wholeFace);

	// Trust book faces (mode-scaled bonuses, MULTI products). Snap only corrupted whole ints.
	const face = capWinMultiplier(
		powerResolved || !isWhole || inPool
			? rawFace
			: snapCoinFace(wholeFace, coinSymbol),
	);
	const resolved = capWinMultiplier(
		parseCoinFace(raw.resolvedValue ?? raw.collectedValue ?? raw.payout ?? face),
	);

	return {
		reel: raw.reel,
		row: raw.row,
		kind: 'coin',
		symbol: coinSymbol,
		value: face,
		displayValue: face,
		tileLevel,
		tileMultiplier: 1,
		resolvedValue: resolved,
		payout: capWinMultiplier(raw.payout ?? resolved),
		round,
		action: asAction(raw.action),
		powerResolved: powerResolved || undefined,
		collected: raw.collected === true ? true : undefined,
		reactivate: raw.reactivate === true ? true : undefined,
	};
};

const normalizeLegacyItem = (
	raw: LegacyCoinFeatureItem,
	round: number,
	_tileMultipliers?: number[][],
): CoinFeatureItem => {
	const kind = asKind(raw.kind);
	if (kind !== 'coin') return normalizePowerItem(raw, round);
	return normalizeCoinItem(raw, round);
};

export const coinDisplayValue = (item: CoinFeatureItem): number => {
	if (item.kind === 'coin') {
		// Prefer explicit display / resolved — powers / scaled faces may be non-pool.
		if (item.displayValue != null) return capWinMultiplier(parseCoinFace(item.displayValue));
		if (item.resolvedValue != null) return capWinMultiplier(parseCoinFace(item.resolvedValue));
		const symbol = (item.symbol ?? 'CB') as CoinFeatureItem['symbol'];
		const coinSymbol =
			symbol === 'CB' || symbol === 'CS' || symbol === 'CG' ? symbol : 'CB';
		return capWinMultiplier(snapCoinFace(item.value ?? 0, coinSymbol));
	}
	if (item.kind === 'multiplier') return formatNumericDisplay(item.value);
	if (item.kind === 'tier_shift') return 1;
	if (item.kind === 'collector') {
		return capWinMultiplier(parseCoinFace(item.resolvedValue ?? item.payout ?? item.displayValue ?? 0));
	}
	return capWinMultiplier(formatNumericDisplay(item.value));
};

export const coinOverlayLabel = (item: CoinFeatureItem): string => {
	if (item.kind === 'multiplier') return `x${formatCoinFaceLabel(item.value)}`;
	if (item.kind === 'tier_shift') return '';
	if (item.kind === 'collector') {
		const total = capWinMultiplier(item.resolvedValue ?? item.payout ?? item.displayValue ?? 0);
		return total > 0 ? formatCoinFaceLabel(total) : 'POT';
	}
	return formatCoinFaceLabel(coinDisplayValue(item));
};

/** On-grid reveals — coins and powers (excludes off-grid markers at reel/row -1). */
export const coinFeatureGridItems = (items: CoinFeatureItem[]): CoinFeatureItem[] =>
	items.filter((item) => item.reel >= 0 && item.row >= 0);

const itemPay = (item: CoinFeatureItem): number => {
	const n = Number(item.payout ?? item.displayValue ?? item.value ?? 0);
	return Number.isFinite(n) ? capWinMultiplier(n) : 0;
};

/**
 * Paid coin-feature total from the item timeline: counted pots (replaced + last
 * sitting pot) plus leftover uncollected coins. Matches math
 * `counted_pots + leftover`.
 */
export const sumCoinFeaturePaidFromItems = (items: CoinFeatureItem[]): number => {
	const grid = coinFeatureGridItems(items);
	if (grid.length === 0) return 0;

	const byRound = new Map<number, CoinFeatureItem[]>();
	for (const item of grid) {
		const round = item.round ?? 1;
		const list = byRound.get(round);
		if (list) list.push(item);
		else byRound.set(round, [item]);
	}
	const rounds = [...byRound.keys()].sort((a, b) => a - b);
	const latestFace = new Map<string, number>();
	let paid = 0;
	for (const round of rounds) {
		const roundItems = byRound.get(round) ?? [];
		for (const item of roundItems) {
			if (item.kind === 'collector' && item.collected) {
				latestFace.delete(`${item.reel}:${item.row}`);
				continue;
			}
			if (item.kind === 'collector' && item.powerResolved && !item.collected) {
				latestFace.set(`${item.reel}:${item.row}`, itemPay(item));
			}
		}
		for (const item of roundItems) {
			if (!item.reactivate) continue;
			if (item.kind === 'collector' && item.powerResolved && !item.collected) continue;
			const key = `${item.reel}:${item.row}`;
			const face = latestFace.get(key);
			if (face == null) continue;
			paid += face;
			latestFace.delete(key);
		}
	}
	paid += [...latestFace.values()].reduce((sum, value) => sum + value, 0);

	const lastRound = rounds[rounds.length - 1] ?? 1;
	const leftover = (byRound.get(lastRound) ?? [])
		.filter((item) => item.kind === 'coin' && !item.collected)
		.reduce((sum, item) => sum + itemPay(item), 0);

	return capWinMultiplier(Math.round((paid + leftover) * 100) / 100);
};

/** Book `totalPayout` when present; otherwise reconstruct from items. */
export const coinFeaturePaidTotal = (
	items: CoinFeatureItem[],
	bookTotal?: number,
): number => {
	const fromBook = Number(bookTotal);
	if (Number.isFinite(fromBook) && fromBook > 0) {
		return capWinMultiplier(Math.round(fromBook * 100) / 100);
	}
	return sumCoinFeaturePaidFromItems(items);
};

export const normalizeCoinFeatureItems = (
	coinFeature: RawCoinFeature | undefined,
	tileMultipliers?: number[][],
): CoinFeatureItem[] => {
	if (!coinFeature) return [];

	if (Array.isArray(coinFeature.items) && coinFeature.items.length > 0) {
		return coinFeature.items.map((item) =>
			normalizeLegacyItem(
				{
					...item,
					kind: item.kind,
					symbol: item.symbol,
					powerResolved: item.powerResolved,
					collected: item.collected,
					reactivate: item.reactivate,
				},
				item.round ?? 1,
				tileMultipliers,
			),
		);
	}

	if (Array.isArray(coinFeature.rounds)) {
		return coinFeature.rounds.flatMap((round) =>
			(round.items ?? []).map((raw) =>
				normalizeLegacyItem(raw, round.index + 1, tileMultipliers),
			),
		);
	}

	return [];
};

/** Every lit tile must show a prize. Fill holes if a book omitted a cell. */
export const ensurePrizesOnLitTiles = (
	items: CoinFeatureItem[],
	tileLevels?: number[][],
): CoinFeatureItem[] => {
	if (!tileLevels?.length) return items;

	const skipBronze = stateGame.sessionBonusTier === 3;
	const sourceItems = skipBronze
		? items.filter((item) => (item.tileLevel ?? 0) > 1 && item.symbol !== 'CB')
		: items;

	const occupied = new Set(
		sourceItems
			.filter((item) => (item.round ?? 1) === 1 && item.reel >= 0 && item.row >= 0)
			.map((item) => `${item.reel}:${item.row}`),
	);
	const extras: CoinFeatureItem[] = [];

	tileLevels.forEach((reel, reelIndex) => {
		reel.forEach((level, row) => {
			const tileLevel = normalizeTileLevel(level);
			if (tileLevel <= 0 || (skipBronze && tileLevel <= 1) || occupied.has(`${reelIndex}:${row}`))
				return;
			const symbol = tileLevelToCoinSymbol(tileLevel) ?? 'CB';
			const face = COIN_FACE_VALUES[symbol][0] ?? 1;
			extras.push({
				reel: reelIndex,
				row,
				kind: 'coin',
				symbol,
				value: face,
				displayValue: face,
				tileLevel,
				tileMultiplier: 1,
				resolvedValue: face,
				payout: face,
				round: 1,
			});
		});
	});

	if (extras.length > 0) return [...sourceItems, ...extras];
	return sourceItems;
};

export const coinFeatureRevealDurationMs = (
	coinFeature: RawCoinFeature | undefined,
	tileMultipliers?: number[][],
): number => {
	const items = coinFeatureGridItems(normalizeCoinFeatureItems(coinFeature, tileMultipliers));
	const roundNumbers = [...new Set(items.map((item) => item.round ?? 1))].sort((a, b) => a - b);
	let total = 0;
	const hasMulti = items.some((item) => item.kind === 'multiplier');
	for (const round of roundNumbers) {
		const roundItems = items.filter((item) => (item.round ?? 1) === round);
		total += 900 + roundItems.length * 70 + 420;
	}
	if (hasMulti) total += 2200;
	return total || 1200;
};
