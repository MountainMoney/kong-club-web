import * as SPINE_PIXI from '@esotericsoftware/spine-pixi-v8';
import type { RawType, RawAsset, RawSpine, RawSprites, SpineSrc, RawAudio } from './types';

const PROCESS_METHOD_MAP = {
	spine: ({ key, rawAsset, src }: { key: string; rawAsset: RawSpine; src: SpineSrc }) => {
		const atlasAsset = rawAsset[src.atlas] as SPINE_PIXI.TextureAtlas;
		const skeletonAsset = rawAsset[src.skeleton] as Uint8Array;
		const attachmentLoader = new SPINE_PIXI.AtlasAttachmentLoader(atlasAsset);
		const parser =
			skeletonAsset instanceof Uint8Array
				? new SPINE_PIXI.SkeletonBinary(attachmentLoader)
				: new SPINE_PIXI.SkeletonJson(attachmentLoader);
		const scale = src?.scale ?? 1;
		parser.scale = scale;
		const skeletonData = parser.readSkeletonData(skeletonAsset);

		return { [key]: skeletonData };
	},
	sprite: ({ key, rawAsset }: { key: string; rawAsset: RawSprites }) => ({ [key]: rawAsset }),
	sprites: ({ rawAsset }: { rawAsset: RawSprites }) => rawAsset.textures,
	spriteSheet: ({ key, rawAsset }: { key: string; rawAsset: RawSprites }) => ({
		[key]: Object.values(rawAsset.textures),
	}),
	audio: ({ key, rawAsset }: { key: string; rawAsset: RawAudio }) => {
		return { [key]: rawAsset };
	},
} as const;

export const getProcessed = ({
	key,
	type,
	rawAsset,
	src,
}: {
	key: string;
	type: RawType;
	rawAsset: RawAsset;
	src: string | SpineSrc;
}) => {
	if (type === 'font') return; // No need to process raw font data and add it to the loaded assets.
	const processMethod = PROCESS_METHOD_MAP[type];
	if (!processMethod)
		throw Error('No asset process method found, please check the type of the asset.');
	// @ts-expect-error
	return processMethod({ key, rawAsset, src });
};

/** Cap parallel `PIXI.Assets.load` so mobile WebViews do not decode the whole manifest at once. */
export const ASSET_LOAD_CONCURRENCY = 3;
export const ASSET_LOAD_CONCURRENCY_COARSE = 2;

export const assetLoadConcurrency = () => {
	if (typeof window === 'undefined') return ASSET_LOAD_CONCURRENCY;
	const coarse =
		typeof window.matchMedia === 'function' && window.matchMedia('(pointer:coarse)').matches;
	const mobile =
		typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
	return coarse || mobile ? ASSET_LOAD_CONCURRENCY_COARSE : ASSET_LOAD_CONCURRENCY;
};

export const mapPool = async <T, R>(
	items: readonly T[],
	worker: (item: T, index: number) => Promise<R>,
	concurrency = ASSET_LOAD_CONCURRENCY,
): Promise<R[]> => {
	if (items.length === 0) return [];
	const results: R[] = new Array(items.length);
	let nextIndex = 0;
	const run = async () => {
		while (true) {
			const index = nextIndex;
			nextIndex += 1;
			if (index >= items.length) return;
			results[index] = await worker(items[index], index);
		}
	};
	const workerCount = Math.min(Math.max(1, concurrency), items.length);
	await Promise.all(Array.from({ length: workerCount }, () => run()));
	return results;
};
