/**
 * Boot Kong Club on typed placeholders and require the asset loader to finish.
 * Usage: node scripts/verify-asset-placeholders.mjs
 * Expects the dev server on http://127.0.0.1:3001 (starts one if needed).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire('/tmp/node_modules/playwright-core/package.json');
const { chromium } = require('playwright-core');

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.KONG_DEV_URL ?? 'http://127.0.0.1:3001';
const shotDir = process.env.KONG_SHOT_DIR ?? '/tmp/kong-asset-placeholders';

const waitForServer = async (url, ms = 90000) => {
	const deadline = Date.now() + ms;
	while (Date.now() < deadline) {
		try {
			const response = await fetch(url, { redirect: 'manual' });
			if (response.status < 500) return;
		} catch {
			// server still coming up
		}
		await new Promise((resolve) => setTimeout(resolve, 500));
	}
	throw new Error(`Dev server did not answer ${url}`);
};

const ensureServer = async () => {
	try {
		const response = await fetch(base, { redirect: 'manual' });
		if (response.status < 500) return null;
	} catch {
		// start one
	}
	const child = spawn(
		'pnpm',
		[
			'--dir',
			appRoot,
			'exec',
			'vite',
			'dev',
			'--host',
			'127.0.0.1',
			'--port',
			'3001',
			'--strictPort',
		],
		{
			cwd: appRoot,
			env: { ...process.env, PUBLIC_LOCAL_DEV: 'true' },
			stdio: ['ignore', 'pipe', 'pipe'],
			detached: true,
		},
	);
	child.stdout?.on('data', (chunk) => process.stdout.write(chunk));
	child.stderr?.on('data', (chunk) => process.stderr.write(chunk));
	child.unref();
	await waitForServer(base);
	return child;
};

const server = await ensureServer();
fs.mkdirSync(shotDir, { recursive: true });

const browser = await chromium.launch({
	executablePath: process.env.CHROME_PATH ?? '/usr/local/bin/google-chrome',
	headless: true,
	args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (error) => pageErrors.push(String(error)));
page.on('console', (msg) => {
	if (msg.type() === 'error') consoleErrors.push(msg.text());
});

try {
	await page.goto(`${base}/?assetPlaceholders=1`, {
		waitUntil: 'domcontentloaded',
		timeout: 60000,
	});
	await page.waitForFunction(
		() => {
			const app = window.__kongClub;
			return Boolean(app && app.loaded);
		},
		{ timeout: 90000 },
	);
	const status = await page.evaluate(() => ({
		loaded: Boolean(window.__kongClub?.loaded),
		phase: window.__kongClub?.loadingPhase ?? null,
		errors: (window.__kongClub?.loadErrors ?? []).map((entry) => entry.key),
		logo: window.__kongClub?.loadedAssets?.title_art ? 'present' : 'missing',
	}));
	await page.screenshot({ path: path.join(shotDir, 'placeholders-boot.png') });
	console.log(
		JSON.stringify({ status, pageErrors, consoleErrors: consoleErrors.slice(0, 30) }, null, 2),
	);
	const unrelated = pageErrors.filter((error) => !error.includes('math books'));
	if (unrelated.length) {
		throw new Error(`Page errors:\n${unrelated.join('\n')}`);
	}
	if (!status.loaded) throw new Error('Game did not reach loaded');
	if (status.logo !== 'present') throw new Error('Logo placeholder did not resolve');
	if (status.errors.length) {
		throw new Error(`Placeholder assets failed: ${status.errors.join(', ')}`);
	}
	const animationNoise = consoleErrors.filter((line) => line.includes('Animation not found'));
	if (animationNoise.length) {
		throw new Error(`Placeholder spine is missing boot animations:\n${animationNoise[0]}`);
	}

	const fallbackPage = await browser.newPage({ viewport: { width: 1280, height: 720 } });
	const fallbackPageErrors = [];
	fallbackPage.on('pageerror', (error) => fallbackPageErrors.push(String(error)));
	await fallbackPage.route('**/sprites/monkeySymbols/title_art.png*', (route) => route.abort());
	await fallbackPage.goto(base + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
	await fallbackPage.waitForFunction(() => Boolean(window.__kongClub?.loaded), { timeout: 120000 });
	const fallback = await fallbackPage.evaluate(() => ({
		logo: window.__kongClub?.loadedAssets?.title_art ? 'present' : 'missing',
		errors: (window.__kongClub?.loadErrors ?? []).map((entry) => entry.key),
	}));
	console.log(JSON.stringify({ fallback, fallbackPageErrors }, null, 2));
	await fallbackPage.close();
	if (fallback.logo !== 'present' || fallback.errors.includes('title_art')) {
		throw new Error(`Logo did not fall back after a 404: ${JSON.stringify(fallback)}`);
	}
} finally {
	await browser.close();
	if (server && !server.killed) {
		try {
			process.kill(-server.pid, 'SIGTERM');
		} catch {
			server.kill('SIGTERM');
		}
	}
}
