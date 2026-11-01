/** Excerpt 14 — shrink full strings, never ellipsize or abbreviate. */

export const autoValueFontSize = (text: string, baseSize: number) => {
	const len = String(text ?? '').replace(/\s/g, '').length;
	const extra = Math.max(0, len - 11);
	return Math.max(10, baseSize - extra * (baseSize / 18));
};

export const sharedValueFontSize = (texts: string[], baseSize: number) =>
	autoValueFontSize(texts.reduce((a, b) => (a.length >= b.length ? a : b), ''), baseSize);

export const fitValueFontSize = (text: string, maxWidth: number, baseSize: number) => {
	const raw = String(text ?? '');
	if (!raw || maxWidth <= 0) return baseSize;
	const charEm = 0.65;
	const estimated = raw.length * baseSize * charEm;
	if (estimated <= maxWidth) return baseSize;
	return Math.max(10, maxWidth / (raw.length * charEm));
};

export const roundFitFontSize = (value: number) => Math.max(10, Math.round(value));

export const fitOverlayAmountSize = (text: string, maxWidth: number, preferred: number, minSize: number) => {
	const raw = String(text ?? '');
	if (!raw || maxWidth <= 8) return preferred;
	const charEm = 0.62;
	const estimated = raw.length * preferred * charEm;
	if (estimated <= maxWidth) return preferred;
	return Math.max(minSize, maxWidth / (raw.length * charEm));
};

export const overlayMoneyFontSize = (text: string, maxWidth: number, baseSize: number, minSize = 10) => {
	const raw = String(text ?? '');
	if (!raw || maxWidth <= 0) return baseSize;
	const charEm = 0.72;
	const lane = maxWidth * 0.9;
	const estimated = raw.length * baseSize * charEm;
	if (estimated <= lane) return baseSize;
	return Math.max(minSize, lane / (raw.length * charEm));
};

export const fitBonusCostFontSize = (text: string, maxWidth: number, baseSize: number, minSize = 11) => {
	const raw = String(text ?? '');
	if (!raw || maxWidth <= 0) return baseSize;
	const charEm = 0.82;
	const lane = maxWidth * 0.94;
	const estimated = raw.length * baseSize * charEm;
	if (estimated <= lane) return baseSize;
	return Math.max(minSize, lane / (raw.length * charEm));
};

export const estimateWinChipWidth = (text: string, fontSize: number, uiScale = 1) => {
	const raw = String(text ?? '');
	if (!raw || fontSize <= 0) return 0;
	const charEm = 0.82;
	const chrome = fontSize * 1.4 + 8 * Math.max(uiScale, 1);
	return Math.ceil(raw.length * fontSize * charEm + chrome);
};
