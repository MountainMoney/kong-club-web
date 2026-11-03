<script lang="ts">
	import { onMount, type Snippet } from 'svelte';

	import { requestAuthenticate } from 'rgs-requests';
	import { stateUrlDerived, stateBet, stateConfig, stateModal, stateUi } from 'state-shared';
	import { API_AMOUNT_MULTIPLIER } from 'constants-shared/bet';

	type Props = {
		children: Snippet;
		/** Called after auth/replay gate completes and bet state from RGS is applied. */
		onAuthenticated?: () => void;
	};

	const props: Props = $props();

	let authenticated = $state(false);

	const nearestBetLevel = (target: number, levels: number[]) => {
		if (levels.includes(target)) return target;
		let best = levels[0]!;
		let bestDistance = Math.abs(best - target);
		for (const level of levels) {
			const distance = Math.abs(level - target);
			if (distance < bestDistance - 1e-9) {
				best = level;
				bestDistance = distance;
			}
		}
		return best;
	};

	const authenticate = async () => {
		try {
			const authenticateData = await requestAuthenticate({
				rgsUrl: stateUrlDerived.rgsUrl(),
				sessionID: stateUrlDerived.sessionID(),
				language: stateUrlDerived.lang(),
			});

			// error
			if (authenticateData?.error) throw authenticateData;

			// balance
			if (authenticateData?.balance) {
				// Example of authenticateData.balance
				// {
				// 		"amount": 10000000000000000,
				// 		"currency": "USD"
				// },
				stateBet.currency = authenticateData.balance.currency;
				stateBet.balanceAmount = authenticateData.balance.amount / API_AMOUNT_MULTIPLIER;
			}

			// config
			if (authenticateData?.config) {
				// Example of authenticateData.config
				// {
				// 	"gameID": "37_test-lines",
				// 	"minBet": 100000,
				// 	"maxBet": 1000000000,
				// 	"stepBet": 10000,
				// 	"defaultBetLevel": 1000000,
				// 	"betLevels": [100000, 200000, ..., 1000000000],
				// 	"betModes": {},
				// 	"jurisdiction": {
				// 			"socialCasino": false,
				// 			"disabledFullscreen": false,
				// 			"disabledTurbo": false,
				// 			"disabledSuperTurbo": false,
				// 			"disabledAutoplay": false,
				// 			"disabledSlamstop": false,
				// 			"disabledSpacebar": false,
				// 			"disabledBuyFeature": false,
				// 			"displayNetPosition": false,
				// 			"displayRTP": false,
				// 			"displaySessionTimer": false,
				// 			"minimumRoundDuration": 0
				// 	}
				// }
				stateConfig.jurisdiction = authenticateData?.config?.jurisdiction;
				const authConfig = authenticateData.config;
				const toAmount = (micro: number) => micro / API_AMOUNT_MULTIPLIER;
				const minBet = authConfig.minBet != null ? toAmount(authConfig.minBet) : undefined;
				const maxBet = authConfig.maxBet != null ? toAmount(authConfig.maxBet) : undefined;
				const stepBet = authConfig.stepBet != null ? toAmount(authConfig.stepBet) : undefined;
				const defaultBetLevel =
					authConfig.defaultBetLevel != null ? toAmount(authConfig.defaultBetLevel) : undefined;

				let levels = (authConfig.betLevels || [])
					.map(toAmount)
					.filter((level) => Number.isFinite(level) && level > 0);
				if (minBet != null) levels = levels.filter((level) => level + 1e-8 >= minBet);
				if (maxBet != null) levels = levels.filter((level) => level - 1e-8 <= maxBet);
				levels = [...new Set(levels.map((level) => Number(level.toPrecision(12))))].sort(
					(a, b) => a - b,
				);
				if (!levels.length && minBet != null && maxBet != null && stepBet != null && stepBet > 0) {
					const built: number[] = [];
					for (let index = 0; index < 10000; index += 1) {
						const value = Number((minBet + index * stepBet).toPrecision(12));
						if (value > maxBet + 1e-8) break;
						built.push(value);
					}
					levels = built;
				}

				stateConfig.minBet = minBet;
				stateConfig.maxBet = maxBet;
				stateConfig.stepBet = stepBet;
				stateConfig.defaultBetLevel = defaultBetLevel;
				stateConfig.betAmountOptions = levels;
				stateConfig.betMenuOptions = levels;
			}

			let openedFromRound = false;

			// round
			if (authenticateData?.round) {
				// Example of authenticateData.round 
				// {
				// 	"betID": 62277967,
				// 	"amount": 1000000,
				// 	"payout": 33400000,
				// 	"payoutMultiplier": 33.4,
				// 	"active": true,
				// 	"state": [...],
				// 	"mode": "BONUS",
				// 	"event": null
				// }

				if(authenticateData.round?.state) {
					// @ts-ignore
					stateBet.betToResume =  authenticateData.round;
				}

				if(authenticateData.round?.amount) {
					const betAmountValue =
						authenticateData.round.amount > 0
							? authenticateData.round.amount / API_AMOUNT_MULTIPLIER
							: 0;
					openedFromRound = true;
					stateBet.betAmount = betAmountValue;
					stateBet.wageredBetAmount = betAmountValue;
				}

				if (authenticateData.round?.mode) {
					stateBet.activeBetModeKey = authenticateData.round.mode;
				}
			}

			if (!openedFromRound && stateConfig.defaultBetLevel != null) {
				const levels = stateConfig.betAmountOptions;
				const target = stateConfig.defaultBetLevel;
				const snapped = levels.length ? nearestBetLevel(target, levels) : target;
				stateBet.betAmount = snapped;
				stateBet.wageredBetAmount = snapped;
			} else if (openedFromRound && stateConfig.betAmountOptions.length) {
				const snapped = nearestBetLevel(stateBet.betAmount, stateConfig.betAmountOptions);
				stateBet.betAmount = snapped;
				stateBet.wageredBetAmount = snapped;
			}
		} catch (error) {
			if (import.meta.env.DEV) console.error(error);
			stateModal.modal = { name: 'error', error };
		}
	};

	onMount(async () => {
		if (stateUrlDerived.replay()) {
			// Replay fetch + Play gate live in the game's ReplayMode controller.
			stateUi.config.mode = 'replay';
		} else {
			stateUi.config.mode = 'default';
			await authenticate();
		}

		props.onAuthenticated?.();
		authenticated = true;
	});
</script>

{#if authenticated}
	{@render props.children()}
{/if}
