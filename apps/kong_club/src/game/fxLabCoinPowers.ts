/**
 * FxLab coin-power mocks — MULTI / COLLECTOR.
 * TIER_SHIFT retired 2026-08-12.
 *
 * - MULTI: 8-way adjacent; 2/3/4/5/10/20 @ 35/28/18/12/5/2 (live math rare)
 * - Resolve is column-major: clovers apply one at a time then stay paused;
 *   collectors vacuum coins and every other pot. After collect the pot
 *   stays as a prize so clovers can multiply it; the next pot sucks it like a
 *   coin. Last pot stays and pays.
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

/** Vacuumed coins, sucked old pots, and clover cells — never the sitting acting pot. */
const regenTargets = (
	state: CoinFeatureItem[],
	sitting: { reel: number; row: number },
): CoinFeatureItem[] =>
	state.filter((item) => {
		if (
			item.kind === 'collector' &&
			item.reel === sitting.reel &&
			item.row === sitting.row &&
			!item.collected
		) {
			return false;
		}
		return Boolean(item.collected) || item.kind === 'multiplier';
	});

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

const applyCollector = (
	items: CoinFeatureItem[],
	at: { reel: number; row: number },
): CoinFeatureItem[] => {
	const isOtherPot = (item: CoinFeatureItem) =>
		item.kind === 'collector' &&
		!item.collected &&
		(item.reel !== at.reel || item.row !== at.row);

	const sum = capPotToBoard(
		items.reduce((s, item) => {
			if (item.reel === at.reel && item.row === at.row) return s;
			if (item.collected) return s;
			if (item.kind === 'coin' || isOtherPot(item)) {
				return s + formatInt(item.displayValue ?? item.value ?? item.payout);
			}
			return s;
		}, 0),
		0,
	);

	return items.map((item) => {
		if (item.reel === at.reel && item.row === at.row && item.kind === 'collector') {
			return {
				...item,
				value: sum,
				displayValue: sum,
				resolvedValue: sum,
				payout: sum,
				powerResolved: true,
			};
		}
		if (item.kind === 'coin' && !item.collected) {
			return {
				...item,
				collected: true,
				powerResolved: true,
				payout: 0,
			};
		}
		if (isOtherPot(item)) {
			return {
				...item,
				collected: true,
				powerResolved: true,
				payout: 0,
			};
		}
		return item;
	});
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
	potHits: Set<string>,
): { state: CoinFeatureItem[]; round: number } => {
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
 * Reveal → leftmost vacuum (pot sits, no regen) → next cycle fills holes →
 * sibling sucks → last pot stays (no regen).
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

	const afterCollect = applyCollector(round1, powerAt).map((item) => cloneItem(item, 2));
	const pot = afterCollect.find(
		(item) => item.kind === 'collector' && item.reel === powerAt.reel && item.row === powerAt.row,
	);
	const collected = formatInt(pot?.resolvedValue ?? 0);

	const items: CoinFeatureItem[] = [...round1, ...afterCollect];
	let potPays = collected;
	let state = afterCollect;
	let round = 2;

	if (reactivate) {
		const potHits = new Set<string>();
		({ state, round } = applyAllUnresolvedClovers(state, items, round, potHits));

		const holes = regenTargets(state, powerAt);
		if (holes.length > 0) {
			round += 1;
			const regen = holes.map((item, i) =>
				rollRegeneratedPrize({ reel: item.reel, row: item.row, level: 3 }, i, round, rng),
			);
			state = mergeReplacements(state, regen).map((item) => cloneItem(item, round));
			items.push(...state);
			state = state.map(stripReactivate);
		}
		({ state, round } = applyAllUnresolvedClovers(state, items, round, potHits));

		const nextPot = state.find(
			(item) =>
				item.kind === 'collector' &&
				!item.collected &&
				!(item.reel === powerAt.reel && item.row === powerAt.row) &&
				!item.powerResolved,
		);
		if (nextPot) {
			round += 1;
			state = applyCollector(state, { reel: nextPot.reel, row: nextPot.row }).map((item) =>
				cloneItem(item, round),
			);
			items.push(...state);
			const paid = state.find(
				(item) =>
					item.kind === 'collector' &&
					item.reel === nextPot.reel &&
					item.row === nextPot.row,
			);
			potPays = formatInt(paid?.resolvedValue ?? 0);
			const nextHoles = regenTargets(state, { reel: nextPot.reel, row: nextPot.row });
			if (nextHoles.length > 0) {
				round += 1;
				const nextRegen = nextHoles.map((item, i) =>
					rollRegeneratedPrize({ reel: item.reel, row: item.row, level: 3 }, i, round, rng),
				);
				state = mergeReplacements(state, nextRegen).map((item) => cloneItem(item, round));
				items.push(...state);
				state = state.map(stripReactivate);
			}
		}
	}

	return { cells, items, totalPayout: capWinMultiplier(potPays + leftoverCoinPayout(state)) };
};

/**
 * Full chain: reveal → clover apply → leftmost vacuum (pot sits, no regen) →
 * next cycle fills coin/clover holes → sibling sucks → last pot stays (no regen).
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

	const round1 = state.map((item) => cloneItem(item, 1));

	state = applyMulti(state, multiAt, multi, ['coin']).map((item) =>
		item.kind === 'multiplier' && item.reel === multiAt.reel && item.row === multiAt.row
			? { ...item, powerResolved: true }
			: item,
	);
	const round2 = state.map((item) => cloneItem(item, 2));

	state = applyCollector(state, potAt);
	const round3 = state.map((item) => cloneItem(item, 3));

	const potHits = new Set<string>();
	const items: CoinFeatureItem[] = [...round1, ...round2, ...round3];
	let round = 3;

	({ state, round } = applyAllUnresolvedClovers(state, items, round, potHits));

	const holes = regenTargets(state, potAt);
	if (holes.length > 0) {
		round += 1;
		const regen = holes.map((item, i) =>
			rollRegeneratedPrize({ reel: item.reel, row: item.row, level: 3 }, i, round, rng),
		);
		state = mergeReplacements(state, regen).map((item) => cloneItem(item, round));
		items.push(...state);
		state = state.map(stripReactivate);
	}

	({ state, round } = applyAllUnresolvedClovers(state, items, round, potHits));

	const acting = state.find(
		(item) => item.kind === 'collector' && item.reel === potAt.reel && item.row === potAt.row,
	);
	const actingPay = formatInt(acting?.resolvedValue ?? 0);

	return {
		cells,
		items,
		totalPayout: capWinMultiplier(actingPay + leftoverCoinPayout(state)),
	};
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
