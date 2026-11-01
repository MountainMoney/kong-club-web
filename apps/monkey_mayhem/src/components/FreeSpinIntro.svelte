<script lang="ts" module>
	export type EmitterEventFreeSpinIntro =
		| { type: 'freeSpinIntroShow' }
		| { type: 'freeSpinIntroHide' }
		| { type: 'freeSpinIntroUpdate'; totalFreeSpins: number };
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { CanvasSizeRectangle } from 'components-layout';
	import { stateUrlDerived } from 'state-shared';
	import { FadeContainer } from 'components-pixi';
	import { waitForResolve } from 'utils-shared/wait';
	import { SpineProvider, SpineSlot, SpineTrack, Sprite, Text } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import {
		FREE_SPIN_INTRO_HEADLINE,
		FREE_SPIN_INTRO_SUBLINE,
		freeSpinHeadlineStyle,
		freeSpinSublineStyle,
		showFreeSpinSocialLabels,
	} from '../game/freeSpinSocialLabels';
	import { ensureIntroFredokaFont } from '../game/introFont';
	import { getPixiTextResolution } from '../game/pixiTextCrisp';
	import PressToContinue from './PressToContinue.svelte';
	import FreeSpinAnimation from './FreeSpinAnimation.svelte';

	type AnimationName = 'intro' | 'idle';

	const context = getContext();

	let show = $state(false);
	let animationName = $state<AnimationName>('intro');
	let freeSpinsFromEvent = $state(0);
	let oncomplete = $state(() => {});
	let fontReady = $state(false);

	const socialLabels = $derived(showFreeSpinSocialLabels());
	const textRes = getPixiTextResolution();

	onMount(() => {
		void ensureIntroFredokaFont().then(() => {
			fontReady = true;
		});
	});

	context.eventEmitter.subscribeOnMount({
		freeSpinIntroShow: () => (show = true),
		freeSpinIntroHide: () => (show = false),
		freeSpinIntroUpdate: async (emitterEvent) => {
			freeSpinsFromEvent = emitterEvent.totalFreeSpins;
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
		spinSkipPressToContinue: () => {
			if (show) oncomplete();
		},
	});
</script>

<FadeContainer {show}>
	<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={0.5} />

	<FreeSpinAnimation>
		{#snippet children({ sizes })}
			{#if socialLabels}
				<Text
					anchor={{ x: 0.5, y: 1.2 }}
					text={FREE_SPIN_INTRO_HEADLINE}
					style={freeSpinHeadlineStyle(sizes, fontReady)}
					resolution={textRes}
				/>
			{:else}
				<Sprite
					anchor={{ x: 0.5, y: 1.2 }}
					width={500 * 2.2}
					height={156 * 2.2}
					key="freespins_{stateUrlDerived.lang()}.png"
				/>
			{/if}

			<SpineProvider key="fsIntroNumber" width={sizes.width * 0.4}>
				<SpineTrack
					trackIndex={0}
					{animationName}
					loop={animationName === 'idle'}
					listener={{
						complete: () => (animationName = 'idle'),
					}}
				/>
				<SpineSlot slotName="slot_number">
					<Text
						anchor={{ x: 0.5, y: 0.5 }}
						text={freeSpinsFromEvent}
						style={{
							fontFamily: 'Fredoka',
							fontSize: sizes.width * 0.15,
							fontWeight: '700',
							fill: 0xffffff,
							stroke: { color: 0x000000, width: 6 },
						}}
					/>
				</SpineSlot>
			</SpineProvider>

			{#if socialLabels}
				<Text
					anchor={{ x: 0.5, y: -3 }}
					text={FREE_SPIN_INTRO_SUBLINE}
					style={freeSpinSublineStyle(sizes, fontReady)}
					resolution={textRes}
				/>
			{:else}
				<Sprite anchor={{ x: 0.5, y: -3 }} width={183 * 2.2} height={42 * 2.2} key="freespins.png" />
			{/if}
		{/snippet}
	</FreeSpinAnimation>

	<PressToContinue onpress={() => oncomplete()} />
</FadeContainer>
