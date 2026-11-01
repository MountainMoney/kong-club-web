<script lang="ts">
	import { OnMount } from 'components-shared';
	import { SECOND } from 'constants-shared/time';

	import { zIndexes } from '../game/constants';
	import { getContext } from '../game/context';
	import Anticipation from './Anticipation.svelte';
	import BoardContainer from './BoardContainer.svelte';

	const context = getContext();
	const hasAnticipation = $derived(
		context.stateGame.board.some((reel) => reel.reelState.anticipating),
	);
</script>

{#if hasAnticipation}
	<OnMount
		onmount={() => {
			context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_anticipation_start' });
			context.eventEmitter.broadcast({ type: 'soundLoop', name: 'sfx_anticipation' });
			context.eventEmitter.broadcast({
				type: 'soundFade',
				name: 'sfx_anticipation',
				from: 0,
				to: 1,
				duration: SECOND,
			});

			return () => {
				context.eventEmitter.broadcast({ type: 'soundStop', name: 'sfx_anticipation' });
			};
		}}
	/>
{/if}

<BoardContainer zIndex={zIndexes.paylineWin}>
	{#each context.stateGame.board as reel}
		{#if reel.reelState.anticipating}
			<Anticipation {reel} oncomplete={() => (reel.reelState.anticipating = false)} />
		{/if}
	{/each}
</BoardContainer>
