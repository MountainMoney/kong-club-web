<script lang="ts" module>
	export type EmitterEventBlackScreen =
		| { type: 'blackScreenFadeIn' }
		| { type: 'blackScreenFadeOut' }
		/** Fade the closed curtain as a whole (GG intro card backdrop dim in / out). */
		| { type: 'blackScreenCover'; alpha: number; durationMs: number };
</script>

<script lang="ts">
	// GG scene curtain 1:1 (live GG build, game.pretty.js 53929-53960 aV/oV and 85111-85200 Y7e):
	// an opaque iris that closes on the board centre over closeMs (easeInQuad), holds,
	// then opens over openMs (easeOutCubic). Same events as the old flat black fade.
	import * as PIXI from 'pixi.js';
	import { onDestroy } from 'svelte';
	import { Tween } from 'svelte/motion';

	import { BaseSprite, Container, Rectangle } from 'pixi-svelte';
	import { waitForTimeout } from 'utils-shared/wait';

	import { zIndexes } from '../game/constants';
	import { bonusScreenAnimMs } from '../game/bonusScreenWait';
	import { getContext } from '../game/context';
	import { GG_CURTAIN, ggEaseInQuad, ggEaseOutCubic } from '../game/ggTransitions';
	import { getMonkeyBoardLayout } from '../game/kongClubLayout';

	const context = getContext();

	type Phase = 'open' | 'closing' | 'closed' | 'opening';
	let phase = $state<Phase>('open');
	let token = 0;
	const progress = new Tween(0);
	/** Whole-curtain alpha while closed. 1 = fully covered. */
	const cover = new Tween(1);

	const GRADIENT_PX = 512;
	const makeRadial = (stops: [number, number][]) => {
		const canvas = document.createElement('canvas');
		canvas.width = GRADIENT_PX;
		canvas.height = GRADIENT_PX;
		const g = canvas.getContext('2d')!;
		const h = GRADIENT_PX / 2;
		const grad = g.createRadialGradient(h, h, 0, h, h, h);
		for (const [at, a] of stops) grad.addColorStop(at, `rgba(255,255,255,${a})`);
		g.fillStyle = grad;
		g.fillRect(0, 0, GRADIENT_PX, GRADIENT_PX);
		return PIXI.Texture.from(canvas);
	};
	const s = 1 - GG_CURTAIN.softness;
	const irisTexture = makeRadial([
		[0, 0],
		[s, 0],
		[s + GG_CURTAIN.softness * 0.55, 0.72],
		[1, 1],
	]);
	const rimAt = s + GG_CURTAIN.softness * 0.2;
	const rimTexture = makeRadial([
		[0, 0],
		[Math.max(0, rimAt - GG_CURTAIN.rim.width / 2), 0],
		[rimAt, 1],
		[Math.min(1, rimAt + GG_CURTAIN.rim.width / 2), 0],
		[1, 0],
	]);
	onDestroy(() => {
		irisTexture.destroy(true);
		rimTexture.destroy(true);
	});

	/** GG `w7`: below emberLight the iris reads as fully shut. */
	const ember = (r: number) => (r < GG_CURTAIN.emberLight ? 0 : r);
	/** GG `oPe`: 1 = open, 0 = shut. */
	const openness = $derived.by(() => {
		const x = progress.current;
		if (phase === 'open') return 1;
		if (phase === 'closed') return 0;
		if (phase === 'closing') return ember(1 - ggEaseInQuad(x));
		return ember(ggEaseOutCubic(x));
	});

	const canvas = $derived(context.stateLayoutDerived.canvasSizes());
	/** Board centre on the canvas (GG centres the iris on its board). */
	const centre = $derived.by(() => {
		const main = context.stateLayoutDerived.mainLayout();
		const board = getMonkeyBoardLayout(context.stateLayoutDerived.layoutType(), main);
		const anchor =
			typeof main.anchor === 'number' ? { x: main.anchor, y: main.anchor } : main.anchor;
		return {
			x: main.x + (board.x - anchor.x * main.width) * main.scale,
			y: main.y + (board.y - anchor.y * main.height) * main.scale,
		};
	});
	/** GG `lPe`: radius that just clears the farthest canvas corner at openness 1. */
	const radius = $derived.by(() => {
		const { x, y } = centre;
		const { width: w, height: h } = canvas;
		const far = Math.max(Math.hypot(x, y), Math.hypot(w - x, y), Math.hypot(x, h - y), Math.hypot(w - x, h - y));
		return (far / (1 - GG_CURTAIN.softness)) * Math.max(0, openness);
	});
	const rects = $derived.by(() => {
		const { x, y } = centre;
		const { width: w, height: h } = canvas;
		const c = radius;
		const top = Math.max(0, y - c);
		const bottom = Math.min(h, y + c);
		const left = Math.max(0, x - c);
		const right = Math.min(w, x + c);
		return [
			{ x: 0, y: 0, width: w, height: top },
			{ x: 0, y: bottom, width: w, height: h - bottom },
			{ x: 0, y: top, width: left, height: bottom - top },
			{ x: right, y: top, width: w - right, height: bottom - top },
		].filter((r) => r.width > 0 && r.height > 0);
	});

	const close = async () => {
		if (phase === 'closed') {
			if (cover.target < 0.999) await cover.set(1, { duration: bonusScreenAnimMs(GG_CURTAIN.closeMs), easing: ggEaseInQuad });
			return;
		}
		const t = ++token;
		cover.set(1, { duration: 0 });
		phase = 'closing';
		progress.set(0, { duration: 0 });
		await progress.set(1, { duration: bonusScreenAnimMs(GG_CURTAIN.closeMs) });
		if (t === token) phase = 'closed';
	};

	const open = async () => {
		if (phase !== 'closed') return;
		const t = ++token;
		if (cover.target < 0.001) {
			phase = 'open';
			cover.set(1, { duration: 0 });
			return;
		}
		await waitForTimeout(bonusScreenAnimMs(GG_CURTAIN.holdMs));
		if (t !== token) return;
		phase = 'opening';
		progress.set(0, { duration: 0 });
		await progress.set(1, { duration: bonusScreenAnimMs(GG_CURTAIN.openMs) });
		if (t === token) {
			phase = 'open';
			cover.set(1, { duration: 0 });
		}
	};

	context.eventEmitter.subscribeOnMount({
		blackScreenFadeIn: close,
		blackScreenFadeOut: open,
		blackScreenCover: async ({ alpha, durationMs }) => {
			if (phase !== 'closed') return;
			await cover.set(alpha, { duration: bonusScreenAnimMs(durationMs), easing: ggEaseOutCubic });
		},
	});
</script>

{#if phase !== 'open' && cover.current > 0.001}
	<Container zIndex={zIndexes.blackScreen} eventMode="none" alpha={cover.current}>
		{#if radius > 0.5}
			<BaseSprite
				texture={irisTexture}
				anchor={0.5}
				x={centre.x}
				y={centre.y}
				width={radius * 2}
				height={radius * 2}
				tint={GG_CURTAIN.color}
			/>
			<BaseSprite
				texture={rimTexture}
				anchor={0.5}
				x={centre.x}
				y={centre.y}
				width={radius * 2}
				height={radius * 2}
				tint={GG_CURTAIN.rim.color}
				blendMode="add"
				alpha={GG_CURTAIN.rim.alpha * Math.sin(Math.PI * Math.min(1, Math.max(0, openness)))}
			/>
		{/if}
		{#each rects as r, i (i)}
			<Rectangle x={r.x} y={r.y} width={r.width} height={r.height} backgroundColor={GG_CURTAIN.color} />
		{/each}
	</Container>
{/if}
