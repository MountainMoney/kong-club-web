/**
 * Regression for coin-view lifetime, winInfo call shape,
 * and feature-spin face sums vs book payout. No payout code is changed.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { shouldRetireCoinView } from '../src/game/coinViewLifetime.ts';
import {
	COIN_FACE_VALUES,
	bookCoinKind,
	coinFaceBands,
	coinValueRulesSentence,
	formatCoinFaceLabel,
} from '../src/game/coinFacePools.ts';

const root = dirname(fileURLToPath(import.meta.url));
const fail = (message) => {
	throw new Error(message);
};

const homeY = 200;
const maskBottom = 400;

if (
	!shouldRetireCoinView({
		riding: true,
		dismissActive: true,
		symbolY: homeY - 40,
		homeY,
		maskBottom,
	})
) {
	fail('a drop-in from above must retire the coin view');
}
if (
	!shouldRetireCoinView({
		riding: true,
		dismissActive: false,
		symbolY: homeY,
		homeY,
		maskBottom,
	})
) {
	fail('a view that rode the leave must retire once dismiss ends, even at home');
}
if (
	shouldRetireCoinView({
		riding: false,
		dismissActive: false,
		symbolY: homeY,
		homeY,
		maskBottom,
	})
) {
	fail('a settled coin that is not riding stays');
}
if (
	!shouldRetireCoinView({
		riding: false,
		dismissActive: true,
		symbolY: maskBottom,
		homeY,
		maskBottom,
	})
) {
	fail('a symbol below the mask retires the view');
}
if (
	shouldRetireCoinView({
		riding: true,
		dismissActive: true,
		symbolY: homeY - 8,
		homeY,
		maskBottom,
	})
) {
	fail('a small bounce above home is not a new drop-in');
}

const handler = readFileSync(resolve(root, '../src/game/bookEventHandlerMap.ts'), 'utf8');
if (handler.includes('animateSymbols(uniqueSymbolPositions')) {
	fail('winInfo still passes an array into animateSymbols');
}
if (!handler.includes('animateSymbols({ positions: win.positions })')) {
	fail('winInfo must call animateSymbols({ positions: win.positions })');
}

const books = JSON.parse(
	readFileSync(resolve(root, '../src/stories/data/math_books/feature_spin_forced.json'), 'utf8'),
);
let activations = 0;
for (const entry of books) {
	for (const event of entry.book?.events ?? []) {
		if (event.type !== 'boardActivation') continue;
		activations += 1;
		const items = event.coinFeature?.items ?? [];
		const paid = items
			.filter((item) => item.kind === 'coin' || item.kind === 'collector')
			.reduce((sum, item) => sum + Number(item.payout ?? item.displayValue ?? 0), 0);
		const total = Number(event.coinFeature?.totalPayout);
		const activation = Number(event.activationWin) / 100;
		const paidRound = Math.round(paid * 100) / 100;
		const totalRound = Math.round(total * 100) / 100;
		const activationRound = Math.round(activation * 100) / 100;
		if (paidRound !== totalRound || paidRound !== activationRound) {
			fail(
				`book ${entry.book?.id} faces ${paidRound} totalPayout ${totalRound} activation ${activationRound}`,
			);
		}
	}
}
if (activations === 0) fail('no feature-spin activations scanned');

const EXPECTED_FACES = {
	CB: [1, 2, 3, 4],
	CS: [5, 10, 15, 20],
	CG: [25, 50, 100, 250, 500, 1000],
};
for (const symbol of ['CB', 'CS', 'CG']) {
	const faces = COIN_FACE_VALUES[symbol];
	const expected = EXPECTED_FACES[symbol];
	if (faces.length !== expected.length || faces.some((face, i) => face !== expected[i])) {
		fail(`${symbol} pool ${faces} != ${expected}`);
	}
}
const bands = coinFaceBands();
if (bands.silver !== 5 || bands.gold !== 25) {
	fail(`metal bands must stay 5 / 25, got ${bands.silver} / ${bands.gold}`);
}
if (
	formatCoinFaceLabel(0.2) !== '0.2' ||
	formatCoinFaceLabel(0.5) !== '0.5' ||
	formatCoinFaceLabel(1000) !== '1000'
) {
	fail(
		`new face labels got ${formatCoinFaceLabel(0.2)}, ${formatCoinFaceLabel(0.5)}, ${formatCoinFaceLabel(1000)}`,
	);
}
if (formatCoinFaceLabel(1) !== '1' || formatCoinFaceLabel(100) !== '100' || formatCoinFaceLabel(20) !== '20') {
	fail('face labels dropped an integer');
}
if (bookCoinKind('clover') !== 'multiplier' || bookCoinKind('pot') !== 'collector') {
	fail('live book kinds clover/pot must map to multiplier/collector');
}
if (bookCoinKind('coin') !== 'coin' || bookCoinKind('multiplier') !== 'multiplier') {
	fail('older book kinds must stay');
}
const rules = coinValueRulesSentence(false);
if (
	!rules.includes('(CB) 1, 2, 3, 4;') ||
	!rules.includes('5, 10, 15, 20') ||
	!rules.includes('25, 50, 100, 250, 500, 1000')
) {
	fail(`rules sentence missing the shared pool: ${rules}`);
}
if (/0\.2|0\.4|0\.5|0\.6|0\.8|1\.4|\b7\b/.test(rules)) {
	fail(`rules sentence still lists a retired face: ${rules}`);
}

console.log(`ok: coin lifetime, winInfo call, ${activations} feature-spin payouts match, one coin table`);
