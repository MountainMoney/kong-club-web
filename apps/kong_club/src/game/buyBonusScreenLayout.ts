/** Layout constants shared by buy-bonus modal components (ported from Football Fiesta). */

/** Buy-bonus overlay layout — design px at 1920×1080 reference. */
export const BUY_BONUS_REF_W = 1920;
export const BUY_BONUS_REF_H = 1080;

export const BUY_BONUS_CARD_W = 460;
export const BUY_BONUS_CARD_CONFIRM_W = 460;
export const BUY_BONUS_CARD_GAP = 16;
export const BUY_BONUS_CARD_PAD = 8;
/** Max scatter cluster width inside card padding (keeps trophies on-card). */
export const BUY_BONUS_CLUSTER_MAX_W =
	BUY_BONUS_CARD_W - BUY_BONUS_CARD_PAD * 2;
/** Extra space above the title (added to top edge padding). */
export const BUY_BONUS_CARD_PAD_TOP_EXTRA = 12;
export const BUY_BONUS_CARD_RADIUS_PX = 18;

/** Portrait mobile card width (Le Bandit–style compact row). */
export const BUY_BONUS_PORTRAIT_CARD_W = 168;
export const BUY_BONUS_PORTRAIT_CARD_GAP = 12;
/** Portrait confirm — centered card, ~32px side margin on phone. */
export const BUY_BONUS_PORTRAIT_CONFIRM_MAX_W = 352;
export const BUY_BONUS_PORTRAIT_CONFIRM_MIN_W = 300;
export const BUY_BONUS_PORTRAIT_CONFIRM_H_PAD = 32;
export const BUY_BONUS_PORTRAIT_SHEET_REF_W = 320;
/** Compact typography / block scale vs desktop 296px cards. */
export const BUY_BONUS_PORTRAIT_COMPACT_SCALE = 0.72;
export const BUY_BONUS_PORTRAIT_BTN_MIN_H = 44;

export const buyBonusPortraitConfirmWidth = (viewportWidth: number) =>
	Math.min(
		BUY_BONUS_PORTRAIT_CONFIRM_MAX_W,
		Math.max(
			BUY_BONUS_PORTRAIT_CONFIRM_MIN_W,
			viewportWidth - BUY_BONUS_PORTRAIT_CONFIRM_H_PAD,
		),
	);

/** Full-width stacked list rows on portrait bonus menu. */
export const BUY_BONUS_LIST_ROW_GAP = 10;
export const BUY_BONUS_LIST_ACTION_W = 88;

export const buyBonusPortraitListWidth = (viewportWidth: number) =>
	buyBonusPortraitConfirmWidth(viewportWidth);

export const BUY_BONUS_CLOSE_SIZE = 34;
export const BUY_BONUS_CLOSE_INSET = 30;

export const BUY_BONUS_OVERLAY_OPACITY = 0.45;
export const BUY_BONUS_BLUR_PX = 10;

/** Typography & content block sizes at grid card width (296px). */
export const BUY_BONUS_TITLE_PX = 26;
export const BUY_BONUS_BODY_PX = 20;
export const BUY_BONUS_PRICE_PX = 30;
export const BUY_BONUS_BTN_PX = 34;
export const BUY_BONUS_BODY_COLOR = '#3C3C3C';

/** Gap between BET control and card row (design px). */
export const BUY_BONUS_BET_BLOCK_GAP = 28;

/** Fixed description block — tallest copy at 18px / 248px inner width.
 *  Tightened slightly so the image-↔-description band is less empty without removing
 *  all of the intentional breathing room.
 */
export const BUY_BONUS_DESC_H = 84;
export const BUY_BONUS_IMAGE_H = 228;
/** Hero trophy fill inside image block (Extra Chance / Mystery). */
export const BUY_BONUS_HERO_TROPHY_RATIO = 0.96;
/** Portrait list icon box (trophy cluster / hero art). */
export const BUY_BONUS_LIST_ICON_BOX_W = 88;
export const BUY_BONUS_LIST_ICON_BOX_H = 72;

/** Vertical space between title, description, image, volatility, and button. */
export const BUY_BONUS_SECTION_GAP = 8;
/** Extra margin around icon block (top nudge + space above volatility). */
export const BUY_BONUS_IMAGE_VOL_GAP = 18;
const BUY_BONUS_TITLE_BLOCK_H = Math.ceil(BUY_BONUS_TITLE_PX * 1.2);
const BUY_BONUS_VOL_BLOCK_H = Math.ceil(BUY_BONUS_BODY_PX * 1.2);
const BUY_BONUS_PRICE_BLOCK_H = Math.ceil(BUY_BONUS_PRICE_PX * 1.2);
const BUY_BONUS_BTN_ACCENT_H = 4;
const BUY_BONUS_BTN_BLOCK_H = 52;

export type BuyBonusCardSizeOpts = {
	compact?: boolean;
	/** Portrait confirm bottom sheet — tight padding, auto height. */
	portraitSheet?: boolean;
	/** Description lives on the confirm card only. */
	showDescription?: boolean;
};

const portraitSheetMetrics = () => ({
	refW: BUY_BONUS_PORTRAIT_SHEET_REF_W,
	titlePx: 22,
	bodyPx: 14,
	pricePx: 28,
	btnPx: 17,
	imageH: 108,
	imageVolGap: 10,
	sectionGap: 8,
	pad: 16,
	padTopExtra: 4,
	btnBlockH: BUY_BONUS_PORTRAIT_BTN_MIN_H,
});

