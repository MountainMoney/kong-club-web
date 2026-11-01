<script lang="ts">
	import { stateBet } from 'state-shared';
	import { getContext } from '../game/context';
	import { normalizeResumeBetState } from '../game/betModes';
	import { onMount } from 'svelte';

	const context = getContext();

	onMount(() => {
		if (stateBet.betToResume) {
			normalizeResumeBetState();
		}
		context.eventEmitter.broadcast({ type: 'resumeBet' });
	});
</script>
