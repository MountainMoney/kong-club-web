/**
 * Ryan (Nov 9 2026): a dimmed UI element darkens; it does not turn see-through.
 * Multiply a colour toward black at full opacity (used as a Pixi `tint`, which a
 * Container passes down to its children).
 */
export const darken = (brightness: number, color = 0xffffff): number => {
	const k = Math.min(1, Math.max(0, brightness));
	const r = Math.round(((color >> 16) & 0xff) * k);
	const g = Math.round(((color >> 8) & 0xff) * k);
	const b = Math.round((color & 0xff) * k);
	return (r << 16) | (g << 8) | b;
};
