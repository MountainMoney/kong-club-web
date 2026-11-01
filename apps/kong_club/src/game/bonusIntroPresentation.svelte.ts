/** Shared fade state for bonus-entered presentation (background crossfade + dimmed playfield). */
export const stateBonusIntro = $state({
	active: false,
	tier: 1,
	/** 1 = fully visible playfield, lower = faded board / mascot during intro. */
	playfieldAlpha: 1,
	/** 0 = base background, 1 = feature / super jungle. */
	backgroundBlend: 0,
	/** Intro copy + art overlay. */
	overlayAlpha: 0,
});

export const resetBonusIntroPresentation = () => {
	stateBonusIntro.active = false;
	stateBonusIntro.tier = 1;
	stateBonusIntro.playfieldAlpha = 1;
	stateBonusIntro.backgroundBlend = 0;
	stateBonusIntro.overlayAlpha = 0;
};

/** Same jungle, dimmed playfield — no super-bg swap. */
export const BONUS_INTRO_PLAYFIELD_DIM = 0.32;

/** Apply dimmed playfield while the screen is fully black. */
export const prepareBonusEntryUnderBlack = (tier: number) => {
	stateBonusIntro.active = true;
	stateBonusIntro.tier = tier;
	stateBonusIntro.backgroundBlend = 0;
	stateBonusIntro.playfieldAlpha = BONUS_INTRO_PLAYFIELD_DIM;
	stateBonusIntro.overlayAlpha = 0;
};
