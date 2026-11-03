/**
 * Build src/game/mathProfile.json from math index.json and, when a full book
 * set is present, from those books and lookup tables.
 *
 * A short dev cache does not replace declared RTP, max win, or odds.
 * Set minBooksToMeasure in index.json (default 1000). The final publish is
 * far larger, so dropping those books in and running this script updates the
 * rules and UI with no source edits.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const defaultAppRoot = path.resolve(scriptDir, '..');
export const defaultIndexPath = path.join(defaultAppRoot, 'src/stories/data/math_books/index.json');
export const defaultProfilePath = path.join(defaultAppRoot, 'src/game/mathProfile.json');

const MODE_EVENT_TYPES = new Set(['kongClubMode', 'monkeyMayhemMode']);

export const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

export const bonusState = (book) => {
	for (const event of book?.events ?? []) {
		if (MODE_EVENT_TYPES.has(event?.type) && event.state) return String(event.state);
	}
	return '';
};

const outcomeStates = (outcome) => {
	if (Array.isArray(outcome.state)) return outcome.state;
	if (outcome.state) return [outcome.state];
	return [];
};

export const classifyBook = (book, odds) => {
	const state = bonusState(book);
	for (const outcome of odds) {
		if (outcome.when === 'noBonus') continue;
		if (outcomeStates(outcome).includes(state)) return outcome.id;
	}
	const dead = odds.find((outcome) => outcome.when === 'noBonus');
	return dead ? dead.id : null;
};

/** Largest-remainder percents that sum to 100. */
export const percentShares = (counts) => {
	const total = counts.reduce((sum, count) => sum + count, 0);
	if (total <= 0) return counts.map(() => 0);
	const raw = counts.map((count) => (count / total) * 100);
	const floors = raw.map((value) => Math.floor(value));
	let left = 100 - floors.reduce((sum, value) => sum + value, 0);
	const order = raw
		.map((value, index) => ({ index, frac: value - floors[index] }))
		.sort((a, b) => b.frac - a.frac || a.index - b.index);
	for (const item of order) {
		if (left <= 0) break;
		floors[item.index] += 1;
		left -= 1;
	}
	return floors;
};

export const measureOdds = (books, odds) => {
	const counts = new Map(odds.map((outcome) => [outcome.id, 0]));
	for (const book of books) {
		const id = classifyBook(book, odds);
		if (id != null && counts.has(id)) counts.set(id, counts.get(id) + 1);
	}
	const shares = percentShares(odds.map((outcome) => counts.get(outcome.id) ?? 0));
	return odds.map((outcome, index) => ({
		id: outcome.id,
		label: outcome.label,
		...(outcome.socialLabel ? { socialLabel: outcome.socialLabel } : {}),
		percent: shares[index],
	}));
};

export const parseLutCsv = (text) => {
	const entries = [];
	for (const line of text.trim().split('\n')) {
		if (!line || line.startsWith('#')) continue;
		const parts = line.split(',');
		if (parts.length < 3) continue;
		const weight = Number(parts[1]);
		const payout = Number(parts[2]);
		if (!Number.isFinite(weight) || !Number.isFinite(payout)) continue;
		entries.push({ weight, payout });
	}
	return entries;
};

/** RTP as a fraction. Payouts are base-bet multiples, so divide by mode cost. */
export const rtpFromLut = (entries, cost) => {
	let weight = 0;
	let weighted = 0;
	for (const entry of entries) {
		weight += entry.weight;
		weighted += entry.weight * entry.payout;
	}
	if (weight <= 0 || !cost) return null;
	return weighted / weight / cost;
};

const roundRtp = (rtp) => Math.round(rtp * 1e6) / 1e6;

const bookFileCandidates = (appRoot, modeId) => {
	const names = modeId === 'bonus_pick' ? ['bonus_pick', 'bonus_gamble'] : [modeId];
	const dirs = [
		path.join(appRoot, '.cache/math-books'),
		path.join(appRoot, 'src/stories/data/math_books'),
	];
	const files = [];
	for (const dir of dirs) {
		for (const name of names) files.push(path.join(dir, `books_${name}.json`));
	}
	return files;
};

export const loadBooks = (appRoot, modeId) => {
	for (const file of bookFileCandidates(appRoot, modeId)) {
		if (!fs.existsSync(file)) continue;
		const parsed = readJson(file);
		const books = Array.isArray(parsed) ? parsed : parsed.books;
		if (Array.isArray(books) && books.length > 0) return books;
	}
	return null;
};

