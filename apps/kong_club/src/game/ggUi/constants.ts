// Layout numbers ported from Gaia's Grotto shaft-ui (Figma UI Bonus Menu / UI Basic).
// Grid Y is shifted so Kong Club's two rows of three sit in the same stage as GG's three rows.

export type BonusCardCut = {
	width: number;
	height: number;
	radius: number;
	border: number;
	lip: number;
	/** `fade`: the art fades out from `from` of the way down to nothing at `height`. */
	art: { x: number; y: number; fade?: { height: number; from: number } };
	title: { x: number; y: number; size: number; lettering: number };
	label?: { y: number; size: number };
	pips: { x: number; y: number };
	slider?: { x: number; y: number; width: number };
	body?: { y: number; width: number; size: number; lineHeight: number };
	/** The price and button sit on their own plate under the card. */
	strip?: { y: number; height: number };
	price: { x: number; y: number; size: number };
	button: { x: number; y: number; width: number; height: number; size: number };
};

// Figma: UI Bonus Menu (30:2990), its confirm step (30:3873) and Mobile Bonus Menu (30:5021)

export const DESIGN = { width: 1920, height: 1080 } as const;

export const DESIGN_PORTRAIT = { width: 480, height: 812 } as const;

// Figma: UI Basic (30:1171); the bar's box is 1280x164 at (320, 904)
export const UI_BAR = {
	width: 1280,
	height: 164,
	marginBottom: 12,
	logo: { x: -3, y: 13 },
	panelInfo: { x: 141, y: 13 },
	panelBet: { x: 737, y: 13 },
	spin: { x: 1125, y: -3 },
	chip: { size: 40, radius: 6, iconSize: 24, shadow: 3, inset: 1.5, border: 2 },
	menu: { x: 200, y: 55 },
	betUp: { x: 796, y: 32 },
	betDown: { x: 796, y: 80 },
	auto: { x: 1060, y: 32 },
	turbo: { x: 1060, y: 80 },
	// The bet readout between the arrows opens the bet list.
	betZone: { x: 844, y: 32, width: 208, height: 88 },
	label: { y: 54, size: 24 },
	value: { y: 92, size: 32 },
	left: 264,
	right: 694,
	centre: 948,
	// Figma: UI Menu Bonus (30:1404): free spins swap the bar for two readout panels
	bonus: {
		panel: { x: -2, y: 13 },
		panelWin: { x: 671, y: 13 },
		chip: { size: 56, iconSize: 28 },
		menu: { x: 56, y: 48 },
		turbo: { x: 1168, y: 48 },
		left: 152,
		bet: 628,
		spins: 730,
		win: 1128,
	},
	autoGapMs: 600,
	compactBelow: 0.6,
} as const;

// Figma: Mobile Basic (30:2939)
export const UI_BAR_PORTRAIT = {
	logo: { x: 9.5, y: 641.5 },
	panel: { x: 81.5, y: 641.5, height: 77 },
	menuPanel: { x: 401.5, y: 641.5 },
	spin: { x: 189.5, y: 625.5 },
	// The stop button only exists at desktop size.
	stopScale: 101 / 158,
	menu: { x: 416, y: 656 },
	turbo: { x: 96, y: 656 },
	betDown: { x: 144, y: 656 },
	betUp: { x: 296, y: 656 },
	auto: { x: 344, y: 656 },
	betZone: { x: 330, y: 740, width: 140, height: 60 },
	label: { y: 756, size: 16 },
	value: { y: 780, size: 20 },
	left: 20,
	right: 460,
	centre: 240,
	// Figma: Mobile Bonus (30:4984)
	bonus: {
		panel: { x: 9.5, y: 637.5 },
		menu: { x: 28, y: 656 },
		turbo: { x: 412, y: 656 },
		spins: 80,
		win: 396,
		label: { y: 662, size: 16 },
		value: { y: 686, size: 20 },
	},
	// A landscape window too narrow for the desktop bar pins this one to its bottom edge.
	top: 625.5,
	maxShare: 0.3,
} as const;

