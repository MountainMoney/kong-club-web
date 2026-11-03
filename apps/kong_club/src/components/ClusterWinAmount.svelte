<script lang="ts" module>

	export type RawWin = {

		amount: number;

		reel: number; // 0 | 1 | 2 | 3 | 4 | 5;

		row: number; // 1 | 2 | 3 | 4 | 5; // excluding the off top row and the off bottom row

	};

	export type Win = RawWin & { oncomplete: () => void };

</script>



<script lang="ts">

	import { onMount } from 'svelte';

	import { Tween } from 'svelte/motion';

	import { cubicOut } from 'svelte/easing';



	import { Container, Text } from 'pixi-svelte';

	import { stateBetDerived } from 'state-shared';

	import { FadeContainer } from 'components-pixi';

	import { waitForTimeout } from 'utils-shared/wait';

	import { formatBookWin } from '../game/stakeMoney';
	import { capBookAmount } from '../game/winCountTier';



	import { SYMBOL_SIZE } from '../game/constants';

	import {

		CLUSTER_WIN_FADE_MS,

		CLUSTER_WIN_HOLD_MS,

		CLUSTER_WIN_POP_MS,

	} from '../game/clusterConnectionTempo';

	import { ensurePrizeNumberFont } from '../game/introFont';
	import { PRIZE_NUMBER_FONT, PRIZE_NUMBER_WEIGHT } from '../game/prizeNumberFont';

	import { getPixiTextResolution } from '../game/pixiTextCrisp';

	import { bookRowToOverlayY, getSymbolX } from '../game/utils';



	type Props = { win: Win };



	const props: Props = $props();

	const scale = new Tween(0.82);

	const x = getSymbolX(props.win.reel);

	const y = bookRowToOverlayY(props.win.row) - SYMBOL_SIZE * 0.15;

	let show = $state(true);

	let fontReady = $state(false);



	onMount(() => {

		void ensurePrizeNumberFont().then(() => {

			fontReady = true;

		});

	});



	onMount(async () => {

		await scale.set(1, {

			duration: CLUSTER_WIN_POP_MS / stateBetDerived.timeScale(),

			easing: cubicOut,

		});

		await waitForTimeout(CLUSTER_WIN_HOLD_MS / stateBetDerived.timeScale());

		show = false;

	});



	const textRes = getPixiTextResolution();

	const amountStyle = $derived({

		fontFamily: fontReady ? PRIZE_NUMBER_FONT : 'Arial',

		fontSize: SYMBOL_SIZE * 0.5,

		fontWeight: PRIZE_NUMBER_WEIGHT,

		fill: 0xffffff,

		align: 'center' as const,

		stroke: { color: 0x000000, width: 4 },

	});

</script>



<FadeContainer

	{show}

	duration={CLUSTER_WIN_FADE_MS / stateBetDerived.timeScale()}

	oncomplete={() => {

		if (!show) props.win.oncomplete();

	}}

>

	<Container {x} {y} scale={scale.current}>

		<Text

			anchor={0.5}

			text={formatBookWin(capBookAmount(props.win.amount))}

			style={amountStyle}

			resolution={textRes}

		/>

	</Container>

</FadeContainer>

