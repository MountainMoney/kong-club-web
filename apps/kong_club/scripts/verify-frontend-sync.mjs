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
	CB: [1, 2, 3, 4],
	CS: [5, 7, 10, 15, 20],
	CG: [25, 50, 100, 250, 500],
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
const baseFe = extractTsPools(feSrc.replace('export const COIN_FACE_VALUES', 'export const INTEGER_POOLS').replace(
	'export const BASE_COIN_FACE_VALUES',
	'export const COIN_FACE_VALUES',
));
const py = extractPyPools(fs.readFileSync(configPath, 'utf8'));

let ok = true;
for (const key of ['CB', 'CS', 'CG']) {
	const a = JSON.stringify(fe[key]);
	const b = JSON.stringify(py[key]);
	const c = JSON.stringify(EXPECTED[key]);
	if (a !== b || a !== c) {
		console.error(`MISMATCH ${key}: FE=${a} PY=${b} EXPECTED=${c}`);
		ok = false;
	} else {
		console.log(`OK ${key}: ${a}`);
	}
	const scaled = fe[key].map((face) => Math.round(face * 0.2 * 100) / 100);
	if (JSON.stringify(scaled) !== JSON.stringify(baseFe[key])) {
		console.error(`MISMATCH ${key} base scale: FE=${JSON.stringify(baseFe[key])} EXPECTED=${JSON.stringify(scaled)}`);
		ok = false;
	} else {
		console.log(`OK ${key} base ×0.20: ${JSON.stringify(baseFe[key])}`);
	}
}

// Soft-scale must stay retired in math config.
const pyFull = fs.readFileSync(configPath, 'utf8');
const scaleBlock = pyFull.match(/self\.coin_tile_scale_by_mode\s*=\s*\{([\s\S]*?)\}/);
if (!scaleBlock) {
	console.error('coin_tile_scale_by_mode missing');
	ok = false;
} else if (/:\s*0\.\d+/.test(scaleBlock[1])) {
	console.error('coin_tile_scale_by_mode has non-1.0 values — soft face scale forbidden');
	ok = false;
} else {
	console.log('OK coin_tile_scale_by_mode locked at 1.0');
}

const baseScale = pyFull.match(/self\.base_coin_game_scale\s*=\s*([0-9.]+)/);
if (baseScale && Number(baseScale[1]) !== 0.2) {
	console.error(`base_coin_game_scale is ${baseScale[1]}, expected 0.20`);
	ok = false;
} else if (baseScale) {
	console.log('OK base_coin_game_scale 0.20');
}

if (!ok) process.exit(1);
console.log('verify-frontend-sync: PASS');
