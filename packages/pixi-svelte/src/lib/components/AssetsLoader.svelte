<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as PIXI from 'pixi.js';

	import { getContextApp } from '../context.svelte';
	import { assetLoadConcurrency, getProcessed, mapPool } from '../assetLoad';
	import type { LoadedAssets, RawAsset, Asset } from '../types';

	type Props = { children: Snippet };

	const props: Props = $props();
	const context = getContextApp();

	const ASSET_LOAD_TIMEOUT_MS = 45_000;
	const LOG_PREFIX = '[AssetsLoader]';

	let preLoaded = $state(false);
	let preLoading = $state(false);
	let postLoading = $state(false);
	let postLoaded = $state(false);

	const assetNameList = $derived(
		context.stateApp.assets
			? Object.keys(context.stateApp.assets).filter(
					(key) => Boolean(context.stateApp.assets?.[key].preload) === false,
				)
			: [],
	);

	const preAssetNameList = $derived(
		context.stateApp.assets
			? Object.keys(context.stateApp.assets).filter(
					(key) => context.stateApp.assets?.[key].preload === true,
				)
			: [],
	);

	const totalAssetCount = $derived(preAssetNameList.length + assetNameList.length);
	let loadedCount = $state(0);

	const bumpProgress = (phase: 'preload' | 'postload', message: string) => {
		context.stateApp.loadingStatusMessage = message;
		if (context.stateApp.loaded) return;
		context.stateApp.loadingPhase = phase;
		if (totalAssetCount <= 0) {
			context.stateApp.loadingProgress = 100;
			return;
		}
		context.stateApp.loadingProgress = Math.min(99, (loadedCount / totalAssetCount) * 100);
	};

	const resolveLoadSrc = (asset: Asset) => {
		const { type, src } = asset;
		return type === 'spine'
			? Object.values(src).filter((item): item is string => typeof item === 'string')
			: src;
	};

	const resolveLogUrl = (asset: Asset): string => {
		const src = resolveLoadSrc(asset);
		return Array.isArray(src) ? src.join(', ') : String(src);
	};

	const loadWithTimeout = async (promise: Promise<unknown>, key: string, url: string) => {
		let timeoutId: ReturnType<typeof setTimeout> | undefined;
		const timeout = new Promise<never>((_, reject) => {
			timeoutId = setTimeout(
				() => reject(new Error(`Timed out after ${ASSET_LOAD_TIMEOUT_MS}ms`)),
				ASSET_LOAD_TIMEOUT_MS,
			);
		});
		try {
			return await Promise.race([promise, timeout]);
		} finally {
			if (timeoutId !== undefined) clearTimeout(timeoutId);
		}
	};

	const recordLoadError = (key: string, url: string, error: unknown) => {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`${LOG_PREFIX} Failed "${key}" (${url}):`, error);
		const entry = { key, url, message };
		const existing = context.stateApp.loadErrors ?? [];
		if (!existing.some((e) => e.key === key)) {
			context.stateApp.loadErrors = [...existing, entry];
		}
	};

	const loadRaw = async (key: string, asset: Asset, src: Asset['src']) => {
		const url = Array.isArray(src)
			? src.join(', ')
			: typeof src === 'string'
				? src
				: [src.atlas, src.skeleton].join(', ');
		const loadSrc =
			asset.type === 'spine' && typeof src !== 'string'
				? [src.atlas, src.skeleton]
				: src;
		return (await loadWithTimeout(PIXI.Assets.load<RawAsset>(loadSrc), key, url)) as RawAsset;
	};

	const storeProcessed = (key: string, asset: Asset, rawAsset: RawAsset, src: Asset['src']) => {
		const processed = getProcessed({ key, rawAsset, type: asset.type, src }) ?? {};
		loadedCount += 1;
		context.stateApp.loadedAssets = {
			...context.stateApp.loadedAssets,
			...processed,
		};
		return processed;
	};

	const loadSingleAsset = async (key: string, phase: 'preload' | 'postload') => {
		const asset = context.stateApp.assets![key];
		const url = resolveLogUrl(asset);
		bumpProgress(phase, `Loading ${key}…`);

		try {
			const rawAsset = await loadRaw(key, asset, asset.src);
			const processed = storeProcessed(key, asset, rawAsset, asset.src);
			bumpProgress(phase, `Loaded ${key}`);
			return processed;
		} catch (error) {
			if (asset.fallbackSrc) {
				try {
					const rawAsset = await loadRaw(key, asset, asset.fallbackSrc);
					const processed = storeProcessed(key, asset, rawAsset, asset.fallbackSrc);
					console.warn(`${LOG_PREFIX} Placeholder for "${key}" (${url})`);
					bumpProgress(phase, `Placeholder for ${key}`);
					return processed;
				} catch (fallbackError) {
					recordLoadError(key, url, fallbackError);
				}
			} else {
				recordLoadError(key, url, error);
			}
			loadedCount += 1;
			bumpProgress(phase, `Skipped ${key} (failed)`);
			return {};
		}
	};

	const loadAssets = async (nameList: string[], phase: 'preload' | 'postload') => {
		if (!nameList.length) return {} as LoadedAssets;

		const loadedAssetsArray = await mapPool(
			nameList,
			(key) => loadSingleAsset(key, phase),
			assetLoadConcurrency(),
		);

		return loadedAssetsArray.reduce(
			(acc, cur) => ({
				...acc,
				...cur,
			}),
			{} as LoadedAssets,
		);
	};

	const markPlayable = () => {
		context.stateApp.loadingProgress = 100;
		context.stateApp.loadingPhase =
			(context.stateApp.loadErrors?.length ?? 0) > 0 ? 'error' : 'done';
		context.stateApp.loadingStatusMessage =
			(context.stateApp.loadErrors?.length ?? 0) > 0
				? 'Loaded with fallbacks — starting game'
				: 'Ready';
		context.stateApp.loaded = true;
	};

	$effect(() => {
		if (preLoaded || preLoading) return;
		(async () => {
			preLoading = true;
			try {
				context.stateApp.loadingPhase = 'preload';
				context.stateApp.loadingStatusMessage = 'Loading core assets…';
				context.stateApp.loadErrors = [];
				loadedCount = 0;

				if (preAssetNameList.length > 0) {
					await loadAssets(preAssetNameList, 'preload');
				}
			} catch (error) {
				console.error(`${LOG_PREFIX} Preload fatal:`, error);
				recordLoadError('__preload__', 'batch', error);
			} finally {
				markPlayable();
				preLoaded = true;
				preLoading = false;
			}
		})();
	});

	$effect(() => {
		if (!preLoaded || postLoaded || postLoading) return;
		(async () => {
			postLoading = true;
			try {
				if (assetNameList.length > 0) {
					await loadAssets(assetNameList, 'postload');
				}
			} catch (error) {
				console.error(`${LOG_PREFIX} Postload fatal:`, error);
				recordLoadError('__postload__', 'batch', error);
			} finally {
				postLoaded = true;
				postLoading = false;
			}
		})();
	});
</script>

{#if context.stateApp.loaded}
	{@render props.children()}
{/if}
