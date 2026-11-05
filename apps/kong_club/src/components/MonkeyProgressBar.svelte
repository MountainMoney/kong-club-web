<script lang="ts" module>
	export type ProgressBarSpark = {
		x: number;
		y: number;
		vx: number;
		vy: number;
		r: number;
		life: number;
		maxLife: number;
		color: number;
		bright: boolean;
	};

	/** Live bar view — Mechanics writes, this presenter reads (can remount during tease). */
	export const stateProgressBar = $state({
		zIndex: 90,
		barX: 0,
		barY: 0,
		trackX: 0,
		trackY: 0,
		trackW: 0,
		trackH: 0,
		barW: 0,
		barH: 0,
		fillVisual: 0,
		dumpRed: false,
		armed: false,
		/** Rainbow fill — Speak No Evil only. */
		scatterRainbow: false,
		/** Slow gold hue wash — SUMMIT / peak_spin (not dump). */
		goldWash: false,
		modeLabel: '',
		sparks: [] as ProgressBarSpark[],
		barPhase: 0,
		/** Slow hue wash for the Speak No Evil fill (0–1). */
		rainbowPhase: 0,
		boardW: 0,
		punchScale: 1,
		punchFlash: 0,
	});
</script>

<script lang="ts">
	import { Texture } from 'pixi.js';
	import { Container, Graphics, Rectangle, Sprite } from 'pixi-svelte';

	import BoardContainer from './BoardContainer.svelte';

	const view = stateProgressBar;
	const fillTint = $derived(view.dumpRed ? 0xff2a2a : view.armed ? 0xffe066 : 0xffffff);

	const RAINBOW_TEX_W = 256;
	let rainbowCanvas: HTMLCanvasElement | null = null;
	let rainbowCtx: CanvasRenderingContext2D | null = null;
	let rainbowTexture: Texture | null = null;
	let lastRainbowPaint = -1;
	let lastWashKind: 'rainbow' | 'gold' | null = null;

	const ensureRainbowTexture = () => {
		if (rainbowTexture) return rainbowTexture;
		if (typeof document === 'undefined') return null;
		rainbowCanvas = document.createElement('canvas');
		rainbowCanvas.width = RAINBOW_TEX_W;
		rainbowCanvas.height = 2;
		rainbowCtx = rainbowCanvas.getContext('2d');
		if (!rainbowCtx) return null;
		rainbowTexture = Texture.from(rainbowCanvas);
		return rainbowTexture;
	};

	const paintHueWash = (phase: number, kind: 'rainbow' | 'gold') => {
		const ctx = rainbowCtx;
		const tex = rainbowTexture;
		if (!ctx || !tex) return;
		if (kind === lastWashKind && Math.abs(phase - lastRainbowPaint) < 0.00035) return;
		lastRainbowPaint = phase;
		lastWashKind = kind;
		const grad = ctx.createLinearGradient(0, 0, RAINBOW_TEX_W, 0);
		const stops = 12;
		for (let i = 0; i <= stops; i += 1) {
			const t = i / stops;
			const wave = (((t + phase) % 1) + 1) % 1;
			if (kind === 'gold') {
				const hue = 34 + Math.sin(wave * Math.PI * 2) * 12;
				const sat = 82 + Math.sin(wave * Math.PI * 2 + 0.7) * 8;
				const light = 50 + Math.sin(wave * Math.PI * 2 + 1.4) * 12;
				grad.addColorStop(t, `hsl(${hue} ${sat}% ${light}%)`);
			} else {
				grad.addColorStop(t, `hsl(${wave * 360} 90% 56%)`);
			}
		}
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, RAINBOW_TEX_W, 2);
		tex.source.update();
	};

	const drawHueWashFill = $derived.by(() => {
		const barW = view.barW;
		const barH = view.barH;
		const ox = -view.trackX;
		const oy = -view.trackY;
		const phase = view.rainbowPhase;
		const dump = view.dumpRed;
		const kind: 'rainbow' | 'gold' | null = view.scatterRainbow
			? 'rainbow'
			: view.goldWash
				? 'gold'
				: null;
		return (g: import('pixi.js').Graphics) => {
			g.clear();
			if (barW <= 0 || barH <= 0 || dump || !kind) return;
			const tex = ensureRainbowTexture();
			if (!tex) return;
			paintHueWash(phase, kind);
			g.rect(ox, oy, barW, barH);
			g.fill({ texture: tex, textureSpace: 'local' });
		};
	});

	const drawFillSparks = $derived.by(() => {
		const live = view.sparks;
		const phase = view.barPhase;
		return (g: import('pixi.js').Graphics) => {
			g.clear();
			for (const spark of live) {
				const twinkle = 0.62 + 0.38 * Math.sin(phase * Math.PI * 2 + spark.x * 0.35);
				const alpha = Math.max(0, spark.life) * twinkle * (spark.bright ? 1 : 0.8);
				if (alpha <= 0.02) continue;
				g.circle(spark.x, spark.y, spark.r);
				g.fill({ color: spark.color, alpha });
			}
		};
	});
</script>

<BoardContainer zIndex={view.zIndex}>
	<Container x={view.barX} y={view.barY} zIndex={0} sortableChildren={true}>
		<Sprite
			key="progress_bar"
			width={view.barW}
			height={view.barH}
			zIndex={0}
		/>
		{@const fillW = view.trackW * view.fillVisual}
		<Container
			x={view.trackX + view.trackW / 2}
			y={view.trackY + view.trackH / 2}
			scale={view.punchScale}
			zIndex={2}
		>
			<Container
				x={-view.trackW / 2}
				y={-view.trackH / 2}
				alpha={view.fillVisual > 0.001 ? 1 : 0}
				sortableChildren={true}
			>
				<Rectangle
					isMask
					x={0}
					y={0}
					width={Math.max(fillW, 0)}
					height={view.trackH}
				/>
				{#if (view.scatterRainbow || view.goldWash) && !view.dumpRed}
					<Graphics draw={drawHueWashFill} />
				{:else}
					<Sprite
						key="progress_bar_fill"
						x={-view.trackX}
						y={-view.trackY}
						width={view.barW}
						height={view.barH}
						tint={fillTint}
					/>
				{/if}
				{#if view.punchFlash > 0.02}
					<Rectangle
						x={0}
						y={0}
						width={Math.max(fillW, 0)}
						height={view.trackH}
						backgroundColor={0xfff3a0}
						backgroundAlpha={view.punchFlash * 0.55}
						zIndex={2}
					/>
				{/if}
				<Graphics draw={drawFillSparks} zIndex={3} />
			</Container>
		</Container>
	</Container>

	<!-- Mode-name HUD hidden (Wave 1). -->
</BoardContainer>
