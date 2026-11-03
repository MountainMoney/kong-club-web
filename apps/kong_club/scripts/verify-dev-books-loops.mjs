/**
 * Fail FE math-books cache if a cascade stop still has a 5-cluster
 * (Feature nibble abort). Peak is skipped — silent land, no cascade.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const CACHE = path.join(appRoot, '.cache', 'math-books');

const PAYING = ['T', 'J', 'Q', 'K', 'A', 'LE', 'CO', 'OR', 'GR', 'BA'];
const WILD = 'MW';
const SKIP = new Set(['ST', 'CB', 'CS', 'CG']);
const DELTAS = [
	[1, 0],
	[-1, 0],
	[0, 1],
	[0, -1],
];
const MIN_CLUSTER = 5;
const PLAY_ROWS = 5;

const MODES = ['base', 'base_ante', 'feature_spin', 'bonus_see', 'bonus_hear', 'bonus_mystery'];

const cellName = (cell) => (cell && typeof cell === 'object' ? String(cell.name || '') : '');

const playColumn = (column) => {
	const cells = Array.isArray(column) ? column : [];
	if (cells.length >= PLAY_ROWS + 2) return cells.slice(1, 1 + PLAY_ROWS);
	return cells.slice(0, PLAY_ROWS);
};

const inBounds = (board, reel, row) =>
	reel >= 0 && reel < board.length && row >= 0 && row < (board[reel]?.length ?? 0);

const matches = (name, target) => name === target || name === WILD;

const findWinningClusters = (resultBoard) => {
	const board = (resultBoard ?? []).map(playColumn).map((col) => col.map(cellName));
	const winning = [];
	for (const target of PAYING) {
		const visited = new Set();
		for (let reel = 0; reel < board.length; reel += 1) {
			for (let row = 0; row < (board[reel]?.length ?? 0); row += 1) {
				if (board[reel][row] !== target) continue;
				const key0 = `${reel}:${row}`;
				if (visited.has(key0)) continue;
				const queue = [[reel, row]];
				const component = [];
				let hasNatural = false;
				while (queue.length) {
					const [r, c] = queue.pop();
					if (!inBounds(board, r, c)) continue;
					const name = board[r][c];
					if (SKIP.has(name) || !matches(name, target)) continue;
					const key = `${r}:${c}`;
					if (component.some(([a, b]) => a === r && b === c)) continue;
					component.push([r, c]);
					if (name === target) hasNatural = true;
					for (const [dr, dc] of DELTAS) queue.push([r + dr, c + dc]);
				}
				for (const [r, c] of component) {
					if (board[r][c] === target) visited.add(`${r}:${c}`);
				}
				if (hasNatural && component.length >= MIN_CLUSTER) {
					winning.push({ symbol: target, size: component.length });
				}
			}
		}
	}
	return winning;
};

const tumbleStops = (events) => {
	let lastTb = null;
	const stops = [];
	for (const event of events ?? []) {
		if (event.type === 'tumbleBoard') lastTb = event;
		else if ((event.type === 'boardActivation' || event.type === 'setWin') && lastTb) {
			stops.push(lastTb);
			lastTb = null;
		}
	}
	return stops;
};

const readCache = (mode) => {
	const file = path.join(CACHE, `books_${mode}.json`);
	if (!fs.existsSync(file)) return null;
	return JSON.parse(fs.readFileSync(file, 'utf-8'));
};

const typesOf = (book) => (book.events ?? []).map((event) => event.type);

function auditMode(mode, books) {
	const errors = [];
	let multiTumble = 0;
	for (const [index, book] of books.entries()) {
		const types = typesOf(book);
		const label = `${mode} book[${index}]`;
		if (mode === 'feature_spin') {
			if (!types.includes('winInfo')) errors.push(`${label}: missing winInfo`);
			if (!types.includes('tumbleBoard')) errors.push(`${label}: missing tumbleBoard`);
			if (!types.includes('boardActivation')) errors.push(`${label}: missing boardActivation`);
			const ba = types.indexOf('boardActivation');
			if (ba >= 0 && types.slice(0, ba).filter((t) => t === 'tumbleBoard').length >= 2) {
				multiTumble += 1;
			}
		}
		if (!types.includes('setTotalWin') && !types.includes('setWin')) {
			errors.push(`${label}: missing setWin / setTotalWin`);
		}
		const ba = types.indexOf('boardActivation');
		if (ba >= 0) {
			const before = types.slice(0, ba);
			const lastTb = before.lastIndexOf('tumbleBoard');
			if (lastTb >= 0 && types.slice(lastTb, ba).includes('winInfo')) {
				errors.push(`${label}: winInfo after last tumble before boardActivation`);
			}
		}
		for (const stop of tumbleStops(book.events ?? [])) {
			const leftover = findWinningClusters(stop.resultBoard);
			if (leftover.length) {
				errors.push(
					`${label}: leftover ${leftover[0].symbol} size ${leftover[0].size} after cascade stop`,
				);
			}
		}
	}
	if (mode === 'feature_spin' && multiTumble < 1) {
		errors.push('feature_spin cache: need at least one 2+ tumble book before coins');
	}
	return errors;
}

function main() {
	let failed = false;
	for (const mode of MODES) {
		const books = readCache(mode);
		if (!books) {
			console.warn(`skip ${mode}: missing ${path.join(CACHE, `books_${mode}.json`)}`);
			continue;
		}
		const errors = auditMode(mode, books);
		if (errors.length) {
			failed = true;
			for (const err of errors.slice(0, 12)) console.error(`FAIL ${err}`);
			if (errors.length > 12) console.error(`FAIL ${mode}: +${errors.length - 12} more`);
		} else {
			console.log(`${mode}: ${books.length} books ok`);
		}
	}
	if (failed) process.exit(1);
	console.log('verify-dev-books-loops: passed');
}

main();
