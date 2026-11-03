import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
	KONG_ASSET_MANIFEST,
	PLACEHOLDER,
	buildPixiAssets,
	fallbackSrc,
	logicalPath,
} from './manifest.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const staticRoot = path.resolve(here, '../../static');

const REQUIRED_KEYS = [
	'logo',
	'symbol_ST',
	'symbol_LE',
	'bg_base',
	'bg_bonus_see',
	'bg_bonus_hear',
	'bg_bonus_pick',
	'sfx_btn_spin',
	'sfx_sprite',
	'music_base',
	'music_feature_spin',
	'music_win_max',
	'win_anim_big',
	'win_anim_bigwin',
	'font_fredoka_one',
];

test('every manifest key is unique and resolves to a path', () => {
	const seen = new Set<string>();
	for (const entry of KONG_ASSET_MANIFEST) {
		assert.equal(seen.has(entry.key), false, `duplicate key ${entry.key}`);
		seen.add(entry.key);
		assert.ok(entry.fallback, `${entry.key} needs a fallback`);
		const file = logicalPath(entry.key, false);
		assert.equal(file.includes('stake-engine'), false, entry.key);
		assert.match(file, /^\/assets\//, entry.key);
		const placeholder = logicalPath(entry.key, true);
		if (entry.fallback === 'cssFont') {
			assert.equal(placeholder, '');
		} else {
			assert.match(placeholder, /^\/assets\/placeholders\//, entry.key);
		}
	}
	for (const key of REQUIRED_KEYS) {
		assert.equal(seen.has(key), true, `missing ${key}`);
	}
});

test('placeholder mode gives every Pixi key a loadable fallback', () => {
	const assets = buildPixiAssets({ placeholders: true });
	const runtimeKeys = new Set<string>();
	assert.ok(Object.keys(assets).length > 20);
	for (const [key, asset] of Object.entries(assets)) {
		assert.equal(runtimeKeys.has(key), false, `duplicate runtime key ${key}`);
		runtimeKeys.add(key);
		const src = typeof asset.src === 'string' ? asset.src : asset.src.skeleton;
		const fallback =
			typeof asset.fallbackSrc === 'string' ? asset.fallbackSrc : asset.fallbackSrc.skeleton;
		assert.match(src, /^\/assets\/placeholders\//, key);
		assert.match(fallback, /^\/assets\/placeholders\//, key);
		assert.ok(asset.type, key);
	}
	assert.equal(assets.title_art.src, PLACEHOLDER.texture);
	assert.equal(assets.sound.src, PLACEHOLDER.audio);
	assert.equal(assets.jungleBackground.src, PLACEHOLDER.texture);
	assert.equal(assets.ggBgDesktopSee.src, PLACEHOLDER.texture);
	assert.equal(assets.ggBgDesktopHear.src, PLACEHOLDER.texture);
	assert.equal(assets.ggBgDesktopGamble.src, PLACEHOLDER.texture);
});

test('real mode keeps the shipped paths', () => {
	const assets = buildPixiAssets({ placeholders: false });
	assert.equal(assets.title_art.src, '/assets/sprites/monkeySymbols/title_art.png');
	assert.equal(assets.sound.src, '/assets/audio/sounds.json');
	assert.equal(assets.LE.preload, true);
	assert.equal(assets.bigwin.preload, undefined);
	const bigwin = assets.bigwin.src;
	assert.equal(typeof bigwin, 'object');
	if (typeof bigwin === 'string') return;
	assert.match(bigwin.skeleton, /mm_bigwin\.json$/);
	assert.equal(
		fallbackSrc({ ...KONG_ASSET_MANIFEST[0], fallback: 'texture' }),
		PLACEHOLDER.texture,
	);
});

test('every sound-pack cue has a manifest entry and placeholder files exist', () => {
	const sounds = JSON.parse(
		fs.readFileSync(path.join(staticRoot, 'assets/audio/sounds.json'), 'utf8'),
	) as { sprite: Record<string, unknown> };
	for (const name of Object.keys(sounds.sprite)) {
		const matches = KONG_ASSET_MANIFEST.filter((entry) => entry.sprite === name);
		assert.equal(matches.length, 1, `cue ${name}`);
	}
	for (const file of [
		'assets/placeholders/pixel.png',
		'assets/placeholders/sheet.json',
		'assets/placeholders/silent.wav',
		'assets/placeholders/sounds.json',
		'assets/placeholders/font.xml',
		'assets/placeholders/spine/placeholder.json',
		'assets/placeholders/spine/placeholder.atlas',
		'assets/placeholders/spine/pixel.png',
	]) {
		assert.equal(fs.existsSync(path.join(staticRoot, file)), true, file);
	}
});
