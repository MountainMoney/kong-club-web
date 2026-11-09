/**
 * FxLab coin-power mocks — MULTI / COLLECTOR.
 * TIER_SHIFT retired 2026-08-12.
 *
 * - MULTI: 8-way adjacent; 2/3/4/5/10/20 @ 35/28/18/12/5/2 (live math rare)
 * - Pot rule (locked spec 2026-11-04 l.18-20, math game_coin_feature):
 *   clovers fire one at a time in reading order and multiply touching coins and
 *   valued pots. Then the LEFTMOST pot collects every coin and every other pot
 *   (empty pots too) and keeps the running total; no other pot ever collects it.
 *   Collected tiles and used clovers flip again (rerun); reruns can land coins,
 *   clovers or pots. When a rerun lands no clover and no pot, the leftmost pot
 *   collects the new coins once more and the game ends. Total = final board sum.
 *   Lab reruns stop before the 10th (10 is the cap and never shipped).
 * - Spawn: any mode, equal rates (coin 100 / MULTI 8 / COLLECTOR 8)
 */

import type { CoinFeatureItem } from './typesBookEvent';
import { roundCoinFace } from './coinFacePools';
import {
	activeCoinFaceValues,
	pickWeightedMultiValue,
} from './coinFeatureNormalize';
import { capPotToBoard, capWinMultiplier, leftoverCoinSum } from './winCountTier';
import {
	coinMetalForFace,
	tileLevelToCoinSymbol,
	tileLevelToMultiplier,
	emptyTileLevels,
	MAX_TILE_LEVEL,
} from './tileLevelVisual';

export type LitCell = { reel: number; row: number; level: number };

const ADJACENT_8: Array<[number, number]> = [
	[-1, -1],
	[-1, 0],
	[-1, 1],
	[0, -1],
	[0, 1],
	[1, -1],
	[1, 0],
	[1, 1],
];

const pickFace = (symbol: 'CB' | 'CS' | 'CG', index: number) => {
	const pool = activeCoinFaceValues()[symbol];
	return pool[index % pool.length]!;
};

const isAdjacent8 = (a: { reel: number; row: number }, b: { reel: number; row: number }) =>
	ADJACENT_8.some(([dr, dc]) => a.reel + dr === b.reel && a.row + dc === b.row);

const cloneItem = (
	item: CoinFeatureItem,
	round: number,
	patch?: Partial<CoinFeatureItem>,
): CoinFeatureItem => ({
	...item,
	...patch,
	round,
});

export const mockPowerBoardCells = (): LitCell[] => [
	{ reel: 1, row: 1, level: 2 },
	{ reel: 1, row: 2, level: 3 },
	{ reel: 2, row: 1, level: 2 },
	{ reel: 2, row: 2, level: 5 },
	{ reel: 2, row: 3, level: 3 },
	{ reel: 3, row: 1, level: 4 },
	{ reel: 3, row: 2, level: 2 },
	{ reel: 3, row: 3, level: 6 },
	{ reel: 4, row: 2, level: 3 },
];

const coinFromCell = (cell: LitCell, faceIndex: number, round: number): CoinFeatureItem => {
	const symbol = (tileLevelToCoinSymbol(cell.level) ?? 'CB') as 'CB' | 'CS' | 'CG';
	const face = pickFace(symbol, faceIndex);
	return {
		reel: cell.reel,
		row: cell.row,
		kind: 'coin',
		symbol,
		value: face,
		displayValue: face,
		tileLevel: cell.level,
		tileMultiplier: 1,
		resolvedValue: face,
		payout: face,
		round,
	};
};

const powerItem = (
	reel: number,
	row: number,
	kind: 'multiplier' | 'collector',
	value: number,
	round: number,
	extra?: Partial<CoinFeatureItem>,
): CoinFeatureItem => {
	const symbol = kind === 'multiplier' ? 'XM' : 'CL';
	const resolved = extra?.resolvedValue ?? value;
	return {
		reel,
		row,
		kind,
		symbol,
		value,
		displayValue: kind === 'collector' ? resolved : value,
		tileLevel: 1,
		tileMultiplier: 1,
		resolvedValue: resolved,
		payout: extra?.payout ?? resolved,
		round,
		...extra,
	};
};

