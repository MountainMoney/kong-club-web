<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { Rectangle, SpineProvider, SpineTrack, Sprite } from 'pixi-svelte';

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
	import {
		applyMascotCue,
		createMascotState,
		isMascotAnim,
		mascotLoops,
		mascotPreviewFromSearch,
		MASCOT_PREVIEW_TIME,
		type MascotAnim,
		type MascotCue,
	} from '../game/mascotDirector';
	import { isTurboOrFaster } from '../game/spinSpeed.svelte';

	const context = getContext();
	const mainLayout = $derived(context.stateLayoutDerived.mainLayout());
	const canvasSizes = $derived(context.stateLayoutDerived.canvasSizes());
	const board = $derived(context.stateGameDerived.boardLayout());
	const visible = $derived(isMonkeyMascotVisible(context.stateLayoutDerived.layoutType()));
	const mascotLayout = $derived(getMonkeyMascotLayout(mainLayout, board, canvasSizes));
	const z = $derived(stateSummitTease.active ? zIndexes.summitTeaseMascot : zIndexes.mascot);
	const preview = $derived(browser ? mascotPreviewFromSearch(window.location.search) : null);

	const spineReady = $derived(Boolean(stateApp.loadedAssets?.mmMascot));
	let director = $state(createMascotState(0, () => 0));
	/** Lab clip buttons override the live director. Default Idle still follows the game. */
	const labDriving = $derived(isFxLabActive() && stateFxLab.mascotClip !== 'idle');
	const clip = $derived<MascotAnim>(preview ?? (labDriving ? stateFxLab.mascotClip : director.current));
	const loop = $derived(
		preview ? false : labDriving ? mascotClipLoops(clip) : mascotLoops(clip),
	);
	const nudge = $derived(getMascotNudge());
	/** Uniform scale from skeleton height only — do not set Spine width/height (that stretches). */
	const spineScale = $derived((mascotLayout.height / MONKEY_MASCOT.spineSize.h) * nudge.scale);
	const spineX = $derived(mascotLayout.x + MONKEY_MASCOT.spineNudge.x + nudge.x);
	const spineY = $derived(
		mascotLayout.y - MONKEY_MASCOT.spineBoundsMinY * spineScale + MONKEY_MASCOT.spineNudge.y + nudge.y,
	);

	const runtime = () => ({ turbo: isTurboOrFaster(), random: Math.random });

	const cue = (next: MascotCue) => {
		if (preview) return;
		director = applyMascotCue(director, next, Date.now(), runtime());
	};

	const onMascotTap = () => cue({ type: 'tap' });

	const onClipComplete = {
		complete: (entry: { animation?: { name?: string | null } | null }) => {
			if (preview) return;
			if (isFxLabActive() && stateFxLab.mascotClip !== 'idle') {
				if (!mascotClipLoops(stateFxLab.mascotClip)) setMascotClip('idle');
				return;
			}
			const name = entry.animation?.name;
			if (!isMascotAnim(name) || name === 'idle') return;
			cue({ type: 'clipComplete', anim: name });
		},
	};

	onMount(() => {
		const ticker = context.stateApp.pixiApplication?.ticker;
		if (ticker) ticker.maxFPS = FOOTBALL_PERFORMANCE.maxFps;
		if (preview) return;
		director = createMascotState(Date.now());
		const timer = window.setInterval(() => cue({ type: 'tick' }), 250);
		const unsubscribe = context.eventEmitter.subscribe({
			mascotCue: (event) => cue(event.cue),
		});
		return () => {
			window.clearInterval(timer);
			unsubscribe();
		};
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
				loop={preview ? true : loop}
				timeScale={preview ? 0 : nudge.timeScale}
				trackTime={preview ? MASCOT_PREVIEW_TIME[preview] : undefined}
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
	<!-- Torso only. The feet sit on the stump next to the spin button. -->
	<Rectangle
		anchor={{ x: 0.5, y: 1 }}
		x={mascotLayout.x}
		y={mascotLayout.y - mascotLayout.height * 0.28}
		width={mascotLayout.width * 0.72}
		height={mascotLayout.height * 0.62}
		backgroundColor={0xffffff}
		backgroundAlpha={0.001}
		eventMode="static"
		cursor="pointer"
		zIndex={z + 1}
		onpointertap={onMascotTap}
	/>
{/if}
