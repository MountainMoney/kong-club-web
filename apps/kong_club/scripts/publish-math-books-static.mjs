/**
 * Copy Vite `/__math/*` payloads into the static Pages build.
 * Without these files, fetch().json() gets index.html and throws SyntaxError.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = path.join(appRoot, '.cache', 'math-books');
const outRoot = path.join(appRoot, 'build', '__math');

const MATH_MODES = [
	'base',
	'base_ante',
	'feature_spin',
	'peak_spin',
	'bonus_see',
	'bonus_hear',
	'bonus_pick',
];

const legacyCacheName = (mode, fileName) =>
	mode === 'bonus_pick' ? fileName('bonus_gamble') : null;

const parseLutCsv = (text, bookCount) => {
	const entries = [];
	const lines = text.trim().split('\n');
	for (let index = 0; index < lines.length && index < bookCount; index += 1) {
		const line = lines[index];
		if (!line) continue;
		const [, weightStr, payoutStr] = line.split(',');
		entries.push({
			index,
			weight: Number(weightStr),
			payout: Number(payoutStr),
		});
	}
	return entries;
};

if (!fs.existsSync(path.join(appRoot, 'build', 'index.html'))) {
	throw new Error('build/index.html missing — run vite build first');
}

fs.mkdirSync(path.join(outRoot, 'books'), { recursive: true });
fs.mkdirSync(path.join(outRoot, 'lut'), { recursive: true });
fs.writeFileSync(path.join(outRoot, 'meta'), JSON.stringify({ revision: String(Date.now()) }));

let written = 0;
for (const mode of MATH_MODES) {
	let booksPath = path.join(cacheDir, `books_${mode}.json`);
	if (!fs.existsSync(booksPath)) {
		const legacy = legacyCacheName(mode, (name) => path.join(cacheDir, `books_${name}.json`));
		if (legacy && fs.existsSync(legacy)) booksPath = legacy;
	}
	if (!fs.existsSync(booksPath)) {
		console.warn(`[publish-math-books] skip ${mode} — no cache`);
		continue;
	}
	const books = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
	if (!Array.isArray(books) || books.length === 0) {
		throw new Error(`Invalid books cache for ${mode}`);
	}
	fs.writeFileSync(path.join(outRoot, 'books', mode), JSON.stringify(books));

	let csvPath = path.join(cacheDir, `lookUpTable_${mode}_0.csv`);
	if (!fs.existsSync(csvPath)) {
		const legacy = legacyCacheName(mode, (name) =>
			path.join(cacheDir, `lookUpTable_${name}_0.csv`),
		);
		if (legacy && fs.existsSync(legacy)) csvPath = legacy;
	}
	const entries = fs.existsSync(csvPath)
		? parseLutCsv(fs.readFileSync(csvPath, 'utf8'), books.length)
		: books.map((_, index) => ({ index, weight: 1, payout: 0 }));
	fs.writeFileSync(path.join(outRoot, 'lut', mode), JSON.stringify({ entries, bookCount: books.length }));
	written += 1;
}

if (written === 0) {
	throw new Error('No math book modes written — warm .cache/math-books first');
}

console.log(`[publish-math-books] wrote ${written} modes → ${outRoot}`);