const ensurePowerCell = (cells: LitCell[], at: { reel: number; row: number }, level: number) => {
	if (!cells.some((c) => c.reel === at.reel && c.row === at.row)) {
		cells.push({ reel: at.reel, row: at.row, level });
	}
};

const formatInt = (n: number) => roundCoinFace(n);

/** Rerun cells: tiles the pot collected from and clovers already used. Never the holding pot. */
const regenTargets = (state: CoinFeatureItem[]): CoinFeatureItem[] =>
	state.filter(
		(item) =>
			Boolean(item.collected) || (item.kind === 'multiplier' && Boolean(item.powerResolved)),
	);

/** Leftmost (lowest reel, then top row) uncollected pot. It holds the coin-game total. */
const leftmostPot = (items: CoinFeatureItem[]): CoinFeatureItem | null =>
	items
		.filter((item) => item.kind === 'collector' && !item.collected)
		.sort((a, b) => a.reel - b.reel || a.row - b.row)[0] ?? null;

/** Pay on the board right now: uncollected coins and pots. */
const boardSum = (items: CoinFeatureItem[]): number =>
	capWinMultiplier(
		items
			.filter((item) => !item.collected && (item.kind === 'coin' || item.kind === 'collector'))
			.reduce((sum, item) => sum + valueOf(item), 0),
	);

const applyMulti = (
	items: CoinFeatureItem[],
	at: { reel: number; row: number },
	multi: number,
	kinds: Array<'coin' | 'collector'> = ['coin', 'collector'],
	potHits?: Set<string>,
): CoinFeatureItem[] => {
	const mid = items.map((item) => {
		if (!isAdjacent8(item, at)) return item;
		if (item.kind === 'coin' && kinds.includes('coin') && !item.collected) {
			const face = capWinMultiplier(roundCoinFace(formatInt(item.displayValue ?? item.value) * multi));
			const metal = coinMetalForFace(face, item.tileLevel ?? 1);
			return {
				...item,
				value: face,
				displayValue: face,
				resolvedValue: face,
				payout: face,
				symbol: metal.symbol,
				tileLevel: metal.tileLevel,
				powerResolved: true,
			};
		}
		return item;
	});
	const leftover = leftoverCoinSum(mid);
	return mid.map((item) => {
		if (!isAdjacent8(item, at)) return item;
		if (item.kind === 'collector' && kinds.includes('collector') && !item.collected) {
			const hitKey = `${at.reel}:${at.row}->${item.reel}:${item.row}`;
			if (potHits?.has(hitKey)) return item;
			const base = formatInt(item.resolvedValue ?? item.displayValue ?? item.value);
			if (base <= 0) return item;
			const face = capPotToBoard(base * multi, leftover);
			potHits?.add(hitKey);
			return {
				...item,
				value: face,
				displayValue: face,
				resolvedValue: face,
				payout: face,
				powerResolved: true,
			};
		}
		return item;
	});
};

/** The pot at `at` keeps its own value and absorbs every coin and every other pot. */
const applyCollector = (
	items: CoinFeatureItem[],
	at: { reel: number; row: number },
): CoinFeatureItem[] => {
	const isHolder = (item: CoinFeatureItem) =>
		item.kind === 'collector' && item.reel === at.reel && item.row === at.row;
	const absorbs = (item: CoinFeatureItem) =>
		!item.collected && !isHolder(item) && (item.kind === 'coin' || item.kind === 'collector');

	const own = valueOf(items.find(isHolder) ?? ({ value: 0 } as CoinFeatureItem));
	const sum = capWinMultiplier(
		roundCoinFace(items.reduce((s, item) => (absorbs(item) ? s + valueOf(item) : s), own)),
	);

	return items.map((item) => {
		if (isHolder(item)) {
			return {
				...item,
				value: sum,
				displayValue: sum,
				resolvedValue: sum,
				payout: sum,
				powerResolved: true,
				collected: false,
			};
		}
		if (absorbs(item)) {
			return { ...item, collected: true, powerResolved: true, payout: 0 };
		}
		return item;
	});
};

