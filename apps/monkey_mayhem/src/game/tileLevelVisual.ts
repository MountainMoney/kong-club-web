/** Visual tier for Level-Up Tiles — classic MM Bronze / Silver / Gold. */

export type TileTier = 'none' | 'bronze' | 'silver' | 'gold';

/** Cluster pay multipliers by rank (level 1..3). */
export const TILE_LEVEL_MULTIPLIERS = [2, 5, 10] as const;

export const MAX_TILE_LEVEL = TILE_LEVEL_MULTIPLIERS.length;

/** Map tile levels onto three plaque styles. */
export const tileLevelToTier = (level: number): TileTier => {
	const normalized = normalizeTileLevel(level);
	if (normalized <= 0) return 'none';
	if (normalized === 1) return 'bronze';
	if (normalized === 2) return 'silver';
	return 'gold';
};

export const tileLevelToMultiplier = (level: number): number => {
	const normalized = normalizeTileLevel(level);
	if (normalized <= 0) return 0;
	return TILE_LEVEL_MULTIPLIERS[normalized - 1] ?? 0;
};

/** Derive tile level from stored payout multiplier. */
export const tileLevelFromMultiplier = (multiplier: number): number => {
	if (multiplier <= 0) return 0;
	let level = 0;
	for (let index = 0; index < TILE_LEVEL_MULTIPLIERS.length; index += 1) {
		if (multiplier >= TILE_LEVEL_MULTIPLIERS[index]) {
			level = index + 1;
		}
	}
	return level;
};

/**
 * Clamp to 0..3. Migrate stale 13-level books: 1–3→1, 4–6→2, 7+→3.
 * Also guards books that stored payout multipliers in tileLevels.
 */
export const normalizeTileLevel = (level: number, multiplier = 0): number => {
	if (level <= 0 && multiplier <= 0) return 0;

	// Old Le Bandit 13-level books → classic 3 ranks (1–3→1, 4–6→2, 7+→3).
	if (level > MAX_TILE_LEVEL) {
		if (level <= 6) return 2;
		return 3;
	}

	const fromMultiplier = tileLevelFromMultiplier(multiplier);
	if (fromMultiplier > 0 && level > 0 && level !== fromMultiplier) {
		const expected = TILE_LEVEL_MULTIPLIERS[level - 1];
		if (expected !== multiplier) return fromMultiplier;
	}
	return Math.min(Math.max(level, 0), MAX_TILE_LEVEL);
};

export const normalizeTileLevels = (
	tileLevels: number[][],
	tileMultipliers: number[][],
): number[][] =>
	tileLevels.map((reel, reelIndex) =>
		reel.map((level, rowIndex) =>
			normalizeTileLevel(level, tileMultipliers[reelIndex]?.[rowIndex] ?? 0),
		),
	);

export const BOARD_COIN_SYMBOLS = new Set(['CB', 'CS', 'CG']);

export const isBoardCoinSymbol = (symbol: string) => BOARD_COIN_SYMBOLS.has(symbol);

export const coinSymbolToTier = (symbol: string): TileTier => {
	if (symbol === 'CB') return 'bronze';
	if (symbol === 'CS') return 'silver';
	if (symbol === 'CG') return 'gold';
	return 'none';
};

/** Face bands match the hard coin pools: bronze 1–4, silver 5–20, gold 25+. */
export const SILVER_FACE_MIN = 5;
export const GOLD_FACE_MIN = 25;

/** Promote metal when a MULTI face enters the next tier. Never demote. */
export const coinMetalForFace = (
	face: number,
	currentLevel = 1,
): { symbol: 'CB' | 'CS' | 'CG'; tileLevel: number } => {
	let level = 1;
	if (face >= GOLD_FACE_MIN) level = 3;
	else if (face >= SILVER_FACE_MIN) level = 2;
	level = Math.max(level, Math.max(1, currentLevel));
	return { symbol: tileLevelToCoinSymbol(level) ?? 'CB', tileLevel: level };
};

/** CB / CS / CG for tile levels — 1→CB, 2→CS, 3→CG. */
export const tileLevelToCoinSymbol = (level: number): 'CB' | 'CS' | 'CG' | null => {
	const normalized = normalizeTileLevel(level);
	if (normalized <= 0) return null;
	if (normalized === 1) return 'CB';
	if (normalized === 2) return 'CS';
	return 'CG';
};

export const TIER_RANK: Record<TileTier, number> = {
	none: 0,
	bronze: 1,
	silver: 2,
	gold: 3,
};

/**
 * Per-cell plaque: metal frame + recessed well (top metal fading to dark).
 * Bronze / silver / gold stay distinct; not a copy of Le Bandit art.
 */
export const TIER_CELL_STYLE: Record<
	Exclude<TileTier, 'none'>,
	{
		fill: number;
		alpha: number;
		glow: number;
		rim: number;
		frame: number;
		wellTop: number;
		wellBottom: number;
	}
> = {
	bronze: {
		fill: 0x8a4e20,
		alpha: 0.95,
		glow: 0xd08a48,
		rim: 0xe8bc88,
		frame: 0xb06e38,
		wellTop: 0x9a5c28,
		wellBottom: 0x5a3414,
	},
	silver: {
		fill: 0x8a96a4,
		alpha: 0.95,
		glow: 0xd4dce4,
		rim: 0xeef2f6,
		frame: 0xb4c0cc,
		wellTop: 0x8c98a6,
		wellBottom: 0x4d4759,
	},
	gold: {
		fill: 0xb08c32,
		alpha: 0.95,
		glow: 0xe2c56a,
		rim: 0xead08a,
		frame: 0xc4a44a,
		wellTop: 0xb89638,
		wellBottom: 0x5d4b1b,
	},
};

export const emptyTileLevels = (): number[][] =>
	Array.from({ length: 6 }, () => Array.from({ length: 5 }, () => 0));