// Figma: UI Menu (30:1317), UI Menu Bonus (30:1404), UI Autoplay (30:1470), UI Bets (30:1550); bar space
export const UI_POPUP = {
	gap: 20,
	mobileGap: 8,
	mobileWidth: 456,
	radius: 20,
	border: 2.5,
	borderAlpha: { top: 0.08, bottom: 0.2 },
	outline: 3,
	lip: 8,
	edge: { offset: 2, color: 0x1b1b1b },
	top: 0x1a1a1a,
	bottom: 0x101010,
	pad: 20,
	cell: { height: 56, gap: 12, size: 24, tracking: -0.48 },
	menu: {
		x: 45,
		width: 350,
		height: 180,
		bonusHeight: 262,
		row: 52,
		icon: { x: 40.5, y: 40.5 },
		slider: { x: 70.5, y: 33 },
		info: { x: 70.5, hit: { x: 20, y: 124, width: 310, height: 40 } },
		hold: { x: 20, y: 184, width: 310, height: 58, borderAlpha: 0.1, fillAlpha: 0.2, ms: 1000 },
	},
	slider: {
		width: 258,
		height: 14,
		radius: 8,
		inset: 2,
		thumb: 20,
		thumbRadius: 4,
		hit: 12,
		trackAlpha: 0.2,
		fillAlpha: 0.75,
		restAlpha: 0.5,
	},
	autoplay: {
		right: 1256,
		cell: 96,
		columns: 3,
		infinity: 30.8,
		title: { y: 36, size: 24 },
		rule: 68,
		top: 88,
		rounds: [Infinity, 10, 25, 50, 100, 200, 300, 500, 1000],
	},
	bets: { right: 1416, cell: 140, columns: 6, mobileColumns: 3 },
} as const;

// Figma: the bar's whole palette is three greys and one accent
// Every button: a press shrinks it, letting go springs it back past its size.
export const PRESS = { scale: 0.92, stiffness: 0.3, damping: 0.4 } as const;

export const UI_COLOR = {
	label: 0x999999,
	value: 0xffffff,
	icon: 0xffffff,
	chip: 0xffffff,
	chipAlpha: 0.08,
	shadowAlpha: 0.4,
	highlightAlpha: 0.1,
	accent: 0xffd201,
	// Figma: 30:1363: a lit chip trades its highlight for an accent outline
	activeBorderAlpha: 0.5,
	// Figma: 45:219: a disabled chip only dims its icon (darkened at full opacity, not faded)
	disabledIconBrightness: 0.5,
} as const;

