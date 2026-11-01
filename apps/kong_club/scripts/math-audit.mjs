#!/usr/bin/env node
/**
 * Kong Club FE math audit — cost-aware mode samples from warm books cache.
 * Reports RTP proxy, hit rate, profit rate (buys), and hard-face coin checks.
 *
 * Usage: node scripts/math-audit.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const cacheDir = path.resolve(appRoot, '.cache/math-books');

const MODE_COST = {
	base: 1,
	base_ante: 1.4,
	feature_spin: 50,
	peak_spin: 1000,
	bonus_see: 100,
	bonus_hear: 200,
};

const HARD_FACES = new Set([1, 2, 3, 4, 5, 7, 10, 15, 20, 25, 50, 100, 250, 500]);

function loadModeBooks(mode) {
	const candidates = [
		path.join(cacheDir, `books_${mode}.json`),
		path.join(cacheDir, `${mode}.json`),
	];
	for (const file of candidates) {
		if (!fs.existsSync(file)) continue;
		const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
		return Array.isArray(raw) ? raw : raw.books || [];
	}
	return [];
}

function payoutOf(book) {
	// Warm / Python books store payoutMultiplier as ×100 integers (bet multiples × 100).
	if (book?.payoutMultiplier != null) return Number(book.payoutMultiplier) / 100;
	if (book?.payout_multiplier != null) return Number(book.payout_multiplier) / 100;
	const events = book?.events || [];
	const setWin = [...events].reverse().find((e) => e.type === 'setWin' || e.type === 'setTotalWin');
	if (setWin?.amount == null) return 0;
	return Number(setWin.amount) / 100;
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

function auditMode(mode) {
	const cost = MODE_COST[mode];
	const books = loadModeBooks(mode);
	const n = books.length;
	if (!n) {
		return { mode, n: 0, error: 'no books in fe_math_cache — run pnpm warm:books' };
	}
	let hits = 0;
	let profits = 0;
	let sum = 0;
	let maxPaid = 0;
	let badFaces = 0;
	for (const book of books) {
		const pay = payoutOf(book);
		sum += pay;
		if (pay > 0) hits += 1;
		if (pay > cost) profits += 1;
		if (pay > maxPaid) maxPaid = pay;
		if (!coinFacesOk(book)) badFaces += 1;
	}
	const mean = sum / n;
	const rtp = mean / cost;
	return {
		mode,
		n,
		cost,
		rtp_pct: Number((rtp * 100).toFixed(3)),
		hit_rate_pct: Number(((100 * hits) / n).toFixed(2)),
		profit_rate_pct: Number(((100 * profits) / n).toFixed(2)),
		max_paid: Number(maxPaid.toFixed(4)),
		hard_face_violations: badFaces,
		ok: badFaces === 0,
	};
}

const results = Object.keys(MODE_COST).map(auditMode);
console.log(JSON.stringify(results, null, 2));
const failed = results.filter((r) => r.error || r.hard_face_violations > 0);
if (failed.length) {
	console.error('math-audit: FAIL', failed.map((f) => f.mode).join(', '));
	process.exit(1);
}
console.log('math-audit: hard coin faces OK across warm books');