const compactMetrics = () => {
	const f = BUY_BONUS_PORTRAIT_COMPACT_SCALE;
	return {
		refW: BUY_BONUS_PORTRAIT_CARD_W,
		titlePx: BUY_BONUS_TITLE_PX * f,
		bodyPx: BUY_BONUS_BODY_PX * f,
		pricePx: BUY_BONUS_PRICE_PX * f,
		btnPx: BUY_BONUS_BTN_PX * f,
		descH: 0,
		imageH: BUY_BONUS_IMAGE_H * f,
		imageVolGap: BUY_BONUS_IMAGE_VOL_GAP * f,
		sectionGap: BUY_BONUS_SECTION_GAP * f,
		pad: BUY_BONUS_CARD_PAD * f,
		padTopExtra: BUY_BONUS_CARD_PAD_TOP_EXTRA * f,
		btnBlockH: Math.max(BUY_BONUS_PORTRAIT_BTN_MIN_H, BUY_BONUS_BTN_BLOCK_H * f),
	};
};

/** Confirm card height preserves grid card aspect ratio (omit for portrait sheet — auto height). */
export const buyBonusCardHeight = (
	width: number,
	opts?: BuyBonusCardSizeOpts,
): number | undefined => {
	if (opts?.portraitSheet) return undefined;
	if (!opts?.compact && !opts?.showDescription) return 176;

	if (opts?.compact) {
		const m = compactMetrics();
		const scale = width / m.refW;
		const titleBlockH = Math.ceil(m.titlePx * 1.2);
		const volBlockH = Math.ceil(m.bodyPx * 1.2);
		const priceBlockH = Math.ceil(m.pricePx * 1.2);
		const descBlock = opts?.showDescription ? m.sectionGap + BUY_BONUS_DESC_H * BUY_BONUS_PORTRAIT_COMPACT_SCALE : 0;
		const inner =
			titleBlockH +
			descBlock +
			m.sectionGap +
			m.imageH +
			m.sectionGap +
			m.imageVolGap +
			volBlockH +
			m.sectionGap +
			priceBlockH +
			m.sectionGap +
			BUY_BONUS_BTN_ACCENT_H +
			m.sectionGap +
			m.btnBlockH;
		const padTop = m.pad + m.padTopExtra;
		return inner * scale + (padTop + m.pad) * scale;
	}

	const scale = width / BUY_BONUS_CARD_W;
	const descBlock = opts?.showDescription ? BUY_BONUS_SECTION_GAP + BUY_BONUS_DESC_H : 0;
	const inner =
		BUY_BONUS_TITLE_BLOCK_H +
		descBlock +
		BUY_BONUS_SECTION_GAP +
		BUY_BONUS_IMAGE_H +
		BUY_BONUS_SECTION_GAP +
		BUY_BONUS_IMAGE_VOL_GAP +
		BUY_BONUS_VOL_BLOCK_H +
		BUY_BONUS_SECTION_GAP +
		BUY_BONUS_PRICE_BLOCK_H +
		BUY_BONUS_SECTION_GAP +
		BUY_BONUS_BTN_ACCENT_H +
		BUY_BONUS_SECTION_GAP +
		BUY_BONUS_BTN_BLOCK_H;
	const padTop = BUY_BONUS_CARD_PAD + BUY_BONUS_CARD_PAD_TOP_EXTRA;
	return inner * scale + (padTop + BUY_BONUS_CARD_PAD) * scale;
};

/** CSS variable bundle for MonkeyBuyBonusCard. */
export const buyBonusCardStyleVars = (width: number, accent: string, opts?: BuyBonusCardSizeOpts) => {
	if (opts?.portraitSheet) {
		const m = portraitSheetMetrics();
		const scale = Math.min(1, width / m.refW);
		return {
			scale,
			accent,
			titlePx: m.titlePx,
			bodyPx: m.bodyPx,
			pricePx: m.pricePx,
			btnPx: m.btnPx,
			descH: 0,
			imageH: m.imageH,
			imageVolGap: m.imageVolGap,
			cardPad: m.pad,
			cardPadTop: m.pad + m.padTopExtra,
			sectionGap: m.sectionGap,
		};
	}

	if (opts?.compact) {
		const m = compactMetrics();
		const scale = width / m.refW;
		return {
			scale,
			accent,
			titlePx: m.titlePx,
			bodyPx: m.bodyPx,
			pricePx: m.pricePx,
			btnPx: m.btnPx,
			descH: opts?.showDescription ? m.descH || BUY_BONUS_DESC_H * BUY_BONUS_PORTRAIT_COMPACT_SCALE : 0,
			imageH: m.imageH,
			imageVolGap: m.imageVolGap,
			cardPad: m.pad,
			cardPadTop: m.pad + m.padTopExtra,
			sectionGap: m.sectionGap,
		};
	}
	const scale = width / BUY_BONUS_CARD_W;
	return {
		scale,
		accent,
		titlePx: BUY_BONUS_TITLE_PX,
		bodyPx: BUY_BONUS_BODY_PX,
		pricePx: BUY_BONUS_PRICE_PX,
		btnPx: BUY_BONUS_BTN_PX,
		descH: opts?.showDescription ? BUY_BONUS_DESC_H : 0,
		imageH: BUY_BONUS_IMAGE_H,
		imageVolGap: BUY_BONUS_IMAGE_VOL_GAP,
		cardPad: BUY_BONUS_CARD_PAD,
		cardPadTop: BUY_BONUS_CARD_PAD + BUY_BONUS_CARD_PAD_TOP_EXTRA,
		sectionGap: BUY_BONUS_SECTION_GAP,
	};
};
