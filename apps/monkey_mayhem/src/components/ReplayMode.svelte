<script lang="ts">
	import { onMount } from 'svelte';

	import { numberToBetCurrencyString, numberToWinCurrencyString } from 'utils-shared/amount';
	import { stateI18nDerived } from 'state-shared';
	import { stateBet } from 'state-shared';

	import { getContext } from '../game/context';
	import { resetGameplayPresentation } from '../game/gameplayErrorReset';
	import { playBet } from '../game/utils';
	import {
		applySocialCopy,
		replayLabel,
		replayModeDisplayTitle,
		replayTitle,
	} from '../game/socialCopy';
	import {
		applyReplayBet,
		enterReplayMode,
		fetchReplayRound,
		formatReplayPayoutMultiplier,
		isReplayUrl,
		parseReplayQuery,
		replayTotalWinCurrency,
		stateReplay,
		type ReplayFetchResult,
	} from '../game/replayMode.svelte';
	const context = getContext();

	let fetchResult = $state<ReplayFetchResult | null>(null);

	const query = $derived(parseReplayQuery());
	const assetsReady = $derived(context.stateApp.loaded);
	const modeTitle = $derived(replayModeDisplayTitle(query.mode));
	const payoutMultiplierDisplay = $derived(
		fetchResult ? formatReplayPayoutMultiplier(fetchResult.payoutMultiplier) : '—',
	);
	const finalWinDisplay = $derived(
		fetchResult
			? numberToWinCurrencyString(
					replayTotalWinCurrency(
						fetchResult.payoutMultiplier,
						fetchResult.bet.amount,
						fetchResult.payout,
					),
				)
			: numberToWinCurrencyString(0),
	);
	const replayCostMultiplier = $derived(fetchResult?.costMultiplier ?? stateReplay.costMultiplier ?? 1);
	const replayBetCost = $derived(stateBet.betAmount);
	const replayRealCost = $derived(replayBetCost * replayCostMultiplier);
	const replayMultiplierDisplay = $derived(
		Number.isInteger(replayCostMultiplier)
			? `${replayCostMultiplier}×`
			: `${replayCostMultiplier.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}×`,
	);
	const replayLoadingText = $derived(
		applySocialCopy(stateI18nDerived.translate('REPLAY_LOADING')),
	);
	const replayReadyText = $derived(
		applySocialCopy(stateI18nDerived.translate('REPLAY_READY')),
	);
	const replayCompleteText = $derived(
		applySocialCopy(stateI18nDerived.translate('REPLAY_COMPLETE')),
	);
	const replayUnavailableText = $derived(
		applySocialCopy(stateI18nDerived.translate('REPLAY_UNAVAILABLE')),
	);

	const loadReplay = async () => {
		enterReplayMode();
		stateReplay.errorMessage = '';

		try {
			const result = await fetchReplayRound();
			fetchResult = result;
			applyReplayBet(result);
			stateReplay.phase = 'ready';
		} catch (err) {
			stateReplay.phase = 'error';
			stateReplay.errorMessage = applySocialCopy(
				err instanceof Error ? err.message : 'Unable to load this bet replay.',
			);
			if (import.meta.env.DEV) console.error('[ReplayMode]', err);
		}
	};

	const beginReplayPlayback = () => {
		if (stateReplay.playbackInFlight) return false;
		stateReplay.playbackInFlight = true;
		resetGameplayPresentation();
		context.eventEmitter.broadcast({ type: 'stopButtonEnable' });
		return true;
	};

	const startReplay = async () => {
		if (!fetchResult || !assetsReady || !beginReplayPlayback()) return;

		applyReplayBet(fetchResult);
		stateReplay.phase = 'playing';

		try {
			await playBet(fetchResult.bet);
			stateReplay.phase = 'ended';
		} catch (err) {
			stateReplay.phase = 'error';
			stateReplay.errorMessage = applySocialCopy(
				err instanceof Error ? err.message : 'Unable to play this bet replay.',
			);
			if (import.meta.env.DEV) console.error('[ReplayMode]', err);
		} finally {
			stateReplay.playbackInFlight = false;
		}
	};

	const replayEvent = () => {
		if (!fetchResult || !assetsReady) return;
		void startReplay();
	};

	onMount(() => {
		if (!isReplayUrl()) return;
		void loadReplay();
	});
</script>

