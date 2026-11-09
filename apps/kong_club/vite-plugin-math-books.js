/**
 * Local dev: serve math library books + LUTs from kong_club publish_files.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MATH_MODES = [
	'base',
	'base_ante',
	'hunt_2',
	'hunt_3',
	'hunt_4',
	'hunt_5',
	'hunt_6',
	'feature_spin',
	'peak_spin',
	'bonus_see',
	'bonus_hear',
	'bonus_mystery',
	'bonus_risky',
];

/** Spec: 500 books per mode until ship. A short forced file is only a stand-in. */
const DEV_BOOK_COUNTS = Object.fromEntries(MATH_MODES.map((mode) => [mode, 500]));

/** Vendored publish from kong-club-math. External math-sdk is only a fallback. */
function resolvePublishDir() {
	const vendored = path.resolve(__dirname, 'math-publish');
	if (fs.existsSync(path.join(vendored, 'index.json'))) return vendored;
	return path.resolve(__dirname, '../../../math-sdk/games/kong_club/library/publish_files');
}

/** Mystery was published as `bonus_pick` through math pr7-963. */
const LEGACY_PUBLISH_KEYS = { bonus_mystery: ['bonus_pick'] };
/** Old routes still served (e.g. cached clients asking for `/__math/books/bonus_pick`). */
const LEGACY_ROUTE_MODES = { bonus_pick: 'bonus_mystery' };

/** Publish file key for a mode: its own name, else a legacy name that exists on disk. */
function publishKeyFor(publishDir, mode) {
	const canonical = LEGACY_ROUTE_MODES[mode] ?? mode;
	const candidates = [canonical, ...(LEGACY_PUBLISH_KEYS[canonical] ?? [])];
	for (const key of candidates) {
		if (fs.existsSync(path.join(publishDir, `books_${key}.jsonl.zst`))) return key;
	}
	return canonical;
}

function booksZstPath(publishDir, mode) {
	return path.join(publishDir, `books_${publishKeyFor(publishDir, mode)}.jsonl.zst`);
}

function lutPath(publishDir, mode) {
	return path.join(publishDir, `lookUpTable_${publishKeyFor(publishDir, mode)}_0.csv`);
}

function publishedModeNames(publishDir) {
	const indexPath = path.join(publishDir, 'index.json');
	if (!fs.existsSync(indexPath)) return new Set();
	try {
		const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
		return new Set((index.modes ?? []).map((mode) => mode.name));
	} catch {
		return new Set();
	}
}

function cacheBooksPath(appRoot, mode) {
	return path.join(appRoot, '.cache', 'math-books', `books_${mode}.json`);
}

function forcedBooksPath(appRoot, mode) {
	return path.join(appRoot, 'src', 'stories', 'data', 'math_books', `${mode}_forced.json`);
}

function cacheMetaPath(appRoot) {
	return path.join(appRoot, '.cache', 'math-books', '.meta.json');
}

function readCacheMeta(appRoot) {
	const metaPath = cacheMetaPath(appRoot);
	if (!fs.existsSync(metaPath)) return {};
	try {
		return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
	} catch {
		return {};
	}
}

function writeCacheMeta(appRoot, mode, sourceMtimeMs, source) {
	const metaPath = cacheMetaPath(appRoot);
	const meta = readCacheMeta(appRoot);
	meta[mode] = { sourceMtimeMs, source, cachedAt: Date.now() };
	fs.mkdirSync(path.dirname(metaPath), { recursive: true });
	fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
}

function cachedBookCount(cached) {
	try {
		const parsed = JSON.parse(fs.readFileSync(cached, 'utf-8'));
		return Array.isArray(parsed) ? parsed.length : 0;
	} catch {
		return 0;
	}
}

function isCacheStale(mode, publishDir, appRoot) {
	const cached = cacheBooksPath(appRoot, mode);
	if (!fs.existsSync(cached)) return true;
	if (cachedBookCount(cached) === 0) return true;

	const zst = booksZstPath(publishDir, mode);
	const meta = readCacheMeta(appRoot)[mode];
	if (!fs.existsSync(zst)) return false;
	if (meta?.source !== 'zst') return true;

	const zstMtime = fs.statSync(zst).mtimeMs;
	if (meta?.sourceMtimeMs === zstMtime) return false;

	const cachedMtime = fs.statSync(cached).mtimeMs;
	return zstMtime > cachedMtime;
}