/** Leftmost pot collects, if there is a pot and anything for it to take. */
const collectWithLeftmostPot = (
	state: CoinFeatureItem[],
	items: CoinFeatureItem[],
	round: number,
): { state: CoinFeatureItem[]; round: number } => {
	const holder = leftmostPot(state);
	if (!holder) return { state, round };
	const hasTargets = state.some(
		(item) =>
			!item.collected &&
			(item.kind === 'coin' || item.kind === 'collector') &&
			(item.reel !== holder.reel || item.row !== holder.row),
	);
	if (!hasTargets) return { state, round };
	const next = round + 1;
	const collected = applyCollector(state, holder).map((item) => cloneItem(item, next));
	items.push(...collected);
	return { state: collected, round: next };
};

const mergeReplacements = (
	working: CoinFeatureItem[],
	replacements: CoinFeatureItem[],
): CoinFeatureItem[] => {
	const skip = new Set(replacements.map((item) => `${item.reel}:${item.row}`));
	return [...working.filter((item) => !skip.has(`${item.reel}:${item.row}`)), ...replacements];
};

const leftoverCoinPayout = (items: CoinFeatureItem[]) =>
	capWinMultiplier(
		items
			.filter((item) => item.kind === 'coin' && !item.collected)
			.reduce((sum, item) => sum + formatInt(item.displayValue ?? item.value), 0),
	);

const stripReactivate = (item: CoinFeatureItem): CoinFeatureItem => {
	if (!item.reactivate) return item;
	const { reactivate: _reactivate, ...rest } = item;
	return rest;
};

const leftmostUnresolvedClover = (items: CoinFeatureItem[]): CoinFeatureItem | null =>
	items
		.filter((item) => item.kind === 'multiplier' && !item.powerResolved)
		.sort((a, b) => a.reel - b.reel || a.row - b.row)[0] ?? null;

/** Mirror math: unresolved clovers apply (and stay) before the pending pot is replaced. */
const applyAllUnresolvedClovers = (
	state: CoinFeatureItem[],
	items: CoinFeatureItem[],
	round: number,
): { state: CoinFeatureItem[]; round: number } => {
	const potHits = new Set<string>();
	let working = state;
	let roundIndex = round;
	for (;;) {
		const head = leftmostUnresolvedClover(working);
		if (!head) break;
		roundIndex += 1;
		working = applyMulti(
			working,
			head,
			formatInt(head.value),
			['coin', 'collector'],
			potHits,
		).map((item) =>
			item.kind === 'multiplier' && item.reel === head.reel && item.row === head.row
				? { ...item, powerResolved: true }
				: item,
		);
		const stamped = working.map((item) => cloneItem(stripReactivate(item), roundIndex));
		items.push(...stamped);
		working = stamped;
	}
	return { state: working, round: roundIndex };
};

/**
 * Lab regen mix — denser than live so the feature is visible in FxLab.
 * Live math will use equal rare rates across modes (RTP-tuned, much lower).
 */
const rollRegeneratedPrize = (
	cell: LitCell,
	index: number,
	round: number,
	rng: () => number,
): CoinFeatureItem => {
	const roll = rng();
	// Lab demo rates (not live): ~10% MULTI, ~6% POT, rest coins.
	if (roll < 0.1) {
		return powerItem(cell.reel, cell.row, 'multiplier', pickWeightedMultiValue(rng), round, {
			reactivate: true,
		});
	}
	if (roll < 0.16) {
		return powerItem(cell.reel, cell.row, 'collector', 0, round, {
			resolvedValue: 0,
			payout: 0,
			displayValue: 0,
			reactivate: true,
		});
	}
	return { ...coinFromCell(cell, index + 7, round), reactivate: true };
};

/** Spec l.20: 10 reruns is the cap and must never be reached. */
const MAX_LAB_RERUNS = 9;

/**
 * Rerun loop: collected tiles and used clovers flip again; clovers fire; the
 * leftmost pot collects. A rerun with no clover and no pot is the last one.
 */
const runReruns = (
	start: CoinFeatureItem[],
	items: CoinFeatureItem[],
	startRound: number,
	rng: () => number,
): { state: CoinFeatureItem[]; round: number } => {
	let state = start;
	let round = startRound;
	for (let rerun = 0; rerun < MAX_LAB_RERUNS; rerun += 1) {
		const holes = regenTargets(state);
		if (holes.length === 0) break;
		round += 1;
		const regenRound = round;
		const regen = holes.map((item, i) =>
			rollRegeneratedPrize({ reel: item.reel, row: item.row, level: 3 }, i, regenRound, rng),
		);
		const landedPower = regen.some((item) => item.kind !== 'coin');
		state = mergeReplacements(state, regen).map((item) => cloneItem(item, regenRound));
		items.push(...state);
		state = state.map(stripReactivate);
		({ state, round } = applyAllUnresolvedClovers(state, items, round));
		({ state, round } = collectWithLeftmostPot(state, items, round));
		if (!landedPower) break;
	}
	return { state, round };
};

