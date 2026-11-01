import type { Position } from './types';

/** One entry per board cell — shared wilds appear in multiple cluster wins. */
export const uniqueSymbolPositions = (positions: Position[]) => {
	const seen = new Set<string>();
	return positions.filter((position) => {
		const key = `${position.reel}:${position.row}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
};
