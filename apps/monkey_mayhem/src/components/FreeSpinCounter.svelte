<script lang="ts" module>
	export type EmitterEventFreeSpinCounter =
		| { type: 'freeSpinCounterShow' }
		| { type: 'freeSpinCounterHide' }
		| { type: 'freeSpinCounterUpdate'; current?: number; total?: number };
</script>

<script lang="ts">
	import { MainContainer } from 'components-layout';
	import { FadeContainer } from 'components-pixi';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';
	import { getBoardScreenMetrics } from '../game/monkeyMayhemLayout';
	import { MM_PLAYFIELD_UI } from '../game/mmPlayfieldUiTheme';
	import { freeSpinCounterLabel, freeSpinProgressLabel } from '../game/socialCopy';
	import { anchorToPivot, Container, Text, type Sizes } from 'pixi-svelte';
	import MmPlayfieldPanel from './MmPlayfieldPanel.svelte';

	const context = getContext();
	const board = $derived(context.stateGameDerived.boardLayout());
	const screen = $derived(getBoardScreenMetrics(board));
	const panelWidth = $derived(SYMBOL_SIZE * 2);
	const panelHeight = $derived(SYMBOL_SIZE * 1.52);
	const panelSizes = $derived({ width: panelWidth, height: panelHeight });
	const scale = 1;
	const position = $derived({
		x: board.x - screen.halfW - panelSizes.width - SYMBOL_SIZE * 0.7 * screen.scale,
		y: board.y - screen.halfH,
	});

	const fontSize = SYMBOL_SIZE * 0.275;
	const labelStyle = {
		fontFamily: 'Fredoka',
		fontSize,
		fontWeight: '700' as const,
		fill: MM_PLAYFIELD_UI.textFill,
		stroke: { color: MM_PLAYFIELD_UI.textStroke, width: 3 },
		wordWrap: false,
	};

	let show = $state(false);
	let current = $state(0);
	let total = $state(0);
	let titleSizes: Sizes = $state({ width: 0, height: 0 });
	let counterSizes: Sizes = $state({ width: 0, height: 0 });

	const textContainerSizes = $derived({
		width: titleSizes.width,
		height: titleSizes.height + counterSizes.height,
	});
	const counterPosition = $derived({ x: titleSizes.width / 2, y: titleSizes.height });
	const counterTitle = $derived(freeSpinCounterLabel());

	context.eventEmitter.subscribeOnMount({
		freeSpinCounterShow: () => (show = true),
		freeSpinCounterHide: () => (show = false),
		freeSpinCounterUpdate: (emitterEvent) => {
			if (emitterEvent.current !== undefined) current = emitterEvent.current;
			if (emitterEvent.total !== undefined) total = emitterEvent.total;
		},
	});
</script>

<MainContainer>
	<FadeContainer {show} {...position} {scale}>
		<Container x={panelSizes.width * 0.5} y={panelSizes.height * 0.5}>
			<MmPlayfieldPanel width={panelSizes.width} height={panelSizes.height} />
			<Container
				pivot={anchorToPivot({
					sizes: textContainerSizes,
					anchor: { x: 0.5, y: 0.5 },
				})}
			>
				<Text text={counterTitle} style={labelStyle} onresize={(sizes) => (titleSizes = sizes)} />
				<Text
					text={freeSpinProgressLabel(current, total)}
					{...counterPosition}
					anchor={{ x: 0.5, y: 0 }}
					style={labelStyle}
					onresize={(sizes) => (counterSizes = sizes)}
				/>
			</Container>
		</Container>
	</FadeContainer>
</MainContainer>
