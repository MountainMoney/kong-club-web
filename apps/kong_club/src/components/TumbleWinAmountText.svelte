<script lang="ts">
	import { onMount } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	import { Text } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';
	import { formatBookWin } from '../game/stakeMoney';

	import { SYMBOL_SIZE } from '../game/constants';
	import { ensurePrizeNumberFont } from '../game/introFont';
	import { getPixiTextResolution } from '../game/pixiTextCrisp';
	import { PRIZE_NUMBER_FONT, PRIZE_NUMBER_WEIGHT } from '../game/prizeNumberFont';
	import { capBookAmount } from '../game/winCountTier';

	type Props = {
		width: number;
		amount: number;
		animate: boolean;
		oncomplete: () => void;
	};

	const props: Props = $props();
	const displayAmount = new Tween(0);
	const scale = new Tween(1);
	let fontReady = $state(false);

	const applyAmount = async () => {
		const target = capBookAmount(props.amount);
		if (target <= 0) return;

		if (!props.animate) {
			await displayAmount.set(target, { duration: 0 });
			props.oncomplete();
			return;
		}

		await scale.set(1.08, { duration: 70 / stateBetDerived.timeScale() });
		await displayAmount.set(target, {
			duration: 320 / stateBetDerived.timeScale(),
			easing: cubicOut,
		});
		await scale.set(1, { duration: 90 / stateBetDerived.timeScale(), easing: cubicOut });
		props.oncomplete();
	};

	$effect(() => {
		void applyAmount();
	});

	onMount(() => {
		void ensurePrizeNumberFont().then(() => {
			fontReady = true;
		});
	});

	const textRes = getPixiTextResolution();
	const amountStyle = $derived({
		fontFamily: fontReady ? PRIZE_NUMBER_FONT : 'Arial',
		fontSize: 0.65 * SYMBOL_SIZE,
		fontWeight: PRIZE_NUMBER_WEIGHT,
		fill: 0xffffff,
		align: 'center' as const,
		stroke: { color: 0x000000, width: 4 },
	});
</script>

<Text
	anchor={0.5}
	scale={scale.current}
	text={formatBookWin(capBookAmount(displayAmount.current))}
	style={amountStyle}
	resolution={textRes}
/>
