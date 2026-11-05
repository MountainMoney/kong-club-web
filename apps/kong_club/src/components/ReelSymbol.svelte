<script lang="ts">
	import { onMount } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { cubicIn } from 'svelte/easing';

	import Symbol from './Symbol.svelte';
	import SymbolWrap from './SymbolWrap.svelte';
	import { getSymbolInfo, getSymbolX, getSymbolY } from '../game/utils';
	import {
		cellCoverKey,
		isCoinCellCovered,
		isPreCoinShrinkCell,
		PRE_COIN_SHRINK_MS,
		releaseCoinCellCover,
		stateCoinFeatureCover,
	} from '../game/coinFeatureCover.svelte';
	import { CLUSTER_CONNECT_SCALE_PEAK } from '../game/clusterConnectionTempo';
	import { stateClusterConnectMotion } from '../game/clusterConnectMotion.svelte';
	import { BOARD_DIMENSIONS, SYMBOL_SIZE } from '../game/constants';
	import { stateSpinSkip } from '../game/spinSkip.svelte';
	import { isTurboSpinHeld } from '../game/spinSpeed.svelte';
	import {
		isPremiumSymbolName,
		PREMIUM_LAND_ARM_ABOVE_PX,
		PREMIUM_LAND_BREATHE_MS,
		PREMIUM_LAND_BREATHE_PEAK,
	} from '../game/premiumLandBreathe';
	import { scaleFeatureMs } from '../game/winPresentationTempo';
	import type { ReelSymbol } from '../game/stateGame.svelte';

	type Props = {
		reelIndex: number;
		reelSymbol: ReelSymbol;
	};

	const props: Props = $props();
	const homeRow = $derived(props.reelSymbol.symbolIndexOfBoard);
	const isPadding = $derived(homeRow < 0 || homeRow >= BOARD_DIMENSIONS.y);
	const homeY = $derived(getSymbolY(homeRow));
	const incomingFromAbove = $derived(
		!isPadding && props.reelSymbol.symbolY.current < homeY - 4,
	);
	const coinCovered = $derived(isCoinCellCovered(props.reelIndex, homeRow));
	const hideSitting = $derived(coinCovered);
	const symbolInfo = $derived(
		getSymbolInfo({ rawSymbol: props.reelSymbol.rawSymbol, state: props.reelSymbol.symbolState }),
	);
	const shrinkScale = new Tween(1);
	const shrinkAlpha = new Tween(1);
	const coverAlpha = $derived(hideSitting ? 0 : 1);
	const tileFlipX = $derived(
		stateCoinFeatureCover.flipScaleX[cellCoverKey(props.reelIndex, homeRow)],
	);
	let connectScale = $state(1);
	let landBreathe = $state(1);
	let landBreatheArmed = false;
	let landBreatheRaf = 0;

	const stopLandBreathe = () => {
		cancelAnimationFrame(landBreatheRaf);
		landBreatheRaf = 0;
		landBreathe = 1;
	};

	const startLandBreathe = () => {
		stopLandBreathe();
		if (
			!isPremiumSymbolName(props.reelSymbol.rawSymbol.name) ||
			stateSpinSkip.forceSkip ||
			isTurboSpinHeld()
		) {
			return;
		}
		const start = performance.now();
		const duration = scaleFeatureMs(PREMIUM_LAND_BREATHE_MS, 80);
		const tick = () => {
			if (stateSpinSkip.forceSkip) {
				landBreathe = 1;
				landBreatheRaf = 0;
				return;
			}
			const t = Math.min(1, (performance.now() - start) / duration);
			landBreathe = 1 + PREMIUM_LAND_BREATHE_PEAK * Math.sin(t * Math.PI);
			if (t < 1) {
				landBreatheRaf = requestAnimationFrame(tick);
				return;
			}
			landBreathe = 1;
			landBreatheRaf = 0;
		};
		tick();
	};

	onMount(() => () => cancelAnimationFrame(landBreatheRaf));
	const connectBeat = $derived.by(() => {
		stateClusterConnectMotion.epoch;
		return stateClusterConnectMotion.byKey[`${props.reelIndex}:${homeRow}`];
	});

	$effect(() => {
		const beat = connectBeat;
		if (isPadding || !beat) {
			connectScale = 1;
			return;
		}

		let raf = 0;
		const tick = () => {
			if (stateSpinSkip.forceSkip || beat.duration <= 0) {
				connectScale = 1;
				return;
			}
			const t = Math.min(1, (performance.now() - beat.startedAt) / beat.duration);
			connectScale = 1 + (CLUSTER_CONNECT_SCALE_PEAK - 1) * Math.sin(t * Math.PI);
			if (t < 1) {
				raf = requestAnimationFrame(tick);
				return;
			}
			connectScale = 1;
		};
		tick();
		return () => cancelAnimationFrame(raf);
	});

	$effect(() => {
		if (isPadding) {
			landBreatheArmed = false;
			stopLandBreathe();
			return;
		}
		const y = props.reelSymbol.symbolY.current;
		if (y < homeY - PREMIUM_LAND_ARM_ABOVE_PX) {
			landBreatheArmed = true;
			stopLandBreathe();
			return;
		}
		if (!landBreatheArmed || y < homeY - 2) return;
		landBreatheArmed = false;
		startLandBreathe();
	});

	$effect(() => {
		if (isPadding) return;
		if (
			coinCovered &&
			props.reelSymbol.symbolY.current >= BOARD_DIMENSIONS.y * SYMBOL_SIZE
		) {
			releaseCoinCellCover(props.reelIndex, homeRow);
		}
	});

	$effect(() => {
		if (isPadding) return;
		if (incomingFromAbove) {
			shrinkScale.set(1, { duration: 0 });
			shrinkAlpha.set(1, { duration: 0 });
			return;
		}
		if (
			stateCoinFeatureCover.preCoinShrinkActive &&
			isPreCoinShrinkCell(props.reelIndex, props.reelSymbol.symbolIndexOfBoard)
		) {
			const duration = scaleFeatureMs(PRE_COIN_SHRINK_MS, 0);
			void shrinkScale.set(0, { duration, easing: cubicIn });
			void shrinkAlpha.set(0, { duration, easing: cubicIn });
			return;
		}
		if (shrinkScale.current <= 0.02 && shrinkAlpha.current <= 0.02) return;
		shrinkScale.set(1, { duration: 0 });
		shrinkAlpha.set(1, { duration: 0 });
	});
</script>

{#if !isPadding}
<SymbolWrap
	x={getSymbolX(props.reelIndex)}
	y={props.reelSymbol.symbolY.current}
	scaleX={(tileFlipX ?? 1) * shrinkScale.current * connectScale * landBreathe}
	scaleY={shrinkScale.current * connectScale * landBreathe}
	alpha={shrinkAlpha.current * coverAlpha}
	animating={symbolInfo.type === 'spine' &&
		symbolInfo.assetKey !== 'coinMetal' &&
		(props.reelSymbol.symbolState === 'land' || props.reelSymbol.symbolState === 'win')}
>
	<Symbol
		state={props.reelSymbol.symbolState}
		rawSymbol={props.reelSymbol.rawSymbol}
		oncomplete={() => {
			if (props.reelSymbol.symbolState === 'win') props.reelSymbol.oncomplete();
			if (props.reelSymbol.symbolState === 'land') props.reelSymbol.symbolState = 'static';
		}}
	/>
</SymbolWrap>
{/if}
