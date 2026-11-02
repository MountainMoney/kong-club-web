import * as PIXI from 'pixi.js';

import type { LoadedAssets, Assets } from './types';

export type AssetLoadError = {
	key: string;
	url: string;
	message: string;
};

export type LoadingPhase = 'idle' | 'preload' | 'postload' | 'done' | 'error';

export function createApp({ assets }: { assets: Assets }) {
	const reset = () => {
		stateApp.loaded = false;
		stateApp.loadingProgress = 0;
		stateApp.loadedAssets = {};
		stateApp.pixiApplication = undefined as PIXI.Application | undefined;
		stateApp.loadingPhase = 'idle';
		stateApp.loadErrors = [];
		stateApp.loadingStatusMessage = '';
	};

	const stateApp = $state({
		reset,
		assets,
		loaded: false,
		loadingProgress: 0,
		loadedAssets: {} as LoadedAssets,
		pixiApplication: undefined as PIXI.Application | undefined,
		loadingPhase: 'idle' as LoadingPhase,
		loadErrors: [] as AssetLoadError[],
		loadingStatusMessage: '',
	});

	return {
		stateApp,
	};
}

export type App = ReturnType<typeof createApp>;
