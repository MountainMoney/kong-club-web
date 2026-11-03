#!/usr/bin/env node
/**
 * Kong Club FE math audit.
 * RTP is LUT-weighted from publish lookUpTable_<mode>_0.csv
 * (id,weight,payout — payout is ×100 bet multiples), divided by mode cost.
 * Hard coin faces are still checked on warm books when that cache exists.
 *
 * Usage: node scripts/math-audit.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const cacheDir = path.resolve(appRoot, '.cache/math-books');

/** Same publish root as vite-plugin-math-books.js (`apps/kong_club/../../../math-sdk/...`). */
const PUBLISH_DIR = path.resolve(
	appRoot,
	'../../../math-sdk/games/kong_club/library/publish_files',
);

const MODE_COST = {
	base: 1,
	base_ante: 1.4,
	feature_spin: 65,
	peak_spin: 1400,
	bonus_see: 115,
	bonus_hear: 250,
	bonus_mystery: 380,
};

const LEGACY_MYSTERY_FILES = ['bonus_pick', 'bonus_gamble'];

const HARD_FACES = new Set([1, 2, 3, 4, 5, 7, 10, 15, 20, 25, 50, 100, 250, 500]);

export function lutPathForMode(mode) {
	const primary = path.join(PUBLISH_DIR, `lookUpTable_${mode}_0.csv`);
	if (fs.existsSync(primary) || mode !== 'bonus_mystery') return primary;
	for (const legacy of LEGACY_MYSTERY_FILES) {
		const file = path.join(PUBLISH_DIR, `lookUpTable_${legacy}_0.csv`);
		if (fs.existsSync(file)) return file;
	}
	return primary;
}

/**
 * @param {string} text CSV rows: id,weight,payout (payout ×100). Optional header skipped.
 * @returns {{ id: string, weight: bigint, payout: bigint }[]}
 */
export function parseLutCsv(text) {
	const rows = [];
	const lines = text.split(/\r?\n/);
	for (const raw of lines) {
		const line = raw.trim();
		if (!line || line.startsWith('#')) continue;
		const parts = line.split(',');
		if (parts.length < 3) continue;
		const [id, weightStr, payoutStr] = parts;
		if (!/^-?\d+$/.test(weightStr.trim()) || !/^-?\d+$/.test(payoutStr.trim())) continue;
		rows.push({
			id: id.trim(),
			weight: BigInt(weightStr.trim()),
			payout: BigInt(payoutStr.trim()),
		});
	}
	return rows;
}

/** BigInt ratio as a JS number. Expands 15 decimal digits so huge weights stay exact. */
function ratio(numerator, denominator) {
	if (denominator === 0n) return 0;
	const neg = numerator < 0n;
	let frac = neg ? -numerator : numerator;
	const whole = frac / denominator;
	frac %= denominator;
	let digits = '';
	for (let i = 0; i < 15; i += 1) {
		frac *= 10n;
		digits += (frac / denominator).toString();
		frac %= denominator;
	}
	const value = Number(`${whole.toString()}.${digits}`);
	return neg ? -value : value;
}

/**
 * Weighted RTP and hit stats from LUT rows.
 * payout is ×100, so mean bet-multiple = Σ(w·payout) / Σw / 100.
 * RTP = that mean / mode cost.
 */
export function weightedLutStats(rows, cost) {
	let weightSum = 0n;
	let weightedPayout = 0n;
	let hitWeight = 0n;
	let profitWeight = 0n;
	let maxPayout = 0n;
	const profitCutoff = BigInt(Math.round(cost * 100));
	for (const row of rows) {
		if (row.weight < 0n) continue;
		weightSum += row.weight;
		weightedPayout += row.weight * row.payout;
		if (row.payout > maxPayout) maxPayout = row.payout;
		if (row.payout > 0n) hitWeight += row.weight;
		if (row.payout > profitCutoff) profitWeight += row.weight;
	}
	const mean = weightSum === 0n ? 0 : ratio(weightedPayout, weightSum) / 100;
	const rtp = cost > 0 ? mean / cost : 0;
	return {
		n: rows.length,
		weight_sum: weightSum.toString(),
		mean_payout: Number(mean.toFixed(6)),
		rtp,
		hit_rate: weightSum === 0n ? 0 : ratio(hitWeight, weightSum),
		profit_rate: weightSum === 0n ? 0 : ratio(profitWeight, weightSum),
		max_paid: Number(maxPayout) / 100,
	};
}

function loadModeBooks(mode) {
	const candidates = [
		path.join(cacheDir, `books_${mode}.json`),
		path.join(cacheDir, `${mode}.json`),
	];
	if (mode === 'bonus_mystery') {
		for (const legacy of LEGACY_MYSTERY_FILES) {
			candidates.push(path.join(cacheDir, `books_${legacy}.json`));
		}
	}
	for (const file of candidates) {
		if (!fs.existsSync(file)) continue;
		const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
		return Array.isArray(raw) ? raw : raw.books || [];
	}
	return null;
}

