/**
 * Verify dev math-books cache matches publish zst and includes super-cascade orphan clears.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const libraryRoot = path.resolve(appRoot, '../../../math-sdk/games/monkey_mayhem/library');

const MODES = ['base', 'base_ante', 'feature_spin', 'bonus_see', 'bonus_hear'];

function analyzeBooks(books, sampleSize = 200) {
	const stats = { tumbles: 0, orphanExplodes: 0, totalExplodes: 0, clusterOnly: 0 };
	for (const book of books.slice(0, sampleSize)) {
		const winPos = new Set();
		for (const ev of book.events ?? []) {
			if (ev.type === 'winInfo') {
				for (const win of ev.wins ?? []) {
					for (const pos of win.positions ?? []) {
						winPos.add(`${pos.reel}:${pos.row}`);
					}
				}
			}
			if (ev.type === 'tumbleBoard') {
				stats.tumbles += 1;
				const exploded = (ev.explodingSymbols ?? []).map((p) => `${p.reel}:${p.row}`);
				stats.totalExplodes += exploded.length;
				let orphans = 0;
				for (const key of exploded) {
					if (!winPos.has(key)) orphans += 1;
				}
				stats.orphanExplodes += orphans;
				if (orphans === 0 && exploded.length > 0) stats.clusterOnly += 1;
			}
		}
	}
	return stats;
}

function readCache(mode) {
	const file = path.join(appRoot, '.cache', 'math-books', `books_${mode}.json`);
	if (!fs.existsSync(file)) return null;
	return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function extractSampleFromZst(mode, limit = 200) {
	const zst = path.join(libraryRoot, 'publish_files', `books_${mode}.jsonl.zst`);
	if (!fs.existsSync(zst)) return null;

	const tmpOut = path.join(appRoot, '.cache', 'math-books', `.verify-sample-${mode}.json`);
	fs.mkdirSync(path.dirname(tmpOut), { recursive: true });

	const script = `
import json, io, os, zstandard as zst
zst_path = os.environ["ZST"]
out_path = os.environ["OUT"]
limit = int(os.environ["LIMIT"])
books = []
with open(zst_path, "rb") as f:
    with zst.ZstdDecompressor().stream_reader(f) as reader:
        t = io.TextIOWrapper(reader, encoding="utf-8")
        for line in t:
            line = line.strip()
            if not line:
                continue
            books.append(json.loads(line))
            if len(books) >= limit:
                break
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(books, f)
`;

	const result = spawnSync('python', ['-c', script], {
		env: { ...process.env, ZST: zst, OUT: tmpOut, LIMIT: String(limit) },
		encoding: 'utf-8',
	});

	if (result.status !== 0) {
		throw new Error(`zst extract failed for ${mode}: ${result.stderr || result.stdout}`);
	}

	return JSON.parse(fs.readFileSync(tmpOut, 'utf-8'));
}

function main() {
	let failed = false;

	for (const mode of MODES) {
		const zst = path.join(libraryRoot, 'publish_files', `books_${mode}.jsonl.zst`);
		if (!fs.existsSync(zst)) {
			console.warn(`skip ${mode}: missing ${zst}`);
			continue;
		}

		const zstStats = analyzeBooks(extractSampleFromZst(mode));
		const cache = readCache(mode);
		const cacheStats = cache ? analyzeBooks(cache) : null;

		console.log(`${mode} zst:`, zstStats);
		if (cacheStats) {
			console.log(`${mode} cache:`, cacheStats);
		} else {
			console.log(`${mode} cache: (missing — run dev server to extract)`);
		}

		if (mode === 'base' && zstStats.orphanExplodes === 0 && zstStats.tumbles > 0) {
			console.error(`FAIL ${mode}: publish zst has no super-cascade orphan clears`);
			failed = true;
		}

		if (cacheStats && cacheStats.orphanExplodes === 0 && zstStats.orphanExplodes > 0) {
			console.error(
				`FAIL ${mode}: dev cache is stale (0 orphan clears vs ${zstStats.orphanExplodes} in zst)`,
			);
			failed = true;
		}
	}

	if (failed) process.exit(1);
	console.log('verify-dev-books-super-cascade: passed');
}

main();
