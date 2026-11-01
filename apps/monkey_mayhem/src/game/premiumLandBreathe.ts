/** Picture / premium pay symbols — not royals, wilds, scatters, or coins. */
export const PREMIUM_SYMBOL_NAMES = ['BA', 'GR', 'OR', 'CO', 'LE'] as const;

export const isPremiumSymbolName = (name: string) =>
	(PREMIUM_SYMBOL_NAMES as readonly string[]).includes(name);

/** One inhale on impact. Do not retune locked Y bounce / gravity. */
export const PREMIUM_LAND_BREATHE_MS = 320;
export const PREMIUM_LAND_BREATHE_PEAK = 0.05;
export const PREMIUM_LAND_ARM_ABOVE_PX = 28;
