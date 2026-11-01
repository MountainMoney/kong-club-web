<script lang="ts" module>
	import type { RawSymbol, Position } from '../game/types';

	export type EmitterEventBoard =
		| { type: 'boardSettle'; board: RawSymbol[][] }
		| { type: 'boardShow' }
		| { type: 'boardHide' }
		| {
				type: 'boardWithAnimateSymbols';
				symbolPositions: Position[];
		  };
</script>

<script lang="ts">
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';
	import { SECOND } from 'constants-shared/time';
	import { Container } from 'pixi-svelte';
	import { BoardContext } from 'components-shared';

	import { getContext } from '../game/context';
	import { zIndexes } from '../game/constants';
	import BoardMask from './BoardMask.svelte';
	import BoardBase from './BoardBase.svelte';
	import { requestSpinSkip, stateSpinSkip } from '../game/spinSkip.svelte';
	import { isValidSettleBoard, snapReelsToSettlePositions } from '../game/boardSettle';
	import { uniqueSymbolPositions } from '../game/boardPositions';

	const context = getContext();

	let show = $state(true);

	const isValidBoard = (board: RawSymbol[][]) => isValidSettleBoard(board);

	context.eventEmitter.subscribeOnMount({
		stopButtonClick: () => {
			if (stateSpinSkip.tumbleAnimating) {
				requestSpinSkip();
				return;
			}
			context.stateGameDerived.enhancedBoard.stop();
		},
		boardSettle: ({ board }) => {
			if (!isValidBoard(board)) {
				if (import.meta.env.DEV) {
					console.warn('[boardSettle] rejected invalid board dimensions or missing symbols', board);
				}
				return;
			}
			context.stateGameDerived.enhancedBoard.settle(board);
			snapReelsToSettlePositions(context.stateGame.board);
		},
		boardShow: () => (show = true),
		boardHide: () => (show = false),
		boardWithAnimateSymbols: async ({ symbolPositions }) => {
			const getPromises = () =>
				uniqueSymbolPositions(symbolPositions).map(async (position) => {
					const reelSymbol = context.stateGame.board[position.reel]?.reelState.symbols[position.row];
					if (!reelSymbol) return;
					await Promise.race([
						waitForResolve((resolve) => {
							reelSymbol.oncomplete = resolve;
							reelSymbol.symbolState = 'win';
						}),
						waitForTimeout(SECOND * 4),
					]);
					reelSymbol.symbolState = 'postWinStatic';
				});

			await Promise.all(getPromises());
		},
	});

	context.stateGameDerived.enhancedBoard.readyToSpinEffect();

	const board = $derived(context.stateGameDerived.boardLayout());
</script>

<BoardContext animate={false}>
	<Container
		visible={show}
		x={board.x}
		y={board.y}
		pivot={board.pivot}
		scale={board.scale ?? 1}
		sortableChildren={true}
		zIndex={zIndexes.boardSymbols}
	>
		<BoardMask />
		<BoardBase />
	</Container>
</BoardContext>

<BoardContext animate={true}>
	<Container
		visible={show}
		x={board.x}
		y={board.y}
		pivot={board.pivot}
		scale={board.scale ?? 1}
		sortableChildren={true}
		zIndex={zIndexes.boardSymbols}
	>
		<BoardMask />
		<BoardBase />
	</Container>
</BoardContext>
