<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { stateBet, stateConfig } from 'state-shared';
	import { MOST_USED_BET_INDEXES } from 'constants-shared/bet';

	import Game from '../components/Game.svelte';
	import StakeGameRoot from '../components/StakeGameRoot.svelte';
	import { browser } from '$app/environment';
	import { PUBLIC_LOCAL_DEV } from 'envs';
	import FxLabPanel from '../components/FxLabPanel.svelte';
	import '../game/fxLabRunner';
	import { isDemoPlay } from '../game/actor';

	const BET_AMOUNT_OPTIONS = [
		0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000,
	];

	const isStakeRoute = $derived(
		page.url.pathname.replace(/\/$/, '').endsWith('/stake'),
	);

	const useStakeRoot = $derived(
		isStakeRoute ||
			Boolean(page.url.searchParams.get('sessionID') && page.url.searchParams.get('rgs_url')),
	);

	/** WIP debug dock — only with `?debug=true` (local / Vite DEV). */
	const showFxLab = $derived(
		browser &&
			isDemoPlay() &&
			(PUBLIC_LOCAL_DEV || import.meta.env.DEV) &&
			page.url.searchParams.get('debug') === 'true' &&
			page.url.searchParams.get('fxLab') !== '0',
	);

	onMount(() => {
		if (!isDemoPlay()) return;

		stateBet.currency = 'USD';
		stateBet.balanceAmount = 10_000;
		stateBet.betAmount = 1;
		stateBet.wageredBetAmount = 1;
		stateBet.activeBetModeKey = 'base';
		stateConfig.betAmountOptions = [...BET_AMOUNT_OPTIONS];
		stateConfig.betMenuOptions = BET_AMOUNT_OPTIONS.filter((_, index) =>
			MOST_USED_BET_INDEXES.includes(index),
		);
	});
</script>

{#if useStakeRoot}
	<StakeGameRoot />
{:else}
	<Game />
{/if}

{#if showFxLab}
	<FxLabPanel />
{/if}
