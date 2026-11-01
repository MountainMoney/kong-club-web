import type { Assets } from 'pixi-svelte';

/**
 * SvelteKit base path (e.g. "" or "/kong-club/").
 * Vite exposes this at build time; falls back to "/" for SSR safety.
 */
export const APP_BASE_URL = (import.meta.env.BASE_URL ?? '/').replace(/\/?$/, '/');

/**
 * Resolve a static path for Pixi / fetch.
 *
 * Stake serves each published frontend under a versioned route (for example `/v1/`).
 * When Vite's base is `./`, keep URLs relative so assets resolve under that route
 * instead of being forced to the origin root.
 */
export const assetUrl = (path: string): string => {
	if (!path) return path;
	if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;

	const base = APP_BASE_URL === '/' ? '' : APP_BASE_URL.replace(/\/$/, '');
	const normalized = path.startsWith('/') ? path : `/${path}`;
	const isRelativeBase = base === '.' || base.startsWith('./') || base.startsWith('../');

	if (base && (normalized === base || normalized.startsWith(`${base}/`))) {
		return normalized;
	}

	const resolved = `${base}${normalized}`;
	if (isRelativeBase) return resolved;

	return typeof window !== 'undefined'
		? new URL(resolved, window.location.origin).href
		: resolved;
};

type SpineSrc = { atlas: string; skeleton: string; scale?: number };

const resolveSpineSrc = (src: SpineSrc): SpineSrc => ({
	...src,
	atlas: assetUrl(src.atlas),
	skeleton: assetUrl(src.skeleton),
});

/** Rewrite every manifest entry so production loads from the correct origin + base path. */
export const resolveAssetsManifest = (manifest: Assets): Assets => {
	const out: Assets = {};
	for (const [key, asset] of Object.entries(manifest)) {
		if (!asset) continue;
		if (typeof asset.src === 'string') {
			out[key] = { ...asset, src: assetUrl(asset.src) };
		} else {
			out[key] = { ...asset, src: resolveSpineSrc(asset.src as SpineSrc) };
		}
	}
	return out;
};
