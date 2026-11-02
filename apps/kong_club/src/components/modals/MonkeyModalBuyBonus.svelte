<script lang="ts">
	import { onMount } from 'svelte';

	import { PUBLIC_LOCAL_DEV } from 'envs';

	import { BUY_BONUS_PREFETCH_MODES } from '../../game/stateMathBooksLoading.svelte';
	import { prefetchMathBooksMode } from '../../game/localMathBooks';

	onMount(() => {
		if (!PUBLIC_LOCAL_DEV) return;
		void (async () => {
			for (const mode of BUY_BONUS_PREFETCH_MODES) {
				await prefetchMathBooksMode(mode);
			}
		})();
	});
</script>

<!-- Buy menu is the Pixi BonusBuyScreen. This node only prefetches math books. -->