{#if isReplayUrl()}
	{#if stateReplay.phase === 'loading'}
		<div class="replay-overlay" role="status" aria-live="polite">
			<div class="replay-panel">
				<div class="replay-spinner" aria-hidden="true"></div>
				<p class="replay-title">{replayLoadingText}</p>
			</div>
		</div>
	{:else if stateReplay.phase === 'error'}
		<div class="replay-overlay" role="alert">
			<div class="replay-panel replay-panel--error">
				<h1 class="replay-title">{replayUnavailableText}</h1>
				<p class="replay-message">{stateReplay.errorMessage}</p>
			</div>
		</div>
	{:else if stateReplay.phase === 'ready' || stateReplay.phase === 'ended'}
		<div class="replay-overlay">
			<div class="replay-panel replay-panel--card">
				<span class="replay-badge">REPLAY MODE</span>
				<h1 class="replay-heading">{replayTitle()}</h1>
				<p class="replay-subtitle">
					{stateReplay.phase === 'ready' ? replayReadyText : replayCompleteText}
				</p>

				{#if fetchResult}
					<dl class="replay-stats">
						<div class="replay-row">
							<dt>Mode</dt>
							<dd>{modeTitle}</dd>
						</div>
						<div class="replay-divider" aria-hidden="true"></div>
						<div class="replay-row">
							<dt>{replayLabel('baseBet')}</dt>
							<dd>{numberToBetCurrencyString(replayBetCost)}</dd>
						</div>
						<div class="replay-row">
							<dt>{replayLabel('costMultiplier')}</dt>
							<dd>{replayMultiplierDisplay}</dd>
						</div>
						<div class="replay-row replay-row--highlight">
							<dt>{replayLabel('totalBetCost')}</dt>
							<dd>{numberToBetCurrencyString(replayRealCost)}</dd>
						</div>
						{#if fetchResult}
							<div class="replay-row">
								<dt>{replayLabel('payoutMultiplier')}</dt>
								<dd class="replay-green">{payoutMultiplierDisplay}</dd>
							</div>
							<div class="replay-row replay-row--highlight">
								<dt>{replayLabel('totalWin')}</dt>
								<dd class="replay-green">{finalWinDisplay}</dd>
							</div>
						{/if}
					</dl>
				{/if}

				<p class="replay-disclaimer">
					{applySocialCopy(stateI18nDerived.translate('REPLAY_DISCLAIMER'))}
				</p>

				{#if stateReplay.phase === 'ready'}
					<button
						type="button"
						class="replay-cta"
						disabled={!assetsReady || stateReplay.playbackInFlight}
						onclick={startReplay}
					>
						<span class="replay-cta-icon" aria-hidden="true">▶</span>
						{stateI18nDerived.translate('REPLAY_START')}
					</button>
				{:else}
					<button
						type="button"
						class="replay-cta"
						disabled={!assetsReady || stateReplay.playbackInFlight}
						onclick={replayEvent}
					>
						<span class="replay-cta-icon" aria-hidden="true">↻</span>
						{stateI18nDerived.translate('REPLAY_EVENT')}
					</button>
				{/if}
			</div>
		</div>
	{/if}
{/if}

<style>
	.replay-overlay {
		position: fixed;
		inset: 0;
		z-index: 20000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background: rgba(0, 0, 0, 0.62);
		pointer-events: auto;
	}

	.replay-panel {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 0.85rem;
		min-width: 320px;
		width: min(92vw, 28rem);
		max-height: 88vh;
		padding: 1.1rem 1rem 0.95rem;
		border-radius: 14px;
		background: rgba(0, 0, 0, 0.82);
		border: 1px solid rgba(255, 215, 0, 0.35);
		color: #fff;
		font-family: Inter, system-ui, sans-serif;
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
	}

	.replay-panel--error {
		border: 2px solid #ff6b6b;
		align-items: center;
		text-align: center;
	}

	.replay-panel--card {
		overflow: hidden;
	}

	.replay-spinner {
		width: 48px;
		height: 48px;
		margin: 0 auto;
		border: 4px solid rgba(255, 255, 255, 0.25);
		border-top-color: #ffd700;
		border-radius: 50%;
		animation: replay-spin 0.9s linear infinite;
	}

	@keyframes replay-spin {
		to {
			transform: rotate(360deg);
		}
	}

	.replay-badge {
		align-self: center;
		padding: 0.3rem 0.8rem;
		border-radius: 999px;
		background: #ffd700;
		color: #111;
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.replay-heading {
		margin: 0;
		text-align: center;
		font-size: 1.35rem;
		font-weight: 800;
		line-height: 1.1;
	}

	.replay-subtitle {
		margin: -0.35rem auto 0;
		text-align: center;
		max-width: 22rem;
		font-size: 0.78rem;
		line-height: 1.35;
		color: rgba(255, 255, 255, 0.78);
	}

	.replay-title {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 700;
		text-align: center;
	}

	.replay-message {
		margin: 0;
		font-size: 0.95rem;
		line-height: 1.45;
		max-width: 360px;
	}

	.replay-stats {
		margin: 0;
		display: grid;
		gap: 0;
		border-radius: 8px;
		overflow: hidden;
		background: rgba(255, 255, 255, 0.045);
		border: 1px solid rgba(255, 215, 0, 0.18);
	}

	.replay-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		padding: 0.62rem 0.78rem;
		border-bottom: 1px solid rgba(255, 215, 0, 0.12);
	}

	.replay-divider {
		height: 1px;
		background: rgba(255, 215, 0, 0.28);
	}

	.replay-row:last-child {
		border-bottom: none;
	}

	.replay-row--highlight {
		background: rgba(255, 215, 0, 0.08);
	}

	.replay-row dt {
		margin: 0;
		font-size: 0.82rem;
		color: rgba(255, 255, 255, 0.78);
	}

	.replay-row dd {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 700;
		color: #ffd700;
	}

	.replay-green {
		color: #6ee7a0 !important;
	}

	.replay-disclaimer {
		margin: 0;
		text-align: center;
		font-size: 0.72rem;
		line-height: 1.4;
		color: rgba(255, 255, 255, 0.66);
	}

	.replay-cta {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		margin-top: 0.25rem;
		padding: 0.78rem 1rem;
		border: none;
		border-radius: 6px;
		background: #ffd700;
		color: #111;
		font-size: 0.95rem;
		font-weight: 800;
		cursor: pointer;
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}

	.replay-cta:hover {
		filter: brightness(1.05);
	}

	.replay-cta:disabled {
		opacity: 0.55;
		cursor: wait;
		filter: none;
	}

	.replay-cta-icon {
		font-size: 1.1rem;
		line-height: 1;
	}
</style>
