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
		SYMBOL_LAND_A4_ARM_ABOVE_PX,
		SYMBOL_LAND_A4_WINDOW_MS,
		symbolLandA4Envelope,
		symbolLandA4FootOffsetY,
		symbolLandA4Scale,
	} from '../game/symbolLandA4';
	import { scaleFeatureMs } from '../game/winPresentationTempo';
	import { darken } from '../game/ggUi/dim';
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
	/** Cluster-win dim (Ryan: darken, not see-through). 1 = full brightness. */
	let linkBrightness = $state(1);
	let landScaleX = $state(1);
	let landScaleY = $state(1);
	let landFootY = $state(0);
	let landSquashArmed = false;
	let landSquashRaf = 0;

	const resetLandSquash = () => {
		landScaleX = 1;
		landScaleY = 1;
		landFootY = 0;
	};

	const stopLandSquash = () => {
		cancelAnimationFrame(landSquashRaf);
		landSquashRaf = 0;
		resetLandSquash();
	};

	const startLandSquash = () => {
		stopLandSquash();
		// Keep turbo / skip snappy; A4's 500 ms spring is the normal-speed land.
		if (stateSpinSkip.forceSkip || isTurboSpinHeld()) {
			return;
		}
		const start = performance.now();
		const tick = () => {
			if (stateSpinSkip.forceSkip) {
				resetLandSquash();
				landSquashRaf = 0;
				return;
			}
			const tSec = (performance.now() - start) / 1000;
			if (tSec >= SYMBOL_LAND_A4_WINDOW_MS / 1000) {
				resetLandSquash();
				landSquashRaf = 0;
				return;
			}
			const { sx, sy } = symbolLandA4Scale(symbolLandA4Envelope(tSec));
			landScaleX = sx;
			landScaleY = sy;
			landFootY = symbolLandA4FootOffsetY(sy);
			landSquashRaf = requestAnimationFrame(tick);
		};
		tick();
	};

	onMount(() => () => cancelAnimationFrame(landSquashRaf));
	$effect(() => {
		const beat = stateClusterConnectMotion.byKey[`${props.reelIndex}:${homeRow}`];
		const others =
			stateClusterConnectMotion.epoch >= 0 &&
			Object.keys(stateClusterConnectMotion.byKey).length > 0;
		if (isPadding || !beat) {
			connectScale = 1;
			linkBrightness = others ? 0.55 : 1;
			return;
		}

		let raf = 0;
		const tick = () => {
			if (stateSpinSkip.forceSkip || beat.duration <= 0) {
				connectScale = 1;
				linkBrightness = 1;
				return;
			}
			const t = Math.min(1, (performance.now() - beat.startedAt) / beat.duration);
			const eased = t * t * (3 - 2 * t);
			linkBrightness = 0.72 + 0.28 * eased;
			connectScale = 1 + (CLUSTER_CONNECT_SCALE_PEAK - 1) * Math.sin(t * Math.PI);
			if (t < 1) {
				raf = requestAnimationFrame(tick);
				return;
			}
			connectScale = 1;
			linkBrightness = 1;
		};
		tick();
		return () => cancelAnimationFrame(raf);
	});

	$effect(() => {
		if (isPadding) {
			landSquashArmed = false;
			stopLandSquash();
			return;
		}
		const y = props.reelSymbol.symbolY.current;
		if (y < homeY - SYMBOL_LAND_A4_ARM_ABOVE_PX) {
			landSquashArmed = true;
			stopLandSquash();
			return;
		}
		if (!landSquashArmed || y < homeY - 2) return;
		landSquashArmed = false;
		startLandSquash();
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
	y={props.reelSymbol.symbolY.current + landFootY}
	scaleX={(tileFlipX ?? 1) * shrinkScale.current * connectScale * landScaleX}
	scaleY={shrinkScale.current * connectScale * landScaleY}
	alpha={shrinkAlpha.current * coverAlpha}
	tint={darken(linkBrightness)}
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
