/**
 * Populate .cache/math-books from live Phase A math (connected-only tile ranks).
 * Prefer this over stale publish .zst extracts during local FE work.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const warmPy = path.resolve(
	appRoot,
	'../../../math-sdk/games/kong_club/scripts/warm_fe_math_cache.py',
);

const result = spawnSync('python', [warmPy], {
	encoding: 'utf-8',
	cwd: path.dirname(warmPy),
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if (result.status !== 0) {
	console.error('warm_fe_math_cache.py failed');
	process.exit(result.status ?? 1);
}

console.log('warm:books — Phase A math cache ready');