/** Round1 reveal → round2 MULTI applied in place. */
export const buildMultiPowerSequence = (opts?: {
	cells?: LitCell[];
	multi?: number;
	powerAt?: { reel: number; row: number };
}): { cells: LitCell[]; items: CoinFeatureItem[]; totalPayout: number } => {
	const cells = [...(opts?.cells ?? mockPowerBoardCells())];
	const powerAt = opts?.powerAt ?? { reel: 2, row: 2 };
	const multi = opts?.multi ?? pickWeightedMultiValue();
	ensurePowerCell(cells, powerAt, 5);

	const coins = cells
		.filter((c) => !(c.reel === powerAt.reel && c.row === powerAt.row))
		.map((c, i) => coinFromCell(c, i, 1));

	const round1: CoinFeatureItem[] = [
		...coins,
		powerItem(powerAt.reel, powerAt.row, 'multiplier', multi, 1),
	];

	const afterMulti = applyMulti(round1, powerAt, multi).map((item) =>
		cloneItem(
			item.kind === 'multiplier' && item.reel === powerAt.reel && item.row === powerAt.row
				? { ...item, powerResolved: true }
				: item,
			2,
		),
	);

	const totalPayout = leftoverCoinPayout(afterMulti);

	return { cells, items: [...round1, ...afterMulti], totalPayout };
};

/**
 * Reveal → leftmost pot collects every coin and the other pot → reruns until a
 * rerun lands no clover and no pot. The leftmost pot holds the total.
 */
export const buildCollectorPowerSequence = (opts?: {
	cells?: LitCell[];
	powerAt?: { reel: number; row: number };
	otherPotAt?: { reel: number; row: number };
	reactivate?: boolean;
	rng?: () => number;
}): { cells: LitCell[]; items: CoinFeatureItem[]; totalPayout: number } => {
	const cells = [...(opts?.cells ?? mockPowerBoardCells())];
	const powerAt = opts?.powerAt ?? { reel: 2, row: 2 };
	const otherPotAt = opts?.otherPotAt ?? { reel: 4, row: 2 };
	const reactivate = opts?.reactivate ?? true;
	const rng = opts?.rng ?? Math.random;
	ensurePowerCell(cells, powerAt, 6);
	ensurePowerCell(cells, otherPotAt, 3);

	const isPotCell = (cell: LitCell) =>
		(cell.reel === powerAt.reel && cell.row === powerAt.row) ||
		(cell.reel === otherPotAt.reel && cell.row === otherPotAt.row);

	const coins = cells.filter((c) => !isPotCell(c)).map((c, i) => coinFromCell(c, i, 1));

	const emptyPot = (at: { reel: number; row: number }, round: number): CoinFeatureItem =>
		powerItem(at.reel, at.row, 'collector', 0, round, {
			resolvedValue: 0,
			payout: 0,
			displayValue: 0,
		});

	const round1: CoinFeatureItem[] = [
		...coins,
		emptyPot(powerAt, 1),
		emptyPot(otherPotAt, 1),
	];

	const items: CoinFeatureItem[] = [...round1];
	let state = round1;
	let round = 1;
	({ state, round } = collectWithLeftmostPot(state, items, round));
	if (reactivate) {
		({ state } = runReruns(state, items, round, rng));
	}

	return { cells, items, totalPayout: boardSum(state) };
};

/**
 * Full chain: reveal → clover fires → leftmost pot collects everything (other pot
 * included) → reruns until a rerun lands no clover and no pot. Total = board sum.
 */
