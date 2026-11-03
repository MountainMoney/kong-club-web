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
	'feature_spin',
	'peak_spin',
	'bonus_see',
	'bonus_hear',
	'bonus_mystery',
];

const DEV_BOOK_COUNTS = {
	base: 500,
	base_ante: 500,
	feature_spin: 100,
	peak_spin: 100,
	bonus_see: 100,
	bonus_hear: 100,
	bonus_mystery: 80,
};

function resolveMathLibraryRoot() {
	return path.resolve(__dirname, '../../../math-sdk/games/kong_club/library');
}

function booksZstPath(libraryRoot, mode) {
	return path.join(libraryRoot, 'publish_files', `books_${mode}.jsonl.zst`);
}

function lutPath(libraryRoot, mode) {
	return path.join(libraryRoot, 'publish_files', `lookUpTable_${mode}_0.csv`);
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

function writeCacheMeta(appRoot, mode, sourceMtimeMs) {
	const metaPath = cacheMetaPath(appRoot);
	const meta = readCacheMeta(appRoot);
	meta[mode] = { sourceMtimeMs, cachedAt: Date.now() };
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

function isCacheStale(mode, libraryRoot, appRoot) {
	const cached = cacheBooksPath(appRoot, mode);
	if (!fs.existsSync(cached)) return true;
	if (cachedBookCount(cached) === 0) return true;

	const zst = booksZstPath(libraryRoot, mode);
	if (!fs.existsSync(zst)) return false;

	const zstMtime = fs.statSync(zst).mtimeMs;
	const meta = readCacheMeta(appRoot)[mode];
	if (meta?.sourceMtimeMs === zstMtime) return false;

	const cachedMtime = fs.statSync(cached).mtimeMs;
	return zstMtime > cachedMtime;
}

function extractBooksFromZst(mode, libraryRoot, appRoot) {
	const cached = cacheBooksPath(appRoot, mode);
	const zst = booksZstPath(libraryRoot, mode);
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

	const result = spawnSync('python', ['-c', script], {
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
		writeCacheMeta(appRoot, mode, fs.statSync(zst).mtimeMs);
		console.log(`[math-books] Cached ${count} books for "${mode}" → ${cached}`);
		return cached;
	}

	console.warn(`[math-books] zst extract failed for "${mode}": ${result.stderr || result.stdout}`);
	return null;
}

function ensureBooksJson(mode, libraryRoot, appRoot) {
	const cached = cacheBooksPath(appRoot, mode);
	if (isCacheStale(mode, libraryRoot, appRoot)) {
		if (fs.existsSync(cached)) {
			console.log(`[math-books] Invalidating stale cache for "${mode}" (publish zst updated)`);
			fs.unlinkSync(cached);
		}
	}

	if (fs.existsSync(cached)) {
		return cached;
	}

	const zst = booksZstPath(libraryRoot, mode);
	const extracted = extractBooksFromZst(mode, libraryRoot, appRoot);
	if (extracted) {
		return extracted;
	}

	const forced = forcedBooksPath(appRoot, mode);
	if (fs.existsSync(forced)) {
		const raw = JSON.parse(fs.readFileSync(forced, 'utf-8'));
		const books = Array.isArray(raw)
			? raw.map((entry) => entry.book ?? entry)
			: [raw.book ?? raw];
		fs.mkdirSync(path.dirname(cached), { recursive: true });
		fs.writeFileSync(cached, JSON.stringify(books));
		console.log(`[math-books] Using forced books fallback for "${mode}" (${books.length} books)`);
		return cached;
	}

	throw new Error(`Math books not found for mode "${mode}" (missing ${zst} and ${forced}).`);
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

function loadLutEntries(mode, libraryRoot, appRoot, bookCount) {
	const cacheLut = cacheLutPath(appRoot, mode);
	if (fs.existsSync(cacheLut)) {
		return parseLutCsv(fs.readFileSync(cacheLut, 'utf-8'), bookCount);
	}
	const lutFile = lutPath(libraryRoot, mode);
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
	const libraryRoot = resolveMathLibraryRoot();
	const appRoot = __dirname;

	return {
		name: 'kong-club-math-books',
		configureServer(server) {
			server.middlewares.use(async (req, res, next) => {
				const pathname = (req.url || '').split('?')[0];
				const metaMatch = pathname === '/__math/meta';
				const booksMatch = pathname.match(/^\/__math\/books\/([a-z_]+)$/);
				const lutMatch = pathname.match(/^\/__math\/lut\/([a-z_]+)$/);

				if (!metaMatch && !booksMatch && !lutMatch) {
					return next();
				}

				try {
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

					const mode = (booksMatch || lutMatch)[1];
					if (!MATH_MODES.includes(mode)) {
						res.statusCode = 404;
						res.end(JSON.stringify({ error: `Unknown mode: ${mode}` }));
						return;
					}

					if (booksMatch) {
						const file = ensureBooksJson(mode, libraryRoot, appRoot);
						const body = fs.readFileSync(file, 'utf-8');
						res.setHeader('Content-Type', 'application/json');
						res.setHeader('Cache-Control', 'no-store');
						res.end(body);
						return;
					}

					const booksFile = ensureBooksJson(mode, libraryRoot, appRoot);
					const books = JSON.parse(fs.readFileSync(booksFile, 'utf-8'));
					const entries = loadLutEntries(mode, libraryRoot, appRoot, books.length);

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
