<script lang="ts" module>
	export type EmitterEventBlackScreen =
		| { type: 'blackScreenFadeIn' }
		| { type: 'blackScreenFadeOut' };
</script>

<script lang="ts">
	import { Tween } from 'svelte/motion';

	import { CanvasSizeRectangle } from 'components-layout';
	import { Container } from 'pixi-svelte';

	import { zIndexes } from '../game/constants';
	import { BLACK_SCREEN_FADE_MS } from '../game/blackScreenTransition';
	import { bonusScreenAnimMs } from '../game/bonusScreenWait';
	import { getContext } from '../game/context';

	const context = getContext();
	const fadeMs = $derived(bonusScreenAnimMs(BLACK_SCREEN_FADE_MS));
	const alphaTween = new Tween(0);

	const fadeIn = async () => {
		await alphaTween.set(1, { duration: fadeMs });
	};

	const fadeOut = async () => {
		await alphaTween.set(0, { duration: fadeMs });
	};

	context.eventEmitter.subscribeOnMount({
		blackScreenFadeIn: fadeIn,
		blackScreenFadeOut: fadeOut,
	});
</script>

{#if alphaTween.current > 0.01}
	<Container zIndex={zIndexes.blackScreen} eventMode="none">
		<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={alphaTween.current} />
	</Container>
{/if}
