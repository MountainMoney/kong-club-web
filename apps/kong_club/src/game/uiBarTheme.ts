export const PILL_FILL = 0x2d6b3a;
export const PILL_FILL_ALPHA = 0.6;
export const PILL_STROKE = 0xffffff;
export const PILL_STROKE_ALPHA = 0.18;
export const PILL_STROKE_WIDTH = 1;
export const PILL_BORDER_RADIUS = 14;

/** Circular / pill toolbar control hover highlight. */
export const TOOLBAR_BUTTON_HOVER_ALPHA = 0.1;

/** Autoplay armed (counter set, loop not started) — gold ring + autospin tint. */
export const AUTOPLAY_ARMED_TINT = 0xffaa44;
export const AUTOPLAY_ARMED_RING = { radiusScale: 1.06, alpha: 0.5, width: 2.5 } as const;

/** Brief scale pop on toolbar WIN / TOTAL WIN when the amount increases. */
export const TOOLBAR_WIN_FLASH_PEAK_SCALE = 1.12;

/** Turbo sprite tint per speed (Summit: lightning only — no extra rings/dots). */
export const TURBO_TIER_TINT = {
	turbo: 0xffcc66,
	superTurbo: 0xff8800,
} as const;

/** Brief scale punch when cycling turbo tiers. */
export const TURBO_TIER_CYCLE_PEAK_SCALE = 1.08;

/** Extra Chance inline BET-column accent (1920×1080 reference px). */
export const ANTE_LABEL_FILL = 0xffaa33;
export const ANTE_VALUE_FILL = 0xffc933;
export const ANTE_ACCENT_FILL = 0xff8800;
export const ANTE_ACCENT_ALPHA = 0.28;
export const ANTE_ACCENT_STROKE_ALPHA = 0.55;

/** Feature Spin inline BET-column accent (1920×1080 reference px). */
export const FEATURE_SPIN_LABEL_FILL = 0x7dff7d;
export const FEATURE_SPIN_VALUE_FILL = 0x50be50;
export const FEATURE_SPIN_ACCENT_FILL = 0x3a9e3a;
export const FEATURE_SPIN_ACCENT_ALPHA = 0.28;
export const FEATURE_SPIN_ACCENT_STROKE_ALPHA = 0.55;

/** PEAK inline BET-column accent. */
export const PEAK_SPIN_VALUE_FILL = 0xffd54f;

/** One-shot activation toast (1920×1080 reference px). */
export const EXTRA_CHANCE_TOAST_W = 400;
export const EXTRA_CHANCE_TOAST_H = 72;
