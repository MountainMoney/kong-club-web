<script lang="ts">
	import { onMount } from 'svelte';
	import { OnHotkey } from 'components-shared';
	import { stateBet, stateBetDerived } from 'state-shared';

	import { getContext } from '../game/context';
	import { isGameplayInputAllowed } from '../game/gameplayLock.svelte';
	import { requestAutoBet, requestBet } from '../game/commitWager';
	import { showInsufficientBalanceModal } from '../game/insufficientBalance';
	import { invalidateWinPresentation } from '../game/spinWinOverlay.svelte';
	import { canRequestSpinSkip, requestSpinSkip, stateSpinSkip } from '../game/spinSkip.svelte';
	import { syncSpinSpeedToBet } from '../game/spinSpeed.svelte';
	import { stateGame } from '../game/stateGame.svelte';
	import { isSpacebarDisabled } from '../game/jurisdiction';

	const context = getContext();
	const spacebarDisabled = $derived(isSpacebarDisabled());

	/**
	 * Short Space tap: spin when idle, or one explicit skip while a round is playing.
	 * Hold (400ms+): turbo autospin only — must not slam-skip reel animations.
	 */
	const onSpaceTap = () => {
		if (spacebarDisabled) return;
		if (stateGame.gameType === 'freegame') return;

		if (context.stateXstateDerived.isIdle()) {
			if (!isGameplayInputAllowed()) return;
			if (!stateBetDerived.isBetCostAvailable()) {
				showInsufficientBalanceModal();
				return;
			}
			invalidateWinPresentation();
			context.eventEmitter.broadcast({ type: 'soundPressBet' });
			context.eventEmitter.broadcast({ type: 'paylineWinHide' });
			const autoPlayArmed =
				stateBetDerived.hasAutoBetCounter() &&
				!context.stateXstateDerived.isAutoBetting();
			if (autoPlayArmed) requestAutoBet();
			else requestBet();
			return;
		}

		if (stateSpinSkip.active && !stateBet.isSpaceHold) {
			if (!canRequestSpinSkip()) return;
			requestSpinSkip();
			context.eventEmitter.broadcast({ type: 'stopButtonClick' });
		}
	};

	const spaceHoldOn = () => {
		if (spacebarDisabled) return;
		stateBet.autoSpinsCounter = 0;
		stateBet.isSpaceHold = true;
		stateBetDerived.updateIsTurbo(true, { persistent: false });
	};

	const spaceHoldOff = () => {
		if (spacebarDisabled) return;
		stateBet.isSpaceHold = false;
		syncSpinSpeedToBet();
	};

	$effect(() => {
		if (!spacebarDisabled || !stateBet.isSpaceHold) return;
		stateBet.isSpaceHold = false;
		syncSpinSpeedToBet();
	});

	onMount(() => {
		if (stateBet.isSpaceHold) {
			stateBet.isSpaceHold = false;
			syncSpinSpeedToBet();
		}
	});
</script>

{#if !spacebarDisabled}
	<OnHotkey hotkey="Space" onpress={onSpaceTap} onhold={spaceHoldOn} onholdend={spaceHoldOff} />
{/if}
