import { emptyTileLevels, normalizeTileLevels } from './tileLevelVisual';
import { stateGame } from './stateGame.svelte';

/** Last `updateLevelUpTiles` grid — used so Board Activation can fill any missing prizes. */
let lastTileLevels: number[][] = emptyTileLevels();

export const mergeTileLevelGrids = (current: number[][], incoming: number[][]): number[][] =>
	incoming.map((reel, reelIndex) =>
		reel.map((level, rowIndex) => Math.max(current[reelIndex]?.[rowIndex] ?? 0, level ?? 0)),
	);

export const rememberTileLevels = (tileLevels: number[][], tileMultipliers?: number[][]) => {
	// Speak No Evil shows bronze like every other mode: math lights and pays bronze there.
	const incoming = normalizeTileLevels(
		tileLevels,
		tileMultipliers ?? tileLevels.map((reel) => reel.map(() => 0)),
	);
	lastTileLevels =
		stateGame.gameType === 'freegame' ? mergeTileLevelGrids(lastTileLevels, incoming) : incoming;
};

/** After FE merge with pending / visual ranks — keep activation fill in sync. */
export const rememberResolvedTileLevels = (levels: number[][]) => {
	lastTileLevels = levels.map((reel) => reel.map((level) => level ?? 0));
};

export const getLastTileLevels = () => lastTileLevels;

export const clearLastTileLevels = () => {
	lastTileLevels = emptyTileLevels();
};
