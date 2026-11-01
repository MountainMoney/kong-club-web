<script lang="ts" module>

	export type EmitterEventGlobalMultiplier =

		| { type: 'globalMultiplierShow' }

		| { type: 'globalMultiplierHide' }

		| { type: 'globalMultiplierUpdate'; multiplier: number };

</script>



<script lang="ts">

	import { Tween } from 'svelte/motion';



	import { Container, Text } from 'pixi-svelte';

	import { FadeContainer } from 'components-pixi';

	import { stateBetDerived } from 'state-shared';

	import { waitForTimeout } from 'utils-shared/wait';



	import BoardContainer from './BoardContainer.svelte';

	import MmPlayfieldPanel from './MmPlayfieldPanel.svelte';

	import { getContext } from '../game/context';

	import { SYMBOL_SIZE } from '../game/constants';

	import { MM_PLAYFIELD_UI } from '../game/mmPlayfieldUiTheme';



	const PANEL_WIDTH = SYMBOL_SIZE * 1.35;

	const PANEL_HEIGHT = SYMBOL_SIZE * 0.72;

	const context = getContext();

	const scale = $derived(context.stateLayoutDerived.isStacked() ? 1.28 : 1);

	const desktopPosition = $derived({

		x: context.stateGameDerived.boardLayout().width - PANEL_WIDTH * 0.72,

		y: -SYMBOL_SIZE * 0.52,

	});

	const portraitPosition = $derived({

		x: context.stateGameDerived.boardLayout().width - PANEL_WIDTH * 0.82,

		y: -SYMBOL_SIZE * 0.58,

	});

	const position = $derived(

		context.stateLayoutDerived.isStacked() ? portraitPosition : desktopPosition,

	);



	let show = $state(false);

	let multiplier = $state(1);

	let displayMultiplier = new Tween(1);

	let pulse = $state(0);



	const labelStyle = $derived({

		fontFamily: 'Fredoka',

		fontSize: SYMBOL_SIZE * 0.34,

		fontWeight: '700' as const,

		fill: MM_PLAYFIELD_UI.textFill,

		stroke: { color: MM_PLAYFIELD_UI.textStroke, width: 5 },

	});



	const bumpPulse = async () => {

		pulse = 1;

		await displayMultiplier.set(multiplier * 1.08, { duration: 120 / stateBetDerived.timeScale() });

		await displayMultiplier.set(multiplier, { duration: 160 / stateBetDerived.timeScale() });

		pulse = 0;

	};



	context.eventEmitter.subscribeOnMount({

		globalMultiplierShow: () => (show = true),

		globalMultiplierHide: () => (show = false),

		globalMultiplierUpdate: async (emitterEvent) => {

			if (emitterEvent.multiplier === 1 && multiplier !== 1) {

				context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_reset' });

				pulse = 0.35;

				await waitForTimeout(220 / stateBetDerived.timeScale());

				multiplier = 1;

				await displayMultiplier.set(1, { duration: 0 });

				pulse = 0;

				return;

			}



			if (emitterEvent.multiplier > multiplier) {

				context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_update' });

				multiplier = emitterEvent.multiplier;

				await bumpPulse();

				return;

			}



			multiplier = emitterEvent.multiplier;

			await displayMultiplier.set(multiplier, { duration: 0 });

		},

	});

</script>



<FadeContainer {show}>

	<BoardContainer>

		<Container {...position} {scale}>

			<Container x={PANEL_WIDTH * 0.5} y={PANEL_HEIGHT * 0.5}>

				<MmPlayfieldPanel width={PANEL_WIDTH} height={PANEL_HEIGHT} {pulse} />

				<Text

					anchor={0.5}

					text={`${Math.round(displayMultiplier.current)}×`}

					style={labelStyle}

				/>

			</Container>

		</Container>

	</BoardContainer>

</FadeContainer>

