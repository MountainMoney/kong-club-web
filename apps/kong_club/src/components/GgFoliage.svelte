<script lang="ts">
	/**
	 * Animated top + bottom foliage frame ported from Gaia's Grotto
	 * (spine `cinematic-overlay`, converted from Spine 4.3 binary to 4.2 JSON).
	 * Same clips as GG: `entery` once, then `loop` forever, `exit` when leaving.
	 *
	 * Two rigs from the same skeleton, like GG's intro splash:
	 * - bottom rig shows only the `co niz*` slots, pinned to the canvas bottom edge
	 * - top rig shows the `co verh*` slots, pinned to the canvas top edge
	 * Uniform cover scale (never stretched). Non-interactive.
	 * Splash variant matches GG's splash: bottom foliage at 40% alpha, clip mask off.
	 */
	import { BaseSpineProvider, Container, type BaseSpineProviderProps } from 'pixi-svelte';
	import { AlphaFilter } from 'pixi.js';

	import { getContext } from '../game/context';
	import GgFoliageRig from './GgFoliageRig.svelte';

	type Props = {
		variant: 'splash' | 'bonusIntro';
		alpha?: number;
		/** Start `entery` → `loop` when true. */
		play?: boolean;
		/** Play GG's `exit` clip once. */
		exiting?: boolean;
		/**
		 * GG intro camera parallax [nHe: cover·O, O = 1 + (zoom − 1)·1.9], about the
		 * canvas centre. Default 1 = unchanged (bonus intro never sets it).
		 */
		zoom?: number;
	};

	const { variant, alpha = 1, play = true, exiting = false, zoom = 1 }: Props = $props();

	const context = getContext();

	type SpineData = BaseSpineProviderProps['spineData'];
	const spineData = $derived(context.stateApp.loadedAssets?.ggFoliage as SpineData | undefined);
	const canvas = $derived(context.stateLayoutDerived.canvasSizes());

	/**
	 * Overscan (skeleton px) so the art, not the frame, meets every screen edge:
	 * the region edges are 1px soft from texture filtering, and the solid
	 * `co niz main` band sits ~11.4px above the frame bottom. These insets push
	 * the soft edges and the thin bottom strip off-screen at every size.
	 */
	const INSET = { x: 6, top: 2, bottom: 14 };

	const frame = $derived.by(() => {
		const d = spineData;
		if (!d || !d.width || !d.height) return null;
		const coverW = d.width - INSET.x * 2;
		const coverH = d.height - INSET.top - INSET.bottom;
		const s = Math.max(canvas.width / coverW, canvas.height / coverH) * zoom;
		const cx = d.x + d.width / 2;
		return {
			scale: { x: s, y: s },
			x: canvas.width / 2,
			topY: canvas.height / 2 - (canvas.height / 2) * zoom,
			bottomY: canvas.height / 2 + (canvas.height / 2) * zoom,
			// spine-pixi flips Y: skeleton top (y + height) maps to local -(y + height).
			topPivot: { x: cx, y: -(d.y + d.height) + INSET.top },
			bottomPivot: { x: cx, y: -(d.y + INSET.bottom) },
		};
	});

	const hideMask = variant === 'splash';
	const bottomFilters = variant === 'splash' ? [new AlphaFilter({ alpha: 0.4 })] : [];
</script>

{#if spineData && frame}
	<Container {alpha} eventMode="none" interactiveChildren={false}>
		<BaseSpineProvider
			{spineData}
			x={frame.x}
			y={frame.bottomY}
			scale={frame.scale}
			pivot={frame.bottomPivot}
			filters={bottomFilters}
			eventMode="none"
		>
			<GgFoliageRig part="bottom" {hideMask} {play} {exiting} />
		</BaseSpineProvider>
		<BaseSpineProvider
			{spineData}
			x={frame.x}
			y={frame.topY}
			scale={frame.scale}
			pivot={frame.topPivot}
			eventMode="none"
		>
			<GgFoliageRig part="top" {hideMask} {play} {exiting} />
		</BaseSpineProvider>
	</Container>
{/if}
