<script lang="ts" module>
	import type { RawSymbol, Position } from '../game/types';

	type AddingBoard = RawSymbol[][];

	type ExplodingPositions = Position[];

	export type EmitterEventTumbleBoard =
		| { type: 'tumbleBoardShow' }
		| { type: 'tumbleBoardHide' }
		| { type: 'tumbleBoardInit'; addingBoard: AddingBoard; resultBoard?: RawSymbol[][] }
		| { type: 'tumbleBoardReset' }
		| { type: 'tumbleBoardExplode'; explodingPositions: ExplodingPositions }
		| { type: 'tumbleBoardRemoveExploded' }
		| { type: 'tumbleBoardSlideDown'; unison?: boolean }
		| { type: 'tumbleBoardSnap' };
</script>

<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { cubicOut, sineInOut, sineOut } from 'svelte/easing';

	import { BoardContext } from 'components-shared';
	import { stateBetDerived } from 'state-shared';
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';
	import { slideSymbolFallIn } from 'utils-slots';

	import { CLUSTER_EXPLODE_MAX_MS } from '../game/clusterConnectionTempo';
	import { isTumbleGameRow } from '../game/tumbleBoardSim';

	import TumbleBoardBase from './TumbleBoardBase.svelte';
	import BoardContainer from './BoardContainer.svelte';
	import BoardMask from './BoardMask.svelte';
	import { SYMBOL_SIZE, zIndexes } from '../game/constants';
	import { getReelSpinOptions, isSuperTurbo, isTurboOrFaster } from '../game/spinSpeed.svelte';
	import { getSymbolY } from '../game/utils';
	import { getContext } from '../game/context';
	import { uniqueSymbolPositions } from '../game/boardPositions';
	import { stateSpinSkip } from '../game/spinSkip.svelte';
	import {
		isPremiumSymbolName,
		PREMIUM_LAND_BREATHE_MS,
		PREMIUM_LAND_BREATHE_PEAK,
	} from '../game/premiumLandBreathe';
	import type { TumbleSymbol } from '../game/stateGame.svelte';

	const context = getContext();

	let show = $state(false);
	let tumbleDropEpoch = 0;
	let pendingResultBoard = $state<RawSymbol[][] | undefined>(undefined);

	const TUMBLE_REEL_STAGGER_MS = 10;
	const TUMBLE_TURBO_REEL_STAGGER_MS = 6;
	const GAME_ROW_COUNT = 5;
	/** Cascade-only bounce. Fall speed matches the old tumble (normal spin 1.15). */
	const tumbleFallInOptions = () => ({
		...getReelSpinOptions('normal'),
		symbolFallInInterval: 0,
		symbolFallInBounceSizeMulti: 0.34,
		symbolFallInBounceSpeed: 0.2,
	});

	const playImpactSquish = (tumbleSymbol: TumbleSymbolState) => {
		void (async () => {
			await Promise.all([
				tumbleSymbol.symbolScaleX.set(1.07, { duration: 36, easing: cubicOut }),
				tumbleSymbol.symbolScaleY.set(0.92, { duration: 36, easing: cubicOut }),
			]);
			await Promise.all([
				tumbleSymbol.symbolScaleX.set(1, { duration: 90, easing: cubicOut }),
				tumbleSymbol.symbolScaleY.set(1, { duration: 90, easing: cubicOut }),
			]);
			if (
				!isPremiumSymbolName(tumbleSymbol.rawSymbol.name) ||
				stateSpinSkip.forceSkip ||
				isTurboOrFaster()
			) {
				return;
			}
			const peak = 1 + PREMIUM_LAND_BREATHE_PEAK;
			const half = Math.round(PREMIUM_LAND_BREATHE_MS / 2);
			await Promise.all([
				tumbleSymbol.symbolScaleX.set(peak, { duration: half, easing: sineOut }),
				tumbleSymbol.symbolScaleY.set(peak, { duration: half, easing: sineOut }),
			]);
			await Promise.all([
				tumbleSymbol.symbolScaleX.set(1, { duration: half, easing: sineInOut }),
				tumbleSymbol.symbolScaleY.set(1, { duration: half, easing: sineInOut }),
			]);
		})();
	};

	type TumbleSymbolState = TumbleSymbol;

	type TumbleColumnState = {
		topPad: TumbleSymbolState;
		bottomPad: TumbleSymbolState;
		game: TumbleSymbolState[];
		adding: TumbleSymbolState[];
	};

	let tumbleColumns = $state<TumbleColumnState[]>([]);

	const createTumbleSymbol = ({ initY, rawSymbol }: { initY: number; rawSymbol: RawSymbol }) => {
		const symbolY = new Tween(initY);
		const oncomplete = () => {};

		const tumbleSymbol = $state({
			symbolY,
			symbolScaleX: new Tween(1),
			symbolScaleY: new Tween(1),
			rawSymbol,
			symbolState: 'static' as TumbleSymbolState['symbolState'],
			oncomplete,
		});

		return tumbleSymbol;
	};

	const snapTumbleSymbol = (tumbleSymbol: TumbleSymbolState, targetY: number) => {
		tumbleSymbol.symbolY.set(targetY, { duration: 0 });
		tumbleSymbol.symbolScaleX.set(1, { duration: 0 });
		tumbleSymbol.symbolScaleY.set(1, { duration: 0 });
		tumbleSymbol.symbolState = 'static';
		tumbleSymbol.oncomplete();
	};

	const snapColumnGameRows = (column: TumbleColumnState) => {
		snapTumbleSymbol(column.topPad, getSymbolY(-1));
		column.game.forEach((tumbleSymbol, gameIndex) => {
			snapTumbleSymbol(tumbleSymbol, getSymbolY(gameIndex));
		});
		column.adding.forEach((tumbleSymbol, addingIndex) => {
			snapTumbleSymbol(tumbleSymbol, getSymbolY(addingIndex - column.adding.length));
		});
		snapTumbleSymbol(column.bottomPad, getSymbolY(GAME_ROW_COUNT));
	};

	const snapAllColumns = () => {
		tumbleColumns.forEach(snapColumnGameRows);
	};

	const mergeColumnToGame = (column: TumbleColumnState): TumbleColumnState => {
		const merged = [...column.adding, ...column.game].slice(0, GAME_ROW_COUNT);
		return { ...column, adding: [], game: merged };
	};

	const initTumbleColumns = ({
		addingBoard,
		resultBoard,
	}: {
		addingBoard: AddingBoard;
		resultBoard?: RawSymbol[][];
	}) => {
		pendingResultBoard = resultBoard;
		tumbleColumns = context.stateGameDerived.boardRaw().map((column, reelIndex) => {
			const addingReel = addingBoard[reelIndex] ?? [];
			const topPad = createTumbleSymbol({ initY: getSymbolY(-1), rawSymbol: column[0] });
			const bottomPad = createTumbleSymbol({
				initY: getSymbolY(GAME_ROW_COUNT),
				rawSymbol: column[6] ?? column[column.length - 1],
			});
			const game = column.slice(1, 6).map((rawSymbol, gameIndex) =>
				createTumbleSymbol({ initY: getSymbolY(gameIndex), rawSymbol }),
			);
			const adding = addingReel.map((rawSymbol, addingIndex) =>
				createTumbleSymbol({
					initY: getSymbolY(addingIndex - addingReel.length),
					rawSymbol,
				}),
			);

			return { topPad, bottomPad, game, adding };
		});
	};

	const slideTumbleSymbolToTarget = async ({
		tumbleSymbol,
		targetY,
		isVisibleGameRow,
		epoch,
		startDelayMs,
		symbolIndexInBoard,
	}: {
		tumbleSymbol: TumbleSymbolState;
		targetY: number;
		isVisibleGameRow: boolean;
		epoch: number;
		startDelayMs: number;
		symbolIndexInBoard: number;
	}) => {
		if (epoch !== tumbleDropEpoch) {
			snapTumbleSymbol(tumbleSymbol, targetY);
			return;
		}

		if (startDelayMs > 0) {
			const ts = Math.max(0.5, stateBetDerived.timeScale());
			await waitForTimeout(startDelayMs / ts);
			if (epoch !== tumbleDropEpoch) {
				snapTumbleSymbol(tumbleSymbol, targetY);
				return;
			}
		}

		const currentY = tumbleSymbol.symbolY.current;
		const distance = targetY - currentY;
		if (Math.abs(distance) < 0.5) {
			if (isVisibleGameRow) tumbleSymbol.symbolState = 'static';
			return;
		}

		await slideSymbolFallIn({
			symbolY: tumbleSymbol.symbolY,
			oldSymbolY: currentY,
			newSymbolY: targetY,
			symbolIndexInBoard,
			reelLengthInBoard: GAME_ROW_COUNT,
			spinOptions: tumbleFallInOptions(),
			symbolHeight: SYMBOL_SIZE,
			onLand: () => {
				if (epoch !== tumbleDropEpoch) return;
				tumbleSymbol.symbolState = 'static';
				if (isVisibleGameRow) {
					playImpactSquish(tumbleSymbol);
					context.stateGameDerived.onSymbolLand({ rawSymbol: tumbleSymbol.rawSymbol });
				}
			},
		});

		if (epoch !== tumbleDropEpoch) {
			snapTumbleSymbol(tumbleSymbol, targetY);
		}
	};

	const applyPendingPadding = () => {
		if (!pendingResultBoard) return;
		tumbleColumns = tumbleColumns.map((column, reelIndex) => {
			const resultColumn = pendingResultBoard?.[reelIndex];
			if (!resultColumn?.[0] || !resultColumn[6]) return column;
			column.topPad.rawSymbol = resultColumn[0];
			column.bottomPad.rawSymbol = resultColumn[6];
			return column;
		});
	};

	const finishSlideColumns = () => {
		tumbleColumns = tumbleColumns.map(mergeColumnToGame);
		applyPendingPadding();
		snapAllColumns();
	};

	context.eventEmitter.subscribeOnMount({
		tumbleBoardShow: () => (show = true),
		tumbleBoardHide: () => (show = false),
		tumbleBoardInit: ({ addingBoard, resultBoard }) => {
			tumbleDropEpoch += 1;
			if (tumbleColumns.length > 0) snapAllColumns();
			initTumbleColumns({ addingBoard, resultBoard });
		},
		tumbleBoardSnap: () => {
			tumbleDropEpoch += 1;
			if (tumbleColumns.length > 0) snapAllColumns();
		},
		tumbleBoardReset: () => {
			tumbleDropEpoch += 1;
			tumbleColumns = [];
			pendingResultBoard = undefined;
			context.stateGame.tumbleBoardAdding = [];
			context.stateGame.tumbleBoardBase = [];
		},
		tumbleBoardExplode: async ({ explodingPositions }) => {
			const positions = uniqueSymbolPositions(explodingPositions).filter((position) =>
				isTumbleGameRow(position.row),
			);
			const snapFast = stateSpinSkip.forceSkip;
			const explodeCap = snapFast ? 16 : CLUSTER_EXPLODE_MAX_MS;

			await Promise.all(
				positions.map(async (position) => {
					const gameIndex = position.row - 1;
					const tumbleSymbol = tumbleColumns[position.reel]?.game[gameIndex];
					if (!tumbleSymbol) return;
					if (snapFast) {
						tumbleSymbol.symbolState = 'explosion';
						return;
					}
					await Promise.race([
						waitForResolve((resolve) => {
							tumbleSymbol.oncomplete = resolve;
							tumbleSymbol.symbolState = 'explosion';
						}),
						waitForTimeout(explodeCap),
					]);
					tumbleSymbol.symbolState = 'explosion';
				}),
			);
		},
		tumbleBoardRemoveExploded: () => {
			tumbleColumns = tumbleColumns.map((column) => ({
				...column,
				game: column.game.filter((tumbleSymbol) => tumbleSymbol.symbolState !== 'explosion'),
			}));
		},
		tumbleBoardSlideDown: async ({ unison } = {}) => {
			const epoch = tumbleDropEpoch;
			const snapFast = stateSpinSkip.forceSkip;

			if (snapFast) {
				finishSlideColumns();
				return;
			}

			const reelStaggerMs = (reelIndex: number) => {
				if (unison || isSuperTurbo()) return 0;
				if (isTurboOrFaster()) return reelIndex * TUMBLE_TURBO_REEL_STAGGER_MS;
				return reelIndex * TUMBLE_REEL_STAGGER_MS;
			};

			const slideMoves = (
				moves: {
					tumbleSymbol: TumbleSymbolState;
					targetY: number;
					isVisibleGameRow: boolean;
					reelIndex: number;
					symbolIndexInBoard: number;
				}[],
			) =>
				Promise.all(
					moves.map((move) =>
						slideTumbleSymbolToTarget({
							tumbleSymbol: move.tumbleSymbol,
							targetY: move.targetY,
							isVisibleGameRow: move.isVisibleGameRow,
							epoch,
							startDelayMs: reelStaggerMs(move.reelIndex),
							symbolIndexInBoard: move.symbolIndexInBoard,
						}),
					),
				);

			const allMoves = tumbleColumns.flatMap((column, reelIndex) => {
				const merged = [...column.adding, ...column.game];
				return merged.map((tumbleSymbol, mergedIndex) => ({
					tumbleSymbol,
					targetY: getSymbolY(mergedIndex),
					isVisibleGameRow: mergedIndex < GAME_ROW_COUNT,
					reelIndex,
					symbolIndexInBoard: mergedIndex,
				}));
			});

			await slideMoves(allMoves);
			if (epoch !== tumbleDropEpoch) return;
			finishSlideColumns();
		},
	});
</script>

{#if show}
	<BoardContext animate={false}>
		<BoardContainer zIndex={zIndexes.boardSymbols}>
			<BoardMask />
			<TumbleBoardBase {tumbleColumns} />
		</BoardContainer>
	</BoardContext>

	<BoardContext animate={true}>
		<BoardContainer zIndex={zIndexes.boardSymbols}>
			<BoardMask />
			<TumbleBoardBase {tumbleColumns} />
		</BoardContainer>
	</BoardContext>
{/if}
