#!/usr/bin/env node
/**
 * Verify FE coin face constants match math hard pools (playbook sync).
 *
 * Usage: node scripts/verify-frontend-sync.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const normalizePath = path.join(appRoot, 'src/game/coinFacePools.ts');
const configPath = path.resolve(
	appRoot,
	'../../../math-sdk/games/kong_club/game_config.py',
);

const EXPECTED = {
	CB: [0.2, 0.5, 1, 2, 3, 4],
	CS: [5, 10, 15, 20],
	CG: [25, 50, 100, 250, 500, 1000],
};

function extractTsPools(src) {
	const block = src.match(/export const COIN_FACE_VALUES = \{([\s\S]*?)\} as const/);
	if (!block) throw new Error('COIN_FACE_VALUES not found in coinFacePools.ts');
	const out = {};
	for (const key of ['CB', 'CS', 'CG']) {
		const m = block[1].match(new RegExp(`${key}:\\s*\\[([^\\]]+)\\]`));
		if (!m) throw new Error(`missing ${key} in FE pools`);
		out[key] = m[1].split(',').map((s) => Number(s.trim()));
	}
	return out;
}

function extractPyPools(src) {
	const block = src.match(/self\.coin_values\s*=\s*\{([\s\S]*?)\}/);
	if (!block) throw new Error('coin_values not found in game_config.py');
	const out = {};
	for (const key of ['CB', 'CS', 'CG']) {
		const m = block[1].match(new RegExp(`"${key}":\\s*\\[([^\\]]+)\\]`));
		if (!m) throw new Error(`missing ${key} in Python pools`);
		out[key] = m[1].split(',').map((s) => Number(s.trim()));
	}
	return out;
}

const feSrc = fs.readFileSync(normalizePath, 'utf8');
const fe = extractTsPools(feSrc);
const pySrc = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : null;
const py = pySrc ? extractPyPools(pySrc) : null;

let ok = true;
for (const key of ['CB', 'CS', 'CG']) {
	const a = JSON.stringify(fe[key]);
	const c = JSON.stringify(EXPECTED[key]);
	if (a !== c) {
		console.error(`MISMATCH ${key}: FE=${a} EXPECTED=${c}`);
		ok = false;
	} else if (py && JSON.stringify(py[key]) !== c) {
		console.error(`MISMATCH ${key}: FE=${a} PY=${JSON.stringify(py[key])} EXPECTED=${c}`);
		ok = false;
	} else {
		console.log(`OK ${key}: ${a}`);
	}
}
if (!pySrc) {
	console.log('skip math game_config.py (not in this environment)');
}

// No 0.20× coin-face scale. When math is present, its scale knobs must stay at 1.
if (pySrc) {
	const scaleBlock = pySrc.match(/self\.coin_tile_scale_by_mode\s*=\s*\{([\s\S]*?)\}/);
	if (scaleBlock && /:\s*0\.\d+/.test(scaleBlock[1])) {
		console.error('coin_tile_scale_by_mode has non-1.0 values — face scale forbidden');
		ok = false;
	} else if (scaleBlock) {
		console.log('OK coin_tile_scale_by_mode locked at 1.0');
	}

	const baseScale = pySrc.match(/self\.base_coin_game_scale\s*=\s*([0-9.]+)/);
	if (baseScale && Number(baseScale[1]) !== 1) {
		console.error(`base_coin_game_scale is ${baseScale[1]}, expected 1 (no 0.20× scale)`);
		ok = false;
	} else if (baseScale) {
		console.log('OK base_coin_game_scale 1');
	}
}

if (!ok) process.exit(1);
console.log('verify-frontend-sync: PASS');