function coinFacesOk(book) {
	const events = book?.events || [];
	for (const ev of events) {
		if (ev.type !== 'boardActivation') continue;
		const items = ev.coinFeature?.items || [];
		for (const item of items) {
			if (item.kind && item.kind !== 'coin') continue;
			const face = Number(item.displayValue ?? item.value);
			if (!HARD_FACES.has(face)) return false;
			if (item.payout != null && Number(item.payout) !== face) return false;
		}
	}
	return true;
}

function auditHardFaces(mode) {
	const books = loadModeBooks(mode);
	if (!books) return { books_n: 0, hard_face_violations: null, hard_faces_checked: false };
	let badFaces = 0;
	for (const book of books) {
		if (!coinFacesOk(book)) badFaces += 1;
	}
	return { books_n: books.length, hard_face_violations: badFaces, hard_faces_checked: true };
}

export function auditMode(mode) {
	const cost = MODE_COST[mode];
	const lutFile = lutPathForMode(mode);
	if (!fs.existsSync(lutFile)) {
		return {
			mode,
			cost,
			n: 0,
			error: `missing LUT ${lutFile}`,
			rtp_method: 'lut-weighted',
		};
	}
	const rows = parseLutCsv(fs.readFileSync(lutFile, 'utf8'));
	if (!rows.length) {
		return { mode, cost, n: 0, error: `empty LUT ${lutFile}`, rtp_method: 'lut-weighted' };
	}
	const stats = weightedLutStats(rows, cost);
	const faces = auditHardFaces(mode);
	return {
		mode,
		n: stats.n,
		weight_sum: stats.weight_sum,
		cost,
		rtp_method: 'lut-weighted',
		rtp_pct: Number((stats.rtp * 100).toFixed(3)),
		hit_rate_pct: Number((stats.hit_rate * 100).toFixed(2)),
		profit_rate_pct: Number((stats.profit_rate * 100).toFixed(2)),
		max_paid: Number(stats.max_paid.toFixed(4)),
		...faces,
		ok: faces.hard_face_violations == null || faces.hard_face_violations === 0,
	};
}

function readConfigCosts() {
	const src = fs.readFileSync(path.join(appRoot, 'src/game/config.ts'), 'utf8');
	const start = src.indexOf('betModes:');
	const block = start >= 0 ? src.slice(start) : src;
	const costs = {};
	for (const match of block.matchAll(/^\t\t([A-Za-z0-9_]+):\s*\{\s*cost:\s*([0-9.]+)/gm)) {
		costs[match[1]] = Number(match[2]);
	}
	return costs;
}

function assertCostsMatchConfig() {
	const fromConfig = readConfigCosts();
	const keys = Object.keys(MODE_COST);
	for (const mode of keys) {
		if (fromConfig[mode] !== MODE_COST[mode]) {
			throw new Error(
				`MODE_COST.${mode}=${MODE_COST[mode]} does not match config.ts cost ${fromConfig[mode]}`,
			);
		}
	}
	for (const mode of Object.keys(fromConfig)) {
		if (MODE_COST[mode] == null) throw new Error(`config.ts mode ${mode} missing from MODE_COST`);
	}
}

function selfTest() {
	assertCostsMatchConfig();
	const csv = ['id,weight,payout', '1,1,0', '2,3,200', '9,1,1000'].join('\n');
	const rows = parseLutCsv(csv);
	if (rows.length !== 3) throw new Error(`expected 3 rows, got ${rows.length}`);
	const stats = weightedLutStats(rows, 2);
	// weights 1+3+1=5; payout sum 0+600+1000=1600; mean ×100 = 320; mean = 3.2; rtp = 1.6
	if (Math.abs(stats.mean_payout - 3.2) > 1e-9) throw new Error(`mean ${stats.mean_payout}`);
	if (Math.abs(stats.rtp - 1.6) > 1e-9) throw new Error(`rtp ${stats.rtp}`);
	const heavy = weightedLutStats([{ id: '1', weight: 10n ** 18n, payout: 9650n }], 1);
	if (Math.abs(heavy.rtp - 96.5) > 1e-9) throw new Error(`heavy rtp ${heavy.rtp}`);
	// hits: payout>0 weight 4/5; profit: payout>200 weight 1/5
	if (Math.abs(stats.hit_rate - 0.8) > 1e-9) throw new Error(`hit ${stats.hit_rate}`);
	if (Math.abs(stats.profit_rate - 0.2) > 1e-9) throw new Error(`profit ${stats.profit_rate}`);
	if (stats.max_paid !== 10) throw new Error(`max ${stats.max_paid}`);
	console.log('math-audit self-test: OK');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
	if (process.argv.includes('--self-test')) {
		selfTest();
		process.exit(0);
	}
	assertCostsMatchConfig();
	const results = Object.keys(MODE_COST).map(auditMode);
	console.log(JSON.stringify(results, null, 2));
	const failed = results.filter((r) => r.error || (r.hard_face_violations ?? 0) > 0);
	if (failed.length) {
		console.error('math-audit: FAIL', failed.map((f) => `${f.mode}${f.error ? `: ${f.error}` : ''}`).join(', '));
		process.exit(1);
	}
	console.log('math-audit: LUT-weighted RTP ok; hard coin faces OK where warm books exist');
}
