<script lang="ts" module>
	import { type Props as BaseProps } from './BaseSpineProvider.svelte';
	import type { PixiPoint } from '../types';

	export type Props = Omit<BaseProps, 'spineData' | 'pivot' | 'scale'> & {
		debug?: boolean;
		key: string;
		anchor?: PixiPoint;
		scale?: PixiPoint;
	};
</script>

<script lang="ts">
	import * as SPINE_PIXI from '@esotericsoftware/spine-pixi-v8';

	import BaseSpineProvider from './BaseSpineProvider.svelte';
	import { anchorToPivot } from '../utils.svelte';
	import { getContextApp } from '../context.svelte';

	const {
		debug,
		key,
		anchor,
		children,
		scale: scaleProp,
		width,
		height,
		...baseSpineProps
	}: Props = $props();
	const context = getContextApp();
	const spineData = $derived(context.stateApp.loadedAssets?.[key] as SPINE_PIXI.SkeletonData);

	const SCALE_BASE = { x: 1, y: 1 };

	// Width/height become uniform scale only. Pixi's height setter would
	// overwrite scale.y from live mesh bounds and squash the skeleton.
	const scaleSize = $derived.by(() => {
		if (!spineData) return SCALE_BASE;
		if (!spineData?.width || !spineData?.height) return SCALE_BASE;
		if (!width && !height) return SCALE_BASE;
		if (!width && height) {
			const scaleHeight = height / spineData.height;
			return { x: scaleHeight, y: scaleHeight };
		}
		if (width && !height) {
			const scaleWidth = width / spineData.width;
			return { x: scaleWidth, y: scaleWidth };
		}
		if (width && height) {
			return {
				x: width / spineData.width,
				y: height / spineData.height,
			};
		}

		return SCALE_BASE;
	});

	const scale = $derived.by(() => {
		if (typeof scaleProp === 'number')
			return { x: scaleSize.x * scaleProp, y: scaleSize.y * scaleProp };
		return { x: scaleSize.x * (scaleProp?.x || 1), y: scaleSize.y * (scaleProp?.y || 1) };
	});

	const pivot = $derived.by(() => {
		if (!spineData) return 0;
		if (!spineData?.width || !spineData?.height) return 0;
		const factWidth = width || spineData.width;
		const factHeight = height || spineData.height;

		return anchorToPivot({ anchor, sizes: { width: factWidth, height: factHeight } });
	});
</script>

{#if import.meta.env.DEV && !spineData}
	{console.error(`Spine: key "${key}" is not found in loadedAssets`)}
{/if}

{#if import.meta.env.DEV && (!spineData || debug)}
	{console.log('loadedAssets', $state.snapshot(context.stateApp).loadedAssets)}
{/if}

{#if spineData}
	{#key spineData}
		<BaseSpineProvider {...baseSpineProps} {scale} {pivot} {spineData}>
			{@render children()}
		</BaseSpineProvider>
	{/key}
{/if}