function extractBooksFromZst(mode, publishDir, appRoot) {
	const cached = cacheBooksPath(appRoot, mode);
	const zst = booksZstPath(publishDir, mode);
	if (!fs.existsSync(zst)) return null;

	const count = DEV_BOOK_COUNTS[mode] ?? 500;
	fs.mkdirSync(path.dirname(cached), { recursive: true });

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
print(len(books))
`;

	const python = spawnSync('python3', ['-c', 'import zstandard'], { encoding: 'utf-8' }).status === 0
		? 'python3'
		: 'python';
	const result = spawnSync(python, ['-c', script], {
		env: { ...process.env, ZST: zst, OUT: cached, LIMIT: String(count) },
		encoding: 'utf-8',
	});

	if (result.status === 0) {
		const count = cachedBookCount(cached);
		if (count === 0) {
			console.warn(`[math-books] zst extract for "${mode}" was empty — falling back`);
			try {
				fs.unlinkSync(cached);
			} catch {
				/* ignore */
			}
			return null;
		}
		writeCacheMeta(appRoot, mode, fs.statSync(zst).mtimeMs, 'zst');
		console.log(`[math-books] Cached ${count} books for "${mode}" → ${cached}`);
		return cached;
	}

	console.warn(`[math-books] zst extract failed for "${mode}": ${result.stderr || result.stdout}`);
	return null;
}

function ensureBooksJson(mode, publishDir, appRoot) {
	const cached = cacheBooksPath(appRoot, mode);
	if (isCacheStale(mode, publishDir, appRoot)) {
		if (fs.existsSync(cached)) {
			console.log(`[math-books] Invalidating stale cache for "${mode}" (publish zst updated)`);
			fs.unlinkSync(cached);
		}
	}

	if (fs.existsSync(cached)) {
		return cached;
	}

	const zst = booksZstPath(publishDir, mode);
	const extracted = extractBooksFromZst(mode, publishDir, appRoot);
	if (extracted) {
		return extracted;
	}

	if (publishedModeNames(publishDir).has(publishKeyFor(publishDir, mode)) || fs.existsSync(zst)) {
		throw new Error(
			`Published books for "${mode}" could not be read (${zst}). Refusing forced/stub fallback.`,
		);
	}

	const forced = forcedBooksPath(appRoot, mode);
	if (fs.existsSync(forced)) {
		const raw = JSON.parse(fs.readFileSync(forced, 'utf-8'));
		const books = Array.isArray(raw)
			? raw.map((entry) => entry.book ?? entry)
			: [raw.book ?? raw];
		fs.mkdirSync(path.dirname(cached), { recursive: true });
		fs.writeFileSync(cached, JSON.stringify(books));
		writeCacheMeta(appRoot, mode, 0, 'forced');
		console.warn(
			`[math-books] "${mode}" has no publish library. Serving ${books.length} forced book(s). Full 500-book sets land with the new math.`,
		);
		return cached;
	}

	const stub = [stubBook(mode)];
	fs.mkdirSync(path.dirname(cached), { recursive: true });
	fs.writeFileSync(cached, JSON.stringify(stub));
	writeCacheMeta(appRoot, mode, 0, 'stub');
	console.warn(
		`[math-books] "${mode}" has no publish library and no forced books. Serving 1 playable stub so the mode loads. Real books are blocked on the math publish.`,
	);
	return cached;
}

function stubBoard() {
	const rows = [
		['K', 'K', 'J', 'J', 'J', 'K', 'LE'],
		['A', 'T', 'T', 'A', 'T', 'GR', 'GR'],
		['K', 'K', 'T', 'T', 'Q', 'T', 'BA'],
		['GR', 'Q', 'Q', 'Q', 'OR', 'K', 'J'],
		['A', 'A', 'A', 'Q', 'K', 'T', 'T'],
		['GR', 'GR', 'K', 'LE', 'K', 'K', 'K'],
	];
	return rows.map((reel) => reel.map((name) => ({ name })));
}

/** Dead spin: valid reveal, no cluster, no bonus. Keeps the mode selectable. */
function stubBook(mode) {
	return {
		id: 0,
		payoutMultiplier: 0,
		events: [
			{
				index: 0,
				type: 'reveal',
				board: stubBoard(),
				paddingPositions: [0, 0, 0, 0, 0, 0],
				gameType: 'basegame',
				anticipation: [0, 0, 0, 0, 0, 0],
			},
			{ index: 1, type: 'setTotalWin', amount: 0 },
			{ index: 2, type: 'finalWin', amount: 0 },
		],
		criteria: 'basegame',
		baseGameWins: 0,
		freeGameWins: 0,
		mode,
	};
}

function cacheLutPath(appRoot, mode) {
	return path.join(appRoot, '.cache', 'math-books', `lookUpTable_${mode}_0.csv`);
}

function parseLutCsv(text, bookCount) {
	const entries = [];
	const lines = text.trim().split('\n');

	for (let index = 0; index < lines.length && index < bookCount; index++) {
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
}

function loadLutEntries(mode, publishDir, appRoot, bookCount) {
	const cacheLut = cacheLutPath(appRoot, mode);
	if (fs.existsSync(cacheLut)) {
		return parseLutCsv(fs.readFileSync(cacheLut, 'utf-8'), bookCount);
	}
	const lutFile = lutPath(publishDir, mode);
	if (fs.existsSync(lutFile)) {
		return parseLutCsv(fs.readFileSync(lutFile, 'utf-8'), bookCount);
	}
	return uniformLutEntries(bookCount);
}

function uniformLutEntries(bookCount) {
	return Array.from({ length: bookCount }, (_, index) => ({
		index,
		weight: 1,
		payout: 0,
	}));
}

export function mathBooksPlugin() {
	const publishDir = resolvePublishDir();
	const appRoot = __dirname;

	return {
		name: 'kong-club-math-books',
		configureServer(server) {
			server.middlewares.use(async (req, res, next) => {
				const pathname = (req.url || '').split('?')[0];
				const metaMatch = pathname === '/__math/meta';
				const costsMatch = pathname === '/__math/costs';
				const booksMatch = pathname.match(/^\/__math\/books\/([a-z0-9_]+)$/);
				const lutMatch = pathname.match(/^\/__math\/lut\/([a-z0-9_]+)$/);

				if (!metaMatch && !costsMatch && !booksMatch && !lutMatch) {
					return next();
				}

				try {
					if (costsMatch) {
						const indexPath = path.join(publishDir, 'index.json');
						res.setHeader('Content-Type', 'application/json');
						res.setHeader('Cache-Control', 'no-store');
						if (!fs.existsSync(indexPath)) {
							res.statusCode = 404;
							res.end(JSON.stringify({ error: 'mode costs not published' }));
							return;
						}
						const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
						const costs = Object.fromEntries(
							(index.modes ?? []).map((mode) => [mode.name, mode.cost]),
						);
						res.end(JSON.stringify(costs));
						return;
					}

					if (metaMatch) {
						const metaPath = cacheMetaPath(appRoot);
						let revision = String(Date.now());
						if (fs.existsSync(metaPath)) {
							const st = fs.statSync(metaPath);
							revision = String(st.mtimeMs);
						}
						res.setHeader('Content-Type', 'application/json');
						res.setHeader('Cache-Control', 'no-store');
						res.end(JSON.stringify({ revision }));
						return;
					}

					const routeMode = (booksMatch || lutMatch)[1];
					const mode = LEGACY_ROUTE_MODES[routeMode] ?? routeMode;
					if (!MATH_MODES.includes(mode)) {
						res.statusCode = 404;
						res.end(JSON.stringify({ error: `Unknown mode: ${mode}` }));
						return;
					}

					if (booksMatch) {
						const file = ensureBooksJson(mode, publishDir, appRoot);
						const body = fs.readFileSync(file, 'utf-8');
						res.setHeader('Content-Type', 'application/json');
						res.setHeader('Cache-Control', 'no-store');
						res.end(body);
						return;
					}

					const booksFile = ensureBooksJson(mode, publishDir, appRoot);
					const books = JSON.parse(fs.readFileSync(booksFile, 'utf-8'));
					const entries = loadLutEntries(mode, publishDir, appRoot, books.length);

					res.setHeader('Content-Type', 'application/json');
					res.setHeader('Cache-Control', 'no-store');
					res.end(JSON.stringify({ entries, bookCount: books.length }));
				} catch (err) {
					res.statusCode = 500;
					res.end(JSON.stringify({ error: err.message }));
					console.error('[math-books]', err);
				}
			});
		},
	};
}
