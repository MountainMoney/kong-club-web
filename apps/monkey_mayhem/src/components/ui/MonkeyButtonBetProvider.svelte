<script lang="ts" module>
	export type ButtonBetKey = 'spin_default' | 'spin_disabled' | 'stop_default' | 'stop_disabled';
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';

	import { stateBet, stateBetDerived } from 'state-shared';

	import { getContext } from 'components-ui-pixi/src/context';

	import { isGameplayInputAllowed } from '../../game/gameplayLock.svelte';
	import { requestAutoBet, requestBet } from '../../game/commitWager';
	import { invalidateWinPresentation } from '../../game/spinWinOverlay.svelte';
	import { canRequestSpinSkip, requestSpinSkip, stateSpinSkip } from '../../game/spinSkip.svelte';
	import { stateGame } from '../../game/stateGame.svelte';

	type Props = {
		children: Snippet<
			[
				{
					key: ButtonBetKey;
					onpress: () => void;
				},
			]
		>;
	};

	const props: Props = $props();
	const context = getContext();

	let stopDisabled = $state(false);

	/** True only when the autoplay machine is actively running spins. */
	const autoPlayRunning = $derived(context.stateXstateDerived.isAutoBetting());
	/** True when the autoplay counter is armed (set via popup) but not yet started. */
	const autoPlayArmed = $derived(
		stateBetDerived.hasAutoBetCounter() && !autoPlayRunning,
	);

	const cancelAutoPlay = () => {
		if (stateBetDerived.hasAutoBetCounter() || autoPlayRunning) {
			stateBet.autoSpinsCounter = 0;
		}
	};

	const bet = () => {
		if (!context.stateXstateDerived.isIdle()) return;
		invalidateWinPresentation();
		context.eventEmitter.broadcast({ type: 'paylineWinHide' });
		requestBet();
	};

	const startAutoBet = () => {
		if (!context.stateXstateDerived.isIdle()) return;
		invalidateWinPresentation();
		context.eventEmitter.broadcast({ type: 'paylineWinHide' });
		requestAutoBet();
	};

	const stop = () => {
		if (stopDisabled && !autoPlayRunning) return;
		cancelAutoPlay();
		if (canRequestSpinSkip()) requestSpinSkip();
		context.eventEmitter.broadcast({ type: 'stopButtonClick' });
	};

	const onpress = () => {
		if (stateGame.gameType === 'freegame') return;

		const idle = context.stateXstateDerived.isIdle();
		if (idle && !isGameplayInputAllowed()) return;

		context.eventEmitter.broadcast({ type: 'soundPressBet' });

		if (idle) {
			// Idle + auto counter set → start the autoplay loop.
			if (autoPlayArmed) {
				startAutoBet();
				return;
			}
			bet();
			return;
		}

		if (autoPlayRunning) {
			stop();
			return;
		}

		// In-flight manual spin: spin button skips (same as board tap).
		if (stateSpinSkip.active) {
			if (
				stateSpinSkip.boardSkipUsed ||
				stateSpinSkip.quickLandUsed ||
				stateSpinSkip.quickLandInProgress
			) return;
			if (canRequestSpinSkip()) requestSpinSkip();
			context.eventEmitter.broadcast({ type: 'stopButtonClick' });
		}
	};

	const getKey = () => {
		if (stateGame.gameType === 'freegame') return 'spin_disabled';

		if (!context.stateXstateDerived.isIdle()) {
			if (stopDisabled && !autoPlayRunning) return 'stop_disabled';
			if (autoPlayRunning) return 'stop_default';
			if (stateSpinSkip.active) return canRequestSpinSkip() ? 'stop_default' : 'stop_disabled';
			return 'spin_disabled';
		}

		if (!isGameplayInputAllowed() || !stateBetDerived.isBetCostAvailable()) {
			return 'spin_disabled';
		}
		return 'spin_default';
	};

	const key = $derived.by(getKey);

	context.eventEmitter.subscribeOnMount({
		stopButtonClick: () => {
			if (!autoPlayRunning) stopDisabled = true;
		},
		stopButtonEnable: () => {
			stopDisabled = false;
		},
	});
</script>

{@render props.children({ key, onpress })}
