<script lang="ts" module>
	import ClusterWinAmount, { type RawWin, type Win } from './ClusterWinAmount.svelte';

	export type EmitterEventClusterWinAmounts = {
		type: 'showClusterWinAmounts';
		wins: RawWin[];
	} | { type: 'hideClusterWinAmounts' };
</script>

<script lang="ts">
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';
	import { SECOND } from 'constants-shared/time';

	import BoardContainer from './BoardContainer.svelte';
	import { zIndexes } from '../game/constants';
	import { getContext } from '../game/context';

	const context = getContext();

	let wins: Win[] = $state([]);

	context.eventEmitter.subscribeOnMount({
		showClusterWinAmounts: async (emitterEvent) => {
			const pendingWins = emitterEvent.wins.map((rawWin) => ({ ...rawWin, oncomplete: () => {} }));
			const completionTimeoutMs = SECOND * 6;
			const completionPromises = pendingWins.map((win) =>
				Promise.race([
					waitForResolve((resolve) => (win.oncomplete = resolve)),
					waitForTimeout(completionTimeoutMs),
				]),
			);
			wins = [...wins, ...pendingWins];
			await Promise.all(completionPromises);
			wins = wins.filter((win) => !pendingWins.includes(win));
		},
		hideClusterWinAmounts: () => {
			wins = [];
		},
	});
</script>

<BoardContainer zIndex={zIndexes.paylineWin}>
	{#each wins as win, index (`${win.reel}:${win.row}:${index}`)}
		<ClusterWinAmount {win} />
	{/each}
</BoardContainer>
