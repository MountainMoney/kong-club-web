<script lang="ts" module>
	export type EmitterEventTumbleWinAmount =
		| { type: 'tumbleWinAmountShow' }
		| { type: 'tumbleWinAmountHide' }
		| { type: 'tumbleWinAmountReset' }
		| { type: 'tumbleWinAmountUpdate'; amount: number; animate: boolean };
</script>

<script lang="ts">
	import { waitForResolve } from 'utils-shared/wait';

	import TumbleWinAmountWrap from './TumbleWinAmountWrap.svelte';
	import TumbleWinAmountFrame from './TumbleWinAmountFrame.svelte';
	import TumbleWinAmountText from './TumbleWinAmountText.svelte';
	import { getContext } from '../game/context';
	import { capBookAmount } from '../game/winCountTier';

	const context = getContext();

	let show = $state(false);
	let amount = $state(0);
	let animate = $state(false);
	let oncomplete = $state(() => {});

	context.eventEmitter.subscribeOnMount({
		tumbleWinAmountShow: () => (show = true),
		tumbleWinAmountHide: () => (show = false),
		tumbleWinAmountReset: () => {
			amount = 0;
			animate = false;
			oncomplete = () => {};
		},
		tumbleWinAmountUpdate: async (emitterEvent) => {
			const next = capBookAmount(emitterEvent.amount);
			if (amount !== next) {
				amount = next;
				animate = emitterEvent.animate;
				await waitForResolve((resolve) => (oncomplete = resolve));
			}
		},
		winSkip: () => oncomplete(),
		spinSkipPressToContinue: () => {
			if (show) oncomplete();
		},
	});
</script>

<TumbleWinAmountWrap {show}>
	<TumbleWinAmountFrame>
		{#snippet children({ frameSizes })}
			<TumbleWinAmountText {amount} {animate} {oncomplete} width={frameSizes.width} />
		{/snippet}
	</TumbleWinAmountFrame>
</TumbleWinAmountWrap>
