import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
	buildMathProfile,
	classifyBook,
	measureOdds,
} from '../../scripts/generate-math-profile.mjs';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const indexPath = path.join(appRoot, 'src/stories/data/math_books/index.json');
const profilePath = path.join(appRoot, 'src/game/mathProfile.json');

const read = (file: string) => fs.readFileSync(file, 'utf8');

test('committed profile matches index.json and is what the UI imports', () => {
	const index = JSON.parse(read(indexPath));
	const committed = JSON.parse(read(profilePath));
	const fresh = buildMathProfile(index, { appRoot, booksByMode: {} });
	assert.deepEqual(
		committed.modes.map((mode: { id: string }) => mode.id),
		index.modes.map((mode: { id: string }) => mode.id),
	);
	for (const mode of fresh.modes) {
		const shipped = committed.modes.find((entry: { id: string }) => entry.id === mode.id);
		assert.ok(shipped, mode.id);
		assert.equal(shipped.cost, mode.cost);
		assert.equal(shipped.rtp, mode.rtp);
		assert.equal(shipped.maxWin, mode.maxWin);
		assert.equal(shipped.label, mode.label);
		assert.deepEqual(shipped.odds, mode.odds);
	}
	assert.equal(committed.rtp, index.rtp);
	assert.equal(committed.maxWin, index.maxWin);
});

test('books replace declared max win, RTP, and Mystery Bonus odds', () => {
	const index = {
		rtp: 0.5,
		maxWin: 100,
		minBooksToMeasure: 1000,
		modes: [
			{
				id: 'bonus_pick',
				label: 'Mystery Bonus',
				socialLabel: 'Mystery Feature',
				cost: 10,
				measureFromBooks: true,
				odds: [
					{ id: 'dead', when: 'noBonus', label: 'dead spin', socialLabel: 'dead play', percent: 1 },
					{
						id: 'hear',
						state: ['start_bonus_hear'],
						label: 'Hear No Evil',
						percent: 1,
					},
					{
						id: 'madness',
						state: ['start_bonus_madness'],
						label: 'Monkey Madness',
						percent: 1,
					},
				],
			},
		],
	};
	const book = (payout: number, state: string) => ({
		payoutMultiplier: payout,
		events: state ? [{ type: 'kongClubMode', state }] : [],
	});
	const books = [
		...Array.from({ length: 10 }, () => book(0, '')),
		...Array.from({ length: 9 }, () => book(20, 'start_bonus_hear')),
		...Array.from({ length: 1 }, () => book(250, 'start_bonus_madness')),
	];
	assert.equal(classifyBook(books[0], index.modes[0].odds), 'dead');
	assert.equal(classifyBook(books[10], index.modes[0].odds), 'hear');
	const odds = measureOdds(books, index.modes[0].odds);
	assert.deepEqual(
		odds.map((outcome: { id: string; percent: number }) => [outcome.id, outcome.percent]),
		[
			['dead', 50],
			['hear', 45],
			['madness', 5],
		],
	);
	const profile = buildMathProfile(index, {
		booksByMode: { bonus_pick: books },
		lutByMode: {
			bonus_pick: [
				{ weight: 50, payout: 0 },
				{ weight: 45, payout: 20 },
				{ weight: 5, payout: 250 },
			],
		},
	});
	const mode = profile.modes[0];
	assert.equal(mode.measured, true);
	assert.equal(mode.maxWin, 250);
	assert.equal(mode.cost, 10);
	assert.equal(mode.rtp, 2.15);
	assert.equal(mode.odds[0].socialLabel, 'dead play');
	assert.equal(
		mode.odds
			.map((outcome: { percent: number; label: string }) => `${outcome.percent}% ${outcome.label}`)
			.join(', '),
		'50% dead spin, 45% Hear No Evil, 5% Monkey Madness',
	);
});

test('rules and buy UI do not hardcode cost, RTP, max win, or bonus odds', () => {
	const files = [
		'src/game/config.ts',
		'src/game/gameRulesContent.ts',
		'src/game/betModes.ts',
		'src/game/buyBonusScreen.ts',
		'src/game/ggUi/offers.ts',
		'src/game/winCountTier.ts',
	];
	const banned = [
		/50%\s+dead/,
		/45%\s+Hear/,
		/cost:\s*380/,
		/max_win:\s*25000/,
		/rtp:\s*0\.965/,
		/25000×/,
	];
	for (const file of files) {
		const source = read(path.join(appRoot, file));
		for (const pattern of banned) {
			assert.equal(pattern.test(source), false, `${file} matches ${pattern}`);
		}
	}
});