export const buildComboPowerSequence = (rng: () => number = Math.random): {
	cells: LitCell[];
	items: CoinFeatureItem[];
	totalPayout: number;
} => {
	const multiAt = { reel: 2, row: 2 };
	const potAt = { reel: 3, row: 2 };
	const otherPotAt = { reel: 5, row: 2 };

	const coinCells: LitCell[] = [
		{ reel: 1, row: 1, level: 2 },
		{ reel: 1, row: 2, level: 3 },
		{ reel: 1, row: 3, level: 2 },
		{ reel: 2, row: 1, level: 4 },
		{ reel: 2, row: 3, level: 3 },
		{ reel: 3, row: 1, level: 2 },
		{ reel: 3, row: 3, level: 2 },
		{ reel: 4, row: 1, level: 3 },
		{ reel: 4, row: 2, level: 3 },
		{ reel: 4, row: 3, level: 4 },
	];

	const cells: LitCell[] = [
		...coinCells,
		{ reel: multiAt.reel, row: multiAt.row, level: 5 },
		{ reel: potAt.reel, row: potAt.row, level: 6 },
		{ reel: otherPotAt.reel, row: otherPotAt.row, level: 3 },
	];

	const multi = pickWeightedMultiValue(rng);
	const coins = coinCells.map((c, i) => coinFromCell(c, i, 1));
	let state: CoinFeatureItem[] = [
		...coins,
		powerItem(multiAt.reel, multiAt.row, 'multiplier', multi, 1),
		powerItem(potAt.reel, potAt.row, 'collector', 0, 1, {
			resolvedValue: 0,
			payout: 0,
			displayValue: 0,
		}),
		powerItem(otherPotAt.reel, otherPotAt.row, 'collector', 0, 1, {
			resolvedValue: 0,
			payout: 0,
			displayValue: 0,
		}),
	];

	const items: CoinFeatureItem[] = state.map((item) => cloneItem(item, 1));
	state = items.slice();
	let round = 1;
	({ state, round } = applyAllUnresolvedClovers(state, items, round));
	({ state, round } = collectWithLeftmostPot(state, items, round));
	({ state } = runReruns(state, items, round, rng));

	return { cells, items, totalPayout: boardSum(state) };
};

/** Lab sit: 1–5 digit coins (col 0), pots (col 1), MULTI (col 2), extra coins (cols 3–5). */
const SIT_FACE_VALUES = [1, 12, 100, 1000, 10000] as const;

const sitCoin = (reel: number, row: number, level: number, value: number): CoinFeatureItem => {
	const symbol = (tileLevelToCoinSymbol(level) ?? 'CB') as 'CB' | 'CS' | 'CG';
	return {
		reel,
		row,
		kind: 'coin',
		symbol,
		value,
		displayValue: value,
		tileLevel: level,
		tileMultiplier: 1,
		resolvedValue: value,
		payout: value,
		round: 1,
	};
};

export const buildSitBoardSequence = () => {
	const cells: LitCell[] = [];
	const items: CoinFeatureItem[] = [];
	for (let row = 0; row < 5; row += 1) {
		const value = SIT_FACE_VALUES[row]!;
		cells.push({ reel: 0, row, level: 1 }, { reel: 1, row, level: 2 }, { reel: 2, row, level: 3 });
		items.push(sitCoin(0, row, 1, value));
		items.push(
			powerItem(1, row, 'collector', value, 1, {
				resolvedValue: value,
				displayValue: value,
				payout: value,
			}),
		);
		items.push(powerItem(2, row, 'multiplier', value, 1));
		for (let reel = 3; reel < 6; reel += 1) {
			const level = reel === 3 ? 1 : reel === 4 ? 2 : 3;
			cells.push({ reel, row, level });
			items.push(sitCoin(reel, row, level, value));
		}
	}
	const totalPayout = items.reduce((sum, item) => sum + (item.kind === 'multiplier' ? 0 : valueOf(item)), 0);
	return { cells, items, totalPayout: capWinMultiplier(totalPayout) };
};

const valueOf = (item: CoinFeatureItem) =>
	formatInt(item.resolvedValue ?? item.displayValue ?? item.value ?? 0);

export const tilesFromPowerCells = (cells: LitCell[]) => {
	const tileLevels = emptyTileLevels();
	const tileMultipliers = emptyTileLevels();
	for (const cell of cells) {
		const level = Math.min(Math.max(cell.level, 0), MAX_TILE_LEVEL);
		tileLevels[cell.reel]![cell.row] = level;
		tileMultipliers[cell.reel]![cell.row] = tileLevelToMultiplier(level);
	}
	return { tileLevels, tileMultipliers };
};
