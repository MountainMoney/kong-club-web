/** Fade state for bonus-end total win (playfield out → overlay in → base game). */
export const stateBonusOutro = $state({
	active: false,
	/** Board / mascot / feature overlays during outro. */
	playfieldAlpha: 1,
	/** Total win panel (label + amount). */
	overlayAlpha: 0,
	/** Keep playfield hidden until transition completes. */
	holdPlayfieldHidden: false,
});

let bonusOutroSequenceActive = false;

export const tryBeginBonusOutroSequence = () => {
	if (bonusOutroSequenceActive) return false;
	bonusOutroSequenceActive = true;
	return true;
};

export const endBonusOutroSequence = () => {
	bonusOutroSequenceActive = false;
};

export const resetBonusOutroPresentation = () => {
	stateBonusOutro.overlayAlpha = 0;
	if (!stateBonusOutro.holdPlayfieldHidden) {
		stateBonusOutro.active = false;
		stateBonusOutro.playfieldAlpha = 1;
	}
};

export const beginBonusOutroTransitionCover = () => {
	stateBonusOutro.holdPlayfieldHidden = true;
	stateBonusOutro.playfieldAlpha = 0;
	stateBonusOutro.overlayAlpha = 0;
};

export const endBonusOutroTransitionCover = () => {
	stateBonusOutro.holdPlayfieldHidden = false;
	stateBonusOutro.active = false;
	stateBonusOutro.playfieldAlpha = 1;
	stateBonusOutro.overlayAlpha = 0;
};

export const releaseBonusOutroPlayfield = () => {
	endBonusOutroTransitionCover();
};