const lutFileCandidates = (appRoot, modeId) => {
	const names = modeId === 'bonus_pick' ? ['bonus_pick', 'bonus_gamble'] : [modeId];
	const dirs = [
		path.join(appRoot, '.cache/math-books'),
		path.join(appRoot, 'src/stories/data/math_books'),
	];
	const files = [];
	for (const dir of dirs) {
		for (const name of names) files.push(path.join(dir, `lookUpTable_${name}_0.csv`));
	}
	return files;
};

export const loadLut = (appRoot, modeId) => {
	for (const file of lutFileCandidates(appRoot, modeId)) {
		if (!fs.existsSync(file)) continue;
		const entries = parseLutCsv(fs.readFileSync(file, 'utf8'));
		if (entries.length > 0) return entries;
	}
	return null;
};

const publishedOdds = (odds) =>
	odds.map((outcome) => ({
		id: outcome.id,
		label: outcome.label,
		...(outcome.socialLabel ? { socialLabel: outcome.socialLabel } : {}),
		percent: outcome.percent,
	}));

/**
 * @param {object} index parsed index.json
 * @param {{ appRoot?: string, booksByMode?: Record<string, object[]>, lutByMode?: Record<string, {weight:number,payout:number}[]> }} [sources]
 */
export const buildMathProfile = (index, sources = {}) => {
	const appRoot = sources.appRoot ?? defaultAppRoot;
	const minBooks = index.minBooksToMeasure ?? 1000;
	const gameRtp = index.rtp;
	const gameMaxWin = index.maxWin;
	if (typeof gameRtp !== 'number' || typeof gameMaxWin !== 'number') {
		throw new Error('index.json needs numeric rtp and maxWin');
	}
	if (!Array.isArray(index.modes) || index.modes.length === 0) {
		throw new Error('index.json needs a modes array');
	}

	const modes = index.modes.map((mode) => {
		if (!mode.id || typeof mode.cost !== 'number' || !mode.label) {
			throw new Error(`Mode ${mode.id ?? '(missing id)'} needs id, label, and cost`);
		}
		const declaredRtp = mode.rtp ?? gameRtp;
		const declaredMax = mode.maxWin ?? gameMaxWin;
		const books = sources.booksByMode?.[mode.id] ?? loadBooks(appRoot, mode.id);
		const measure = Boolean(mode.measureFromBooks) || (books != null && books.length >= minBooks);
		let rtp = declaredRtp;
		let maxWin = declaredMax;
		let odds = mode.odds ? publishedOdds(mode.odds) : undefined;
		let measured = false;

		if (measure && books?.length) {
			measured = true;
			const seen = books.reduce((max, book) => {
				const payout = Number(book.payoutMultiplier ?? 0);
				return Number.isFinite(payout) ? Math.max(max, payout) : max;
			}, 0);
			if (seen > 0) maxWin = seen;
			const lut = sources.lutByMode?.[mode.id] ?? loadLut(appRoot, mode.id);
			if (lut) {
				const computed = rtpFromLut(lut, mode.cost);
				if (computed != null) rtp = roundRtp(computed);
			}
			if (mode.odds?.length) odds = measureOdds(books, mode.odds);
		}

		return {
			id: mode.id,
			label: mode.label,
			socialLabel: mode.socialLabel || mode.label,
			cost: mode.cost,
			feature: mode.feature !== false,
			buyBonus: Boolean(mode.buyBonus),
			rtp,
			maxWin,
			...(odds ? { odds } : {}),
			measured,
		};
	});

	const base = modes.find((mode) => mode.id === 'base') ?? modes[0];
	return {
		rtp: base.rtp ?? gameRtp,
		maxWin: Math.max(gameMaxWin, ...modes.map((mode) => mode.maxWin)),
		modes,
	};
};

export const writeMathProfile = (options = {}) => {
	const indexPath = options.indexPath ?? defaultIndexPath;
	const profilePath = options.profilePath ?? defaultProfilePath;
	const index = readJson(indexPath);
	const profile = buildMathProfile(index, { appRoot: options.appRoot ?? defaultAppRoot });
	fs.mkdirSync(path.dirname(profilePath), { recursive: true });
	fs.writeFileSync(profilePath, `${JSON.stringify(profile, null, '\t')}\n`);
	return profile;
};

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
	const profile = writeMathProfile();
	const measured = profile.modes.filter((mode) => mode.measured).map((mode) => mode.id);
	console.log(
		`Wrote ${defaultProfilePath} (${profile.modes.length} modes${
			measured.length ? `, measured ${measured.join(', ')}` : ', declared values'
		})`,
	);
}
