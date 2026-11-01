/** Pixi canvas text crispness — ceil devicePixelRatio, minimum 2 for sharp strokes on HiDPI. */
export const getPixiTextResolution = (): number =>
	typeof window !== 'undefined' ? Math.max(2, Math.ceil(window.devicePixelRatio)) : 2;

export const roundPix = (n: number): number => Math.round(n);

export const roundFontSize = (n: number): number => Math.max(8, Math.round(n));
