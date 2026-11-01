<script lang="ts">
	import { onMount } from 'svelte';
	import { SpineProvider, SpineTrack, Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { zIndexes } from '../game/constants';
	import { getMonkeyMascotLayout, isMonkeyMascotVisible, MONKEY_MASCOT } from '../game/kongClubLayout';
	import { FOOTBALL_PERFORMANCE } from '../game/performance';
	import { stateSummitTease } from '../game/summitTease.svelte';
	import { stateApp } from '../game/stateApp';
	import {
		getMascotNudge,
		isFxLabActive,
		mascotClipLoops,
		setMascotClip,
		stateFxLab,
	} from '../game/fxLab.svelte';

	const context = getContext();
	const mainLayout = $derived(context.stateLayoutDerived.mainLayout());
	const canvasSizes = $derived(context.stateLayoutDerived.canvasSizes());
	const board = $derived(context.stateGameDerived.boardLayout());
	const visible = $derived(isMonkeyMascotVisible(context.stateLayoutDerived.layoutType()));
	const mascotLayout = $derived(getMonkeyMascotLayout(mainLayout, board, canvasSizes));
	const z = $derived(stateSummitTease.active ? zIndexes.summitTeaseMascot : zIndexes.mascot);
	const RANDOM_IDLE_ODDS = 20;

	const spineReady = $derived(Boolean(stateApp.loadedAssets?.mmMascot));
	let liveClip = $state<'idle' | 'randomidle'>('idle');
	/** Lab clip buttons override idle. Default Idle still uses the live 1-in-20 roll. */
	const labDriving = $derived(isFxLabActive() && stateFxLab.mascotClip !== 'idle');
	const clip = $derived(labDriving ? stateFxLab.mascotClip : liveClip);
	const loop = $derived(labDriving ? mascotClipLoops(clip) : liveClip === 'idle');
	const nudge = $derived(getMascotNudge());
	/** Uniform scale from skeleton height only — do not set Spine width/height (that stretches). */
	const spineScale = $derived((mascotLayout.height / MONKEY_MASCOT.spineSize.h) * nudge.scale);
	const spineX = $derived(mascotLayout.x + MONKEY_MASCOT.spineNudge.x + nudge.x);
	const spineY = $derived(
		mascotLayout.y - MONKEY_MASCOT.spineBoundsMinY * spineScale + MONKEY_MASCOT.spineNudge.y + nudge.y,
	);

	const onClipComplete = {
		complete: (entry: { animation?: { name?: string | null } | null }) => {
			if (isFxLabActive() && stateFxLab.mascotClip !== 'idle') {
				if (!mascotClipLoops(stateFxLab.mascotClip)) setMascotClip('idle');
				return;
			}
			const name = entry.animation?.name;
			if (name === 'randomidle') {
				liveClip = 'idle';
				return;
			}
			if (name === 'idle' && Math.random() < 1 / RANDOM_IDLE_ODDS) liveClip = 'randomidle';
		},
	};

	onMount(() => {
		const ticker = context.stateApp.pixiApplication?.ticker;
		if (ticker) ticker.maxFPS = FOOTBALL_PERFORMANCE.maxFps;
	});
</script>

{#if visible}
	{#if spineReady}
		<SpineProvider
			key="mmMascot"
			x={spineX}
			y={spineY}
			scale={spineScale}
			zIndex={z}
		>
			<SpineTrack
				trackIndex={0}
				animationName={clip}
				loop={loop}
				timeScale={nudge.timeScale}
				listener={onClipComplete}
			/>
		</SpineProvider>
	{:else}
		<Sprite
			key="monkeyMascot"
			anchor={{ x: 0.5, y: 1 }}
			x={mascotLayout.x}
			y={mascotLayout.y}
			width={mascotLayout.width}
			height={mascotLayout.height}
			zIndex={z}
		/>
	{/if}
{/if}
