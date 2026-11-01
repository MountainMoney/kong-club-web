/** Shared jungle / Penguin Club playfield chrome — not Le Bandit cluster frames. */

export const MM_PLAYFIELD_UI = {
	panelFill: 0x142818,
	panelFillMid: 0x243f28,
	panelStroke: 0xffd65a,
	panelStrokeSoft: 0xf5c842,
	panelHighlight: 0xffec9a,
	panelAccent: 0x74a065,
	textFill: 0xffffff,
	textStroke: 0x000000,
} as const;

export const drawMmPlaquePanel = (
	g: import('pixi.js').Graphics,
	width: number,
	height: number,
	pulse = 0,
) => {
	const w = width + pulse * 6;
	const h = height + pulse * 4;
	const x = -w / 2;
	const y = -h / 2;
	const {
		panelFill,
		panelFillMid,
		panelStroke,
		panelStrokeSoft,
		panelHighlight,
		panelAccent,
	} = MM_PLAYFIELD_UI;

	g.clear();
	g.roundRect(x - 4, y - 4, w + 8, h + 8, 14);
	g.fill({ color: panelStrokeSoft, alpha: 0.08 + pulse * 0.12 });

	g.roundRect(x, y, w, h, 12);
	g.fill({ color: panelFill, alpha: 0.94 });
	g.stroke({ color: panelStroke, width: 2.5 + pulse, alpha: 0.88 });

	g.roundRect(x + 4, y + 4, w - 8, h - 8, 9);
	g.fill({ color: panelFillMid, alpha: 0.92 });

	g.roundRect(x + 8, y + 8, Math.max(12, w * 0.34), Math.max(8, h - 16), 6);
	g.fill({ color: panelAccent, alpha: 0.18 });

	if (h > 18) {
		g.roundRect(x + 6, y + 10, w - 12, 6, 3);
		g.fill({ color: panelHighlight, alpha: 0.22 + pulse * 0.18 });
	}
};

/** Splash intro cards — thicker gold rim, wood fill, inner hairline + top sheen. */
export const drawMmIntroCardPlaque = (
	g: import('pixi.js').Graphics,
	width: number,
	height: number,
) => {
	const w = width;
	const h = height;
	const x = -w / 2;
	const y = -h / 2;
	const r = Math.max(14, Math.round(Math.min(w, h) * 0.06));

	g.clear();
	g.roundRect(x - 6, y - 6, w + 12, h + 12, r + 4);
	g.fill({ color: 0x3a2208, alpha: 0.35 });

	g.roundRect(x, y, w, h, r);
	g.fill({ color: 0x1a1208, alpha: 0.96 });
	g.stroke({ color: 0xc9a227, width: 5, alpha: 1 });

	g.roundRect(x + 5, y + 5, w - 10, h - 10, Math.max(10, r - 4));
	g.fill({ color: 0x2a1c10, alpha: 0.94 });
	g.stroke({ color: 0xffec9a, width: 1.5, alpha: 0.72 });

	g.roundRect(x + 10, y + 10, w - 20, h - 20, Math.max(8, r - 6));
	g.fill({ color: 0x243018, alpha: 0.88 });

	g.roundRect(x + 14, y + 14, w - 28, Math.max(10, h * 0.14), 6);
	g.fill({ color: 0xffec9a, alpha: 0.14 });
};

export const drawMmMultiplierBadge = (
	g: import('pixi.js').Graphics,
	width: number,
	height: number,
	pulse = 0,
) => {
	drawMmPlaquePanel(g, width, height, pulse);
};

export const drawMmProgressBar = (
	g: import('pixi.js').Graphics,
	barW: number,
	barH: number,
	fillRatio: number,
	barPhase: number,
) => {
	const { panelFill, panelFillMid, panelStroke, panelHighlight, panelStrokeSoft, panelAccent } =
		MM_PLAYFIELD_UI;
	const fillH = barH * Math.min(1, Math.max(0, fillRatio));
	const pulse = 0.5 + Math.sin(barPhase * Math.PI * 2) * 0.5;

	g.clear();
	g.roundRect(0, 0, barW, barH, 6);
	g.fill({ color: panelFill, alpha: 0.94 });
	g.stroke({ color: panelStroke, width: 2.5, alpha: 0.88 });

	g.roundRect(2, 2, Math.max(1, barW - 4), Math.max(0, barH - 4), 5);
	g.fill({ color: panelFillMid, alpha: 0.92 });

	g.roundRect(3, 3, Math.max(1, barW * 0.28), Math.max(0, barH - 6), 5);
	g.fill({ color: panelAccent, alpha: 0.16 });

	if (fillH > 0) {
		const fillY = barH - fillH;
		g.roundRect(0, fillY, barW, fillH, 6);
		g.fill({ color: panelStrokeSoft, alpha: 1 });
		if (fillH > 4) {
			g.roundRect(2, fillY + 2, barW - 4, fillH - 4, 4);
			g.fill({ color: panelHighlight, alpha: 0.38 + pulse * 0.16 });
		}
		if (fillH > 14) {
			const shimmerY = fillY + ((barPhase * 90) % Math.max(fillH, 1));
			g.roundRect(3, shimmerY, barW - 6, 8, 4);
			g.fill({ color: 0xffffff, alpha: 0.18 });
		}
	}
};
