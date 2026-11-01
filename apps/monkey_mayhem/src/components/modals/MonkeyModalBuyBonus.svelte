<script lang="ts">
	import { onMount } from 'svelte';

	import { PUBLIC_LOCAL_DEV } from 'envs';
	import { stateModal } from 'state-shared';

	import {
		BUY_BONUS_PREFETCH_MODES,
	} from '../../game/stateMathBooksLoading.svelte';
	import { prefetchMathBooksMode } from '../../game/localMathBooks';
	import MonkeyBuyBonusScreen from './MonkeyBuyBonusScreen.svelte';

	onMount(() => {
		if (!PUBLIC_LOCAL_DEV) return;
		void (async () => {
			for (const mode of BUY_BONUS_PREFETCH_MODES) {
				await prefetchMathBooksMode(mode);
			}
		})();
	});
</script>

{#if stateModal.modal?.name === 'buyBonus'}
	<MonkeyBuyBonusScreen onclose={() => (stateModal.modal = null)} />
{/if}
