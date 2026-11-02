<script lang="ts">
	import * as PIXI from 'pixi.js';
	import { onMount, onDestroy, type Snippet } from 'svelte';
	import { devicePixelRatio } from 'svelte/reactivity/window';

	import { getContextApp } from '../context.svelte';
	import { preloadFont } from '../utils.svelte';

	type Props = { children: Snippet };

	const props: Props = $props();
	const context = getContextApp();

	const MAX_FPS = 60;
	const MAX_DEVICE_PIXEL_RATIO = 1.5;
	const MAX_DEVICE_PIXEL_RATIO_COARSE = 1.25;

	let wrap: HTMLDivElement;
	let initialised = $state(false);
	let initError = $state<string | null>(null);
	let unmountResize: (() => void) | undefined;

	const mobileGpu =
		typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

	const coarsePointer = () =>
		typeof window !== 'undefined' &&
		typeof window.matchMedia === 'function' &&
		window.matchMedia('(pointer:coarse)').matches;

	const resolution = () => {
		const dpr = devicePixelRatio.current ?? 1;
		const cap =
			coarsePointer() || mobileGpu ? MAX_DEVICE_PIXEL_RATIO_COARSE : MAX_DEVICE_PIXEL_RATIO;
		return Math.min(dpr, cap);
	};

	const initOptions = () => ({
		autoDensity: true,
		backgroundAlpha: 0,
		hello: true,
		multiView: false,
		antialias: false,
		clearBeforeRender: true,
		// Stake iframes: WebGPU depth-stencil can mismatch by 1px (black canvas). WebGL only.
		preference: 'webgl' as const,
		powerPreference: (mobileGpu ? 'default' : 'high-performance') as const,
		resolution: resolution(),
	});

	/** Integer CSS pixels — avoids WebGPU/WebGL attachment size mismatches in iframes. */
	const syncRendererSize = (app: PIXI.Application<PIXI.Renderer<HTMLCanvasElement>>) => {
		const width = Math.max(1, Math.floor(window.innerWidth));
		const height = Math.max(1, Math.floor(window.innerHeight));
		app.renderer.resolution = resolution();
		app.renderer.resize(width, height);
	};

	const mountApplication = (app: PIXI.Application<PIXI.Renderer<HTMLCanvasElement>>) => {
		wrap.appendChild(app.canvas);
		app.renderer.events.autoPreventDefault = false;
		app.renderer.canvas.style.touchAction = 'auto';
		app.stage.sortableChildren = true;
		syncRendererSize(app);
		const onResize = () => syncRendererSize(app);
		window.addEventListener('resize', onResize);
		context.stateApp.pixiApplication = app;
		return () => window.removeEventListener('resize', onResize);
	};

	const createApplication = async () => {
		const app = new PIXI.Application<PIXI.Renderer<HTMLCanvasElement>>();
		await app.init(initOptions());
		app.ticker.maxFPS = MAX_FPS;
		return app;
	};

	const initialiseApplication = async () => {
		await preloadFont();
		unmountResize = mountApplication(await createApplication());
	};

	onMount(async () => {
		initError = null;
		try {
			if (!initialised) await initialiseApplication();
			initialised = true;
		} catch (error) {
			initError =
				'Unable to start the game graphics. Try refreshing the page, updating your browser, or disabling strict GPU blockers.';
			console.error(error);
		}
	});

	onDestroy(() => {
		unmountResize?.();
		unmountResize = undefined;
		if (context.stateApp.pixiApplication) {
			context.stateApp.pixiApplication.destroy();
			context.stateApp.pixiApplication = undefined;
		}
		PIXI.Assets.reset();
	});
</script>

<div bind:this={wrap}>
	{#if initError}
		<div class="pixi-init-error" role="alert">
			<p>{initError}</p>
		</div>
	{:else if initialised && context.stateApp.pixiApplication?.stage}
		{@render props.children()}
	{/if}
</div>

<style>
	.pixi-init-error {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		padding: 1.5rem;
		box-sizing: border-box;
		background: #0d2818;
		color: #ffd700;
		font-family: system-ui, sans-serif;
		text-align: center;
	}

	.pixi-init-error p {
		margin: 0;
		max-width: 28rem;
		line-height: 1.5;
		font-size: 1rem;
		font-weight: 600;
	}
</style>