// Figma: UI Bonus Menu (30:2990), its confirm step (30:3873) and Mobile Bonus Menu (30:5021)
export const BONUS_BUY = {
	scrim: { flat: 0.4, fade: 0.4, blur: 10 },
	// Figma: one card in four cuts — Group 2087331762 (30:3051), its double-width top row (30:3107),
	// the mobile column's (30:371) and the confirm dialog's (30:4211)
	card: {
		desktop: {
			width: 450,
			height: 215,
			radius: 16,
			border: 2.5,
			lip: 8,
			art: { x: 107, y: 107.5 },
			title: { x: 308, y: 67, size: 40, lettering: 1 },
			label: { y: 140, size: 24 },
			pips: { x: 254, y: 168 },
			slider: { x: 194, y: 133, width: 228 },
			strip: { y: 220, height: 80 },
			price: { x: 119, y: 260, size: 32 },
			button: { x: 238, y: 232, width: 200, height: 56, size: 24 },
		},
		wide: {
			width: 683,
			height: 215,
			radius: 16,
			border: 2.5,
			lip: 8,
			art: { x: 183.5, y: 107.5 },
			title: { x: 483.5, y: 67, size: 40, lettering: 1 },
			label: { y: 140, size: 24 },
			pips: { x: 429.5, y: 168 },
			slider: { x: 369.5, y: 133, width: 228 },
			strip: { y: 220, height: 80 },
			price: { x: 235.5, y: 260, size: 32 },
			button: { x: 471, y: 232, width: 200, height: 56, size: 24 },
		},
		mobile: {
			width: 448,
			height: 168,
			radius: 12,
			border: 2,
			lip: 6,
			art: { x: 115, y: 84 },
			title: { x: 316, y: 48, size: 32, lettering: 64 / 90 },
			label: { y: 100, size: 20 },
			pips: { x: 262, y: 124 },
			slider: { x: 224, y: 93, width: 184 },
			strip: { y: 173, height: 72 },
			price: { x: 118, y: 209, size: 24 },
			button: { x: 236, y: 185, width: 200, height: 48, size: 20 },
		},
		confirm: {
			width: 320,
			height: 484,
			radius: 16,
			border: 2.5,
			lip: 8,
			// Figma: Rectangle 161128682 (30:4323)
			art: { x: 160, y: 99, fade: { height: 180, from: 0.6 } },
			title: { x: 160, y: 191, size: 40, lettering: 1 },
			pips: { x: 106, y: 256 },
			body: { y: 300, width: 272, size: 16, lineHeight: 20 },
			price: { x: 160, y: 372, size: 32 },
			button: { x: 24, y: 404, width: 272, height: 56, size: 24 },
		},
	} satisfies Record<string, BonusCardCut>,
	// The art and lettering are 2x exports.
	artScale: 0.5,
	fadeStrip: 256,
	outline: 3,
	edge: 2,
	// Figma: 45:311: a card the balance cannot cover
	dimBrightness: 0.5,
	pips: { width: 20, height: 24, pitch: 22, count: 5, dimBrightness: 0.2, slack: 8 },
	// Figma: Frame 2147258648 (30:634): Hunt Spins picks its level where the volatility label was
	slider: {
		height: 14,
		alpha: 0.2,
		segment: { inset: 2, height: 10, gap: 1, radius: 5, alpha: 0.5, fillAlpha: 0.75 },
		thumb: { size: 20, radius: 4 },
		hit: 16,
	},
	button: {
		sink: 3,
		activeBrightness: 0.5,
		activate: {
			radius: 6,
			border: 2,
			lip: 3,
			lipAlpha: 0.4,
			alpha: { top: 0.08, bottom: 0.16, border: { top: 0.2, bottom: 0.4 } },
		},
		buy: { radius: 8, lift: 2, lip: { near: 1.5, far: 4, alpha: 0.4 } },
		confirm: { radius: 6 },
	},
	titleShadow: { distance: 2, alpha: 0.4 },
	grid: { x: [269, 735, 1201], wideX: [269, 968], y: [167, 485, 803] },
	/**
	 * Three GG rows plus the stepper sit below the 1080 playfield.
	 * The buy screen scales this stage to the window.
	 */
	stage: { width: 1920, height: 1240 },
	dialog: { x: 800, y: 298 },
	// Under the confirm card: the full explanation of the offer
	detail: { y: 810, gap: 28, width: 720, size: 22, lineHeight: 30 },
	// Figma: Group 2087331689 (30:3867)
	close: { x: 1824, y: 32, size: 64, icon: 32, radius: 8, border: 2 },
	// Figma: Group 2087331776 (30:3850): chips `reach` either side of the centre
	stepper: {
		y: 1136,
		reach: 225,
		chip: { width: 68, height: 64 },
		amountY: 16,
		amountSize: 32,
		disabledBrightness: 0.25,
	},
	// Below this stage scale the grid's type is unreadable: cards stack in a scrolling column or two.
	mobile: {
		below: 0.6,
		twoColumnsFrom: 640,
		gap: 16,
		rowGap: 16,
		top: 92,
		close: 12,
		reach: 216,
		// The stepper stays put over a fade while the cards scroll under it.
		stepperBottom: 80,
		fade: { height: 200, alpha: 0.9 },
		bottom: 104,
		detailRoom: 320,
		dragSlop: 8,
	},
} as const;

// Figma: the page's whole palette
export const BONUS_BUY_COLOR = {
	card: { top: 0x1a1a1a, bottom: 0x101010 },
	outline: 0x000000,
	edge: 0x1b1b1b,
	border: 0xffffff,
	// Figma: the stroke is a gradient, faint at the top of each plate
	borderAlpha: { top: 0.08, bottom: 0.2 },
	title: 0xf5dd99,
	text: 0xffffff,
	label: 0x999999,
	accent: 0xffd201,
	ink: 0x000000,
} as const;

// Figma: Frame 2147258703 (30:2873) and the round dialog (30:4176) share this dark plate
export const PLATE = {
	top: 0x1a1a1a,
	bottom: 0x101010,
	border: 2.5,
	borderAlpha: { top: 0.08, bottom: 0.2 },
	outline: 3,
	lip: 8,
	edge: { offset: 2, color: 0x1b1b1b },
} as const;

// Figma: the ui bar is set in Rubik SemiBold throughout
export const UI_FONT_FAMILY = ['Rubik', 'proxima-nova', 'system-ui', 'sans-serif'];

// The prompt under the welcome, bonus intro and win screens
export const TAP_TO_CONTINUE = { y: 990, size: 32, pulseMs: 1600, minAlpha: 0.45 } as const;
