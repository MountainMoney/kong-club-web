const sprite = (path: string) => ({
	type: 'sprite' as const,
	src: `/assets/${path}`,
});

const sprites = (path: string) => ({
	type: 'sprites' as const,
	src: `/assets/${path}`,
});

/** Spine atlas is named after its folder unless atlasFile is overridden (e.g. big_wins.atlas). */
const spineAsset = (folder: string, skeleton: string, atlasFile?: string, scale = 2) => ({
	type: 'spine' as const,
	src: {
		atlas: `/assets/spines/${folder}/${atlasFile ?? `${folder.split('/').pop() ?? folder}.atlas`}`,
		skeleton: `/assets/spines/${folder}/${skeleton}.json`,
		scale,
	},
});

const symbolSprite = (file: string) => ({
	...sprite(`sprites/monkeySymbols/${file}`),
	preload: true,
});

const uiSprite = (file: string) => sprite(`monkey/ui/${file}`);

export default {
	pressToContinueText: {
		...sprites('sprites/pressToContinueText/MM_pressanywhere.json'),
		preload: true,
	},
	jungleBackground: {
		...sprite('sprites/background/jungle_bg.png'),
		preload: true,
	},
	/** Painted sky — clouds and far hills, behind the transparent forest plate. */
	jungleSky: {
		...sprite('sprites/background/jungle_bg_layer1.png'),
		preload: true,
	},
	/** Sunny grade. Same 16:9 plate, sky → forest → framing trees → bushes → stump. */
	sunnySky: { ...sprite('sprites/background/sunny_sky.png'), preload: true },
	sunnyBack: { ...sprite('sprites/background/sunny_back.png'), preload: true },
	sunnyTrees: { ...sprite('sprites/background/sunny_trees.png'), preload: true },
	sunnyBush: { ...sprite('sprites/background/sunny_bush.png'), preload: true },
	sunnyStump: { ...sprite('sprites/background/sunny_stump.png'), preload: true },
	/** Midnight grade. Same stack order as sunny. */
	midnightSky: { ...sprite('sprites/background/midnight_sky.png'), preload: true },
	midnightBack: { ...sprite('sprites/background/midnight_back.png'), preload: true },
	midnightTrees: { ...sprite('sprites/background/midnight_trees.png'), preload: true },
	midnightBush: { ...sprite('sprites/background/midnight_bush.png'), preload: true },
	midnightStump: { ...sprite('sprites/background/midnight_stump.png'), preload: true },
	/** Mascot stump — same 1920×1080 plate as the jungle. */
	jungleStump: {
		...sprite('sprites/background/jungle_bg_layer5.png'),
		preload: true,
	},
	jungleSuperBackground: {
		...sprite('sprites/background/jungle_bg_super.png'),
	},
	/** Wood playfield fill — behind symbols. */
	reelBoard: sprite('sprites/reelFrame/board.png'),
	/** Brown U-frame + vines — above symbols. */
	reelBorder: sprite('sprites/reelFrame/border.png'),
	title_art: {
		...symbolSprite('title_art.png'),
		preload: true,
	},
	monkeyMascot: { ...sprite('sprites/mascot/monkey.png'), preload: true },
	seeMonkey: { ...sprite('sprites/monkeySymbols/SEE.png'), preload: true },
	hearMonkey: { ...sprite('sprites/monkeySymbols/HEAR.png'), preload: true },
	speakMonkey: { ...sprite('sprites/monkeySymbols/SPEAK.png'), preload: true },
	mmMascot: spineAsset('mmMascot', 'MM_Mascot_2', 'MM_Mascot_2.atlas', 1),
	/** Bronze / silver / gold coin discs (`tongbi` / `yinbi` / `jinbi`). */
	coinMetal: {
		...spineAsset('coin', 'coin', 'coin.atlas', 1),
		preload: true,
	},
	/** Animated barrel wild (`mutong`). */
	barrelWild: {
		...spineAsset('barrel', 'barrel', 'barrel.atlas', 1),
		preload: true,
	},
	/** Canopy sway (`shu`) aligned to the 1920×1080 jungle plate. */
	jungleTrees: {
		...spineAsset('tree', 'tree', 'tree.atlas', 1),
		preload: true,
	},
	/** Grass sway (`Shrubbery`) on the same jungle plate, behind the trees. */
	jungleBush: {
		...spineAsset('bush', 'bush', 'bush.atlas', 1),
		preload: true,
	},
	sparkleFx: sprite('sprites/fx/sparkle.png'),
	LE: symbolSprite('LE.png'),
	CO: symbolSprite('CO.png'),
	OR: symbolSprite('OR.png'),
	GR: symbolSprite('GR.png'),
	BA: symbolSprite('BA.png'),
	T: symbolSprite('T.png'),
	J: symbolSprite('J.png'),
	Q: symbolSprite('Q.png'),
	K: symbolSprite('K.png'),
	A: symbolSprite('A.png'),
	CB: symbolSprite('CB.png'),
	CS: symbolSprite('CS.png'),
	CG: symbolSprite('CG.png'),
	/** Coin power — MULTI (legacy single frame). */
	XM: symbolSprite('XM.png'),
	/** MULTI spawn — hollow black eyes. */
	XM_hollow: symbolSprite('XM_hollow.png'),
	/** MULTI eyes — low (2/3/4). */
	XM_green: symbolSprite('XM_green.png'),
	/** MULTI eyes — mid (5/10). */
	XM_yellow: symbolSprite('XM_yellow.png'),
	/** MULTI eyes — high (20). */
	XM_red: symbolSprite('XM_red.png'),
	/** Coin power — COLLECTOR pot (full). */
	CL: symbolSprite('CL.png'),
	/** Coin power — COLLECTOR pot (empty / idle). */
	CL_empty: symbolSprite('CL_empty.png'),
	W: symbolSprite('W.png'),
	EXPLODED_W: symbolSprite('EXPLODED_W.png'),
	ST: symbolSprite('ST.png'),
	explosion: spineAsset('symbols3', 'explosion', 'symbols3.atlas'),
	reelsFrame: sprites('sprites/reelsFrame/reels_frame.json'),
	payFrame: sprite('sprites/payFrame/payFrame.png'),
	anticipation: spineAsset('anticipation', 'anticipation'),
	goldFont: {
		type: 'font',
		src: '/assets/fonts/goldFont/mm_gold.xml',
	},
	goldBlur: {
		type: 'font',
		src: '/assets/fonts/goldBlur/miningfont_gold_blur.xml',
	},
	silverFont: {
		type: 'font',
		src: '/assets/fonts/silverFont/mm_silver.xml',
	},
	purpleFont: {
		type: 'font',
		src: '/assets/fonts/purpleFont/mm_purple.xml',
	},
	bigwin: spineAsset('bigwin', 'mm_bigwin', 'big_wins.atlas'),
	fsIntro: spineAsset('fsIntro', 'fs_screen', 'fs_screen.atlas'),
	fsOutroNumber: spineAsset('fsIntro', 'fs_total_number', 'fs_screen.atlas'),
	progressBar: {
		...sprites('sprites/progressBar/progressBar.json'),
		preload: true,
	},
	symbolsStatic: {
		...sprites('sprites/symbolsStatic/symbolsStatic.json'),
		preload: true,
	},
	freeSpins: sprites('sprites/freeSpins/freeSpins.json'),
	winSmall: sprites('sprites/winSmall/MM_Localisation_winsmall.json'),
	clusterWin: spineAsset('clusterWin', 'clusterpay', 'clusterpay.atlas'),
	tumble_multiplier: spineAsset('tumbleWin', 'tumble_multiplier', 'tumble_win.atlas'),
	tumble_win: spineAsset('tumbleWin', 'tumble_win', 'tumble_win.atlas'),
	coins: {
		type: 'spriteSheet',
		src: '/assets/sprites/coin/SD2_Coin.json',
	},
	sound: {
		type: 'audio',
		src: '/assets/audio/sounds.json',
		preload: true,
	},
	bonus_button: {
		...uiSprite('bonus_button.png'),
		preload: true,
	},
	btn_spin: {
		...uiSprite('btn_spin.png'),
		preload: true,
	},
	btn_autospin: {
		...uiSprite('btn_autospin.png'),
		preload: true,
	},
	btn_turbo: {
		...uiSprite('btn_turbo.png'),
		preload: true,
	},
	btn_disable: {
		...uiSprite('btn_disable.png'),
		preload: true,
	},
	/** Playfield activation meter track (top slot, same canvas as the frame). */
	progress_bar: {
		...uiSprite('progress_bar.png'),
		preload: true,
	},
	/** Playfield activation meter fill (green→yellow, left→right). */
	progress_bar_fill: {
		...uiSprite('progress_bar_fill.png'),
		preload: true,
	},
	win_popup_big: uiSprite('win_popup_big.png'),
	win_popup_super: uiSprite('win_popup_super.png'),
	win_popup_mega: uiSprite('win_popup_mega.png'),
	win_popup_epic: uiSprite('win_popup_epic.png'),
	label_total_win_tier1: uiSprite('label_total_win_tier1.png'),
	label_total_win_tier2: uiSprite('label_total_win_tier2.png'),
	label_total_win_tier3: uiSprite('label_total_win_tier3.png'),
	intro_card_10000x: uiSprite('intro_card_10000x.png'),
	/** Gaia's Grotto UI chrome (panels, buttons, icons, sliders). Trifecta owns both games. */
	ggUiLogo: { ...sprite('gg-ui/logo.svg'), preload: true },
	ggUiPanelInfo: { ...sprite('gg-ui/panel-info.svg'), preload: true },
	ggUiPanelBet: { ...sprite('gg-ui/panel-bet.svg'), preload: true },
	ggUiSpin: { ...sprite('gg-ui/spin.svg'), preload: true },
	ggUiStop: { ...sprite('gg-ui/stop.svg'), preload: true },
	ggUiPanelBonus: { ...sprite('gg-ui/panel-bonus.svg'), preload: true },
	ggUiIconMenuLarge: { ...sprite('gg-ui/icon-menu-large.svg'), preload: true },
	ggUiIconTurboLarge: { ...sprite('gg-ui/icon-turbo-large.svg'), preload: true },
	ggUiMobileLogo: { ...sprite('gg-ui/mobile-logo.svg'), preload: true },
	ggUiMobilePanel: { ...sprite('gg-ui/mobile-panel.svg'), preload: true },
	ggUiMobileMenu: { ...sprite('gg-ui/mobile-menu.svg'), preload: true },
	ggUiMobileSpin: { ...sprite('gg-ui/mobile-spin.svg'), preload: true },
	ggUiMobilePanelBonus: { ...sprite('gg-ui/mobile-panel-bonus.svg'), preload: true },
	ggUiIconMenu: { ...sprite('gg-ui/icon-menu.svg'), preload: true },
	ggUiIconBetUp: { ...sprite('gg-ui/icon-bet-up.svg'), preload: true },
	ggUiIconBetDown: { ...sprite('gg-ui/icon-bet-down.svg'), preload: true },
	ggUiIconAuto: { ...sprite('gg-ui/icon-auto.svg'), preload: true },
	ggUiIconTurbo: { ...sprite('gg-ui/icon-turbo.svg'), preload: true },
	ggUiIconMusic: { ...sprite('gg-ui/icon-music.svg'), preload: true },
	ggUiIconMusicOff: { ...sprite('gg-ui/icon-music-off.svg'), preload: true },
	ggUiIconSound: { ...sprite('gg-ui/icon-sound.svg'), preload: true },
	ggUiIconSoundOff: { ...sprite('gg-ui/icon-sound-off.svg'), preload: true },
	ggUiIconInfo: { ...sprite('gg-ui/icon-info.svg'), preload: true },
	ggUiIconInfinity: { ...sprite('gg-ui/icon-infinity.svg'), preload: true },
	ggUiIconClose: { ...sprite('gg-ui/icon-close.webp'), preload: true },
	ggUiIconBolt: { ...sprite('gg-ui/icon-bolt.webp'), preload: true },
	ggBonusBuyStep: { ...sprite('gg-ui/step.webp'), preload: true },
	ggBgDesktopLobby: { ...sprite('gg-ui/bg-desktop-lobby.png'), preload: true },
	ggBgDesktopFeature: { ...sprite('gg-ui/bg-desktop-feature.png'), preload: true },
	ggBgDesktopPeak: { ...sprite('gg-ui/bg-desktop-peak.png'), preload: true },
	ggBgDesktopSee: { ...sprite('gg-ui/bg-desktop-see.png'), preload: true },
	ggBgDesktopHear: { ...sprite('gg-ui/bg-desktop-hear.png'), preload: true },
	ggBgDesktopGamble: { ...sprite('gg-ui/bg-desktop-gamble.png'), preload: true },
	ggBgMobileLobby: { ...sprite('gg-ui/bg-mobile-lobby.png'), preload: true },
	ggBgMobileFeature: { ...sprite('gg-ui/bg-mobile-feature.png'), preload: true },
	ggBgMobilePeak: { ...sprite('gg-ui/bg-mobile-peak.png'), preload: true },
	ggBgMobileSee: { ...sprite('gg-ui/bg-mobile-see.png'), preload: true },
	ggBgMobileHear: { ...sprite('gg-ui/bg-mobile-hear.png'), preload: true },
	ggBgMobileGamble: { ...sprite('gg-ui/bg-mobile-gamble.png'), preload: true },
	ggBgConfirmLobby: { ...sprite('gg-ui/bg-confirm-lobby.png'), preload: true },
	ggBgConfirmFeature: { ...sprite('gg-ui/bg-confirm-feature.png'), preload: true },
	ggBgConfirmPeak: { ...sprite('gg-ui/bg-confirm-peak.png'), preload: true },
	ggBgConfirmSee: { ...sprite('gg-ui/bg-confirm-see.png'), preload: true },
	ggBgConfirmHear: { ...sprite('gg-ui/bg-confirm-hear.png'), preload: true },
	ggBgConfirmGamble: { ...sprite('gg-ui/bg-confirm-gamble.png'), preload: true },
} as const;
