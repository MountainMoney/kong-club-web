/**
 * Kong Club asset manifest.
 *
 * Every art, sound, animation, logo, and font the game loads is listed here.
 * Swap a file by replacing it on disk, or point one entry's `src` at the new
 * file. Game code asks for a logical key (`logo`, `symbol_ST`, `music_base`)
 * and never hardcodes a path.
 *
 * A missing file must not crash or hang the loader. Each entry has a typed
 * fallback under `static/assets/placeholders/`. Pass `?assetPlaceholders=1`
 * to boot entirely on those placeholders.
 */

export type SpineSrc = { atlas: string; skeleton: string; scale?: number };

export type AssetFallback =
	| 'texture'
	| 'spritesheet'
	| 'spine'
	| 'bitmapFont'
	| 'audio'
	| 'cssFont';

export type ManifestType =
	| 'sprite'
	| 'sprites'
	| 'spine'
	| 'font'
	| 'spriteSheet'
	| 'audio'
	| 'music'
	| 'sfx'
	| 'cssFont';

export type ManifestEntry = {
	/** Logical swap name. This is the only name game code should use. */
	key: string;
	/** Pixi loader key. Omitted for music, cue, and CSS font entries. */
	runtimeKey?: string;
	type: ManifestType;
	src: string | SpineSrc;
	preload?: boolean;
	/** Howler sprite name when this cue lives in the sound pack. */
	sprite?: string;
	family?: string;
	weight?: string;
	format?: string;
	mime?: string;
	fallback: AssetFallback;
};

export const PLACEHOLDER = {
	texture: '/assets/placeholders/pixel.png',
	spritesheet: '/assets/placeholders/sheet.json',
	spine: {
		atlas: '/assets/placeholders/spine/placeholder.atlas',
		skeleton: '/assets/placeholders/spine/placeholder.json',
		scale: 1,
	} satisfies SpineSrc,
	bitmapFont: '/assets/placeholders/font.xml',
	audio: '/assets/placeholders/sounds.json',
	silent: '/assets/placeholders/silent.wav',
} as const;

const SFX_PACK = '/assets/audio/sounds.json';

const sprite = (key: string, runtimeKey: string, path: string, preload = false): ManifestEntry => ({
	key,
	runtimeKey,
	type: 'sprite',
	src: `/assets/${path}`,
	preload: preload || undefined,
	fallback: 'texture',
});

const sprites = (
	key: string,
	runtimeKey: string,
	path: string,
	preload = false,
): ManifestEntry => ({
	key,
	runtimeKey,
	type: 'sprites',
	src: `/assets/${path}`,
	preload: preload || undefined,
	fallback: 'spritesheet',
});

const spine = (
	key: string,
	runtimeKey: string,
	folder: string,
	skeleton: string,
	atlasFile?: string,
	scale = 2,
	preload = false,
): ManifestEntry => ({
	key,
	runtimeKey,
	type: 'spine',
	src: {
		atlas: `/assets/spines/${folder}/${atlasFile ?? `${folder.split('/').pop() ?? folder}.atlas`}`,
		skeleton: `/assets/spines/${folder}/${skeleton}.json`,
		scale,
	},
	preload: preload || undefined,
	fallback: 'spine',
});

const symbol = (name: string, file = `${name}.png`): ManifestEntry =>
	sprite(`symbol_${name}`, name, `sprites/monkeySymbols/${file}`, true);

const bitmapFont = (key: string, runtimeKey: string, path: string): ManifestEntry => ({
	key,
	runtimeKey,
	type: 'font',
	src: `/assets/${path}`,
	fallback: 'bitmapFont',
});

const cssFont = (
	key: string,
	file: string,
	family: string,
	weight: string,
	format: string,
	mime: string,
): ManifestEntry => ({
	key,
	type: 'cssFont',
	src: `/assets/fonts/${file}`,
	family,
	weight,
	format,
	mime,
	fallback: 'cssFont',
});

const cue = (key: string, spriteName = key): ManifestEntry => ({
	key,
	type: 'sfx',
	src: SFX_PACK,
	sprite: spriteName,
	fallback: 'audio',
});

const musicFile = (key: string, file: string): ManifestEntry => ({
	key,
	type: 'music',
	src: `/assets/audio/${file}`,
	fallback: 'audio',
});

const ui = (key: string, runtimeKey: string, file: string, preload = false): ManifestEntry =>
	sprite(key, runtimeKey, `monkey/ui/${file}`, preload);

const gg = (key: string, runtimeKey: string, file: string): ManifestEntry =>
	sprite(key, runtimeKey, `gg-ui/${file}`, true);

export const KONG_ASSET_MANIFEST: ManifestEntry[] = [
	// Logo and symbols
	sprite('logo', 'title_art', 'sprites/monkeySymbols/title_art.png', true),
	sprite('mascot', 'monkeyMascot', 'sprites/mascot/monkey.png', true),
	sprite('symbol_SEE', 'seeMonkey', 'sprites/monkeySymbols/SEE.png', true),
	sprite('symbol_HEAR', 'hearMonkey', 'sprites/monkeySymbols/HEAR.png', true),
	sprite('symbol_SPEAK', 'speakMonkey', 'sprites/monkeySymbols/SPEAK.png', true),
	symbol('LE'),
	symbol('CO'),
	symbol('OR'),
	symbol('GR'),
	symbol('BA'),
	symbol('T'),
	symbol('J'),
	symbol('Q'),
	symbol('K'),
	symbol('A'),
	symbol('CB'),
	symbol('CS'),
	symbol('CG'),
	symbol('XM'),
	symbol('XM_hollow'),
	symbol('XM_green'),
	symbol('XM_yellow'),
	symbol('XM_red'),
	symbol('CL'),
	symbol('CL_empty'),
	symbol('W'),
	symbol('EXPLODED_W'),
	symbol('ST'),

	// Backgrounds. bg_bonus_pick is the Mystery Bonus screen.
	sprite('bg_base', 'jungleBackground', 'sprites/background/jungle_bg.png', true),
	sprite('bg_sky', 'jungleSky', 'sprites/background/jungle_bg_layer1.png', true),
	sprite('bg_sunny_sky', 'sunnySky', 'sprites/background/sunny_sky.png', true),
	sprite('bg_sunny_back', 'sunnyBack', 'sprites/background/sunny_back.png', true),
	sprite('bg_sunny_trees', 'sunnyTrees', 'sprites/background/sunny_trees.png', true),
	sprite('bg_sunny_bush', 'sunnyBush', 'sprites/background/sunny_bush.png', true),
	sprite('bg_sunny_stump', 'sunnyStump', 'sprites/background/sunny_stump.png', true),
	sprite('bg_midnight_sky', 'midnightSky', 'sprites/background/midnight_sky.png', true),
	sprite('bg_midnight_back', 'midnightBack', 'sprites/background/midnight_back.png', true),
	sprite('bg_midnight_trees', 'midnightTrees', 'sprites/background/midnight_trees.png', true),
	sprite('bg_midnight_bush', 'midnightBush', 'sprites/background/midnight_bush.png', true),
	sprite('bg_midnight_stump', 'midnightStump', 'sprites/background/midnight_stump.png', true),
	sprite('bg_stump', 'jungleStump', 'sprites/background/jungle_bg_layer5.png', true),
	sprite('bg_super', 'jungleSuperBackground', 'sprites/background/jungle_bg_super.png'),
	sprite('bg_reel_board', 'reelBoard', 'sprites/reelFrame/board.png'),
	sprite('bg_reel_border', 'reelBorder', 'sprites/reelFrame/border.png'),
	sprite('bg_bonus_see', 'ggBgDesktopSee', 'gg-ui/bg-desktop-see.png', true),
	sprite('bg_bonus_hear', 'ggBgDesktopHear', 'gg-ui/bg-desktop-hear.png', true),
	sprite('bg_bonus_pick', 'ggBgDesktopGamble', 'gg-ui/bg-desktop-gamble.png', true),
	sprite('bg_bonus_see_mobile', 'ggBgMobileSee', 'gg-ui/bg-mobile-see.png', true),
	sprite('bg_bonus_hear_mobile', 'ggBgMobileHear', 'gg-ui/bg-mobile-hear.png', true),
	sprite('bg_bonus_pick_mobile', 'ggBgMobileGamble', 'gg-ui/bg-mobile-gamble.png', true),

	// Win animations and other spines
	spine('win_anim_bigwin', 'bigwin', 'bigwin', 'mm_bigwin', 'big_wins.atlas'),
	spine('win_anim_fs_intro', 'fsIntro', 'fsIntro', 'fs_screen', 'fs_screen.atlas'),
	spine('win_anim_fs_outro', 'fsOutroNumber', 'fsIntro', 'fs_total_number', 'fs_screen.atlas'),
	spine('win_anim_explosion', 'explosion', 'symbols3', 'explosion', 'symbols3.atlas'),
	spine('win_anim_cluster', 'clusterWin', 'clusterWin', 'clusterpay', 'clusterpay.atlas'),
	spine(
		'win_anim_tumble_multiplier',
		'tumble_multiplier',
		'tumbleWin',
		'tumble_multiplier',
		'tumble_win.atlas',
	),
	spine('win_anim_tumble', 'tumble_win', 'tumbleWin', 'tumble_win', 'tumble_win.atlas'),
	sprite('win_anim_big', 'win_popup_big', 'monkey/ui/win_popup_big.png'),
	sprite('win_anim_super', 'win_popup_super', 'monkey/ui/win_popup_super.png'),
	sprite('win_anim_mega', 'win_popup_mega', 'monkey/ui/win_popup_mega.png'),
	sprite('win_anim_epic', 'win_popup_epic', 'monkey/ui/win_popup_epic.png'),
	sprite('win_anim_max_card', 'intro_card_10000x', 'monkey/ui/intro_card_10000x.png'),
	sprites('win_anim_small', 'winSmall', 'sprites/winSmall/MM_Localisation_winsmall.json'),
	spine('anim_mascot', 'mmMascot', 'mmMascot', 'MM_Mascot_2', 'MM_Mascot_2.atlas', 1),
	spine('anim_coin', 'coinMetal', 'coin', 'coin', 'coin.atlas', 1, true),
	spine('anim_barrel', 'barrelWild', 'barrel', 'barrel', 'barrel.atlas', 1, true),
	spine('anim_trees', 'jungleTrees', 'tree', 'tree', 'tree.atlas', 1, true),
	spine('anim_bush', 'jungleBush', 'bush', 'bush', 'bush.atlas', 1, true),
	spine('anim_anticipation', 'anticipation', 'anticipation', 'anticipation'),
	sprite('fx_sparkle', 'sparkleFx', 'sprites/fx/sparkle.png'),
	sprites(
		'ui_press_to_continue',
		'pressToContinueText',
		'sprites/pressToContinueText/MM_pressanywhere.json',
		true,
	),
	sprites('ui_reels_frame', 'reelsFrame', 'sprites/reelsFrame/reels_frame.json'),
	sprite('ui_pay_frame', 'payFrame', 'sprites/payFrame/payFrame.png'),
	sprites('ui_progress_sheet', 'progressBar', 'sprites/progressBar/progressBar.json', true),
	sprites('ui_symbols_static', 'symbolsStatic', 'sprites/symbolsStatic/symbolsStatic.json', true),
	sprites('ui_free_spins', 'freeSpins', 'sprites/freeSpins/freeSpins.json'),
	{
		key: 'anim_coins',
		runtimeKey: 'coins',
		type: 'spriteSheet',
		src: '/assets/sprites/coin/SD2_Coin.json',
		fallback: 'spritesheet',
	},

	// Bitmap and UI fonts
	bitmapFont('font_gold', 'goldFont', 'fonts/goldFont/mm_gold.xml'),
	bitmapFont('font_gold_blur', 'goldBlur', 'fonts/goldBlur/miningfont_gold_blur.xml'),
	bitmapFont('font_silver', 'silverFont', 'fonts/silverFont/mm_silver.xml'),
	bitmapFont('font_purple', 'purpleFont', 'fonts/purpleFont/mm_purple.xml'),
	cssFont('font_inter', 'Inter-Variable.ttf', 'Inter', '100 900', 'truetype', 'font/ttf'),
	cssFont('font_fredoka', 'Fredoka-Variable.ttf', 'Fredoka', '300 900', 'truetype', 'font/ttf'),
	cssFont(
		'font_fredoka_one',
		'FredokaOne-Regular.ttf',
		'Fredoka One',
		'400',
		'truetype',
		'font/ttf',
	),
	cssFont('font_lilita', 'LilitaOne-Regular.ttf', 'Lilita One', '400', 'truetype', 'font/ttf'),
	cssFont('font_rubik_semibold', 'Rubik-SemiBold.woff2', 'Rubik', '600', 'woff2', 'font/woff2'),
	cssFont('font_rubik_bold', 'Rubik-Bold.woff2', 'Rubik', '700', 'woff2', 'font/woff2'),

	// Playfield chrome
	ui('ui_bonus_button', 'bonus_button', 'bonus_button.png', true),
	ui('ui_spin', 'btn_spin', 'btn_spin.png', true),
	ui('ui_autospin', 'btn_autospin', 'btn_autospin.png', true),
	ui('ui_turbo', 'btn_turbo', 'btn_turbo.png', true),
	ui('ui_disable', 'btn_disable', 'btn_disable.png', true),
	ui('ui_progress_bar', 'progress_bar', 'progress_bar.png', true),
	ui('ui_progress_fill', 'progress_bar_fill', 'progress_bar_fill.png', true),
	ui('ui_total_win_1', 'label_total_win_tier1', 'label_total_win_tier1.png'),
	ui('ui_total_win_2', 'label_total_win_tier2', 'label_total_win_tier2.png'),
	ui('ui_total_win_3', 'label_total_win_tier3', 'label_total_win_tier3.png'),
	{
		key: 'ui_summit_sound',
		type: 'sprite',
		src: '/assets/monkey/ui/summit/sound.svg',
		fallback: 'texture',
	},
	{
		key: 'ui_summit_music',
		type: 'sprite',
		src: '/assets/monkey/ui/summit/music.svg',
		fallback: 'texture',
	},

	// Shared buy-screen chrome (Gaia UI kit, still swapped from this file)
	gg('ui_gg_logo', 'ggUiLogo', 'logo.svg'),
	gg('ui_gg_panel_info', 'ggUiPanelInfo', 'panel-info.svg'),
	gg('ui_gg_panel_bet', 'ggUiPanelBet', 'panel-bet.svg'),
	gg('ui_gg_spin', 'ggUiSpin', 'spin.svg'),
	gg('ui_gg_stop', 'ggUiStop', 'stop.svg'),
	gg('ui_gg_panel_bonus', 'ggUiPanelBonus', 'panel-bonus.svg'),
	gg('ui_gg_menu_large', 'ggUiIconMenuLarge', 'icon-menu-large.svg'),
	gg('ui_gg_turbo_large', 'ggUiIconTurboLarge', 'icon-turbo-large.svg'),
	gg('ui_gg_mobile_logo', 'ggUiMobileLogo', 'mobile-logo.svg'),
	gg('ui_gg_mobile_panel', 'ggUiMobilePanel', 'mobile-panel.svg'),
	gg('ui_gg_mobile_menu', 'ggUiMobileMenu', 'mobile-menu.svg'),
	gg('ui_gg_mobile_spin', 'ggUiMobileSpin', 'mobile-spin.svg'),
	gg('ui_gg_mobile_panel_bonus', 'ggUiMobilePanelBonus', 'mobile-panel-bonus.svg'),
	gg('ui_gg_menu', 'ggUiIconMenu', 'icon-menu.svg'),
	gg('ui_gg_bet_up', 'ggUiIconBetUp', 'icon-bet-up.svg'),
	gg('ui_gg_bet_down', 'ggUiIconBetDown', 'icon-bet-down.svg'),
	gg('ui_gg_auto', 'ggUiIconAuto', 'icon-auto.svg'),
	gg('ui_gg_turbo', 'ggUiIconTurbo', 'icon-turbo.svg'),
	gg('ui_gg_music', 'ggUiIconMusic', 'icon-music.svg'),
	gg('ui_gg_music_off', 'ggUiIconMusicOff', 'icon-music-off.svg'),
	gg('ui_gg_sound', 'ggUiIconSound', 'icon-sound.svg'),
	gg('ui_gg_sound_off', 'ggUiIconSoundOff', 'icon-sound-off.svg'),
	gg('ui_gg_info', 'ggUiIconInfo', 'icon-info.svg'),
	gg('ui_gg_infinity', 'ggUiIconInfinity', 'icon-infinity.svg'),
	gg('ui_gg_close', 'ggUiIconClose', 'icon-close.webp'),
	gg('ui_gg_bolt', 'ggUiIconBolt', 'icon-bolt.webp'),
	gg('ui_gg_step', 'ggBonusBuyStep', 'step.webp'),
	gg('bg_lobby', 'ggBgDesktopLobby', 'bg-desktop-lobby.png'),
	gg('bg_feature', 'ggBgDesktopFeature', 'bg-desktop-feature.png'),
	gg('bg_peak', 'ggBgDesktopPeak', 'bg-desktop-peak.png'),
	gg('bg_confirm_lobby', 'ggBgConfirmLobby', 'bg-confirm-lobby.png'),
	gg('bg_confirm_feature', 'ggBgConfirmFeature', 'bg-confirm-feature.png'),
	gg('bg_confirm_peak', 'ggBgConfirmPeak', 'bg-confirm-peak.png'),
	gg('bg_confirm_see', 'ggBgConfirmSee', 'bg-confirm-see.png'),
	gg('bg_confirm_hear', 'ggBgConfirmHear', 'bg-confirm-hear.png'),
	gg('bg_confirm_pick', 'ggBgConfirmGamble', 'bg-confirm-gamble.png'),
	gg('bg_lobby_mobile', 'ggBgMobileLobby', 'bg-mobile-lobby.png'),
	gg('bg_feature_mobile', 'ggBgMobileFeature', 'bg-mobile-feature.png'),
	gg('bg_peak_mobile', 'ggBgMobilePeak', 'bg-mobile-peak.png'),

	// Sound pack, cues, and standalone music
	{
		key: 'sfx_sprite',
		runtimeKey: 'sound',
		type: 'audio',
		src: SFX_PACK,
		preload: true,
		fallback: 'audio',
	},
	musicFile('music_base', 'bgm_main.mp3?v=tropical-morning'),
	musicFile('music_feature_spin', 'bgm_feature_spin.mp3?v=birds-lobby'),
	musicFile('music_win_max', 'bgm_winlevel_max.mp3'),
	{
		key: 'sfx_coin_tick',
		type: 'sfx',
		src: '/assets/audio/coin_tick.wav',
		fallback: 'audio',
	},
	cue('music_freespin', 'bgm_freespin'),
	cue('music_pack_main', 'bgm_main'),
	cue('music_win_big', 'bgm_winlevel_big'),
	cue('music_win_epic', 'bgm_winlevel_epic'),
	cue('music_win_max_bed', 'bgm_winlevel_max'),
	cue('music_win_mega', 'bgm_winlevel_mega'),
	cue('music_win_super', 'bgm_winlevel_superwin'),
	cue('jng_intro_fs'),
	cue('sfx_anticipation'),
	cue('sfx_anticipation_start'),
	cue('sfx_bigwin_coinloop'),
	cue('sfx_btn_general'),
	cue('sfx_btn_spin'),
	cue('sfx_fs_respins'),
	cue('sfx_multiplier_combine_a'),
	cue('sfx_multiplier_combine_b'),
	cue('sfx_multiplier_explosion_a'),
	cue('sfx_multiplier_explosion_b'),
	cue('sfx_multiplier_explosion_c'),
	cue('sfx_multiplier_landing'),
	cue('sfx_multiplier_reset'),
	cue('sfx_multiplier_up'),
	cue('sfx_multiplier_update'),
	cue('sfx_multiplier_win'),
	cue('sfx_reel_stop_1'),
	cue('sfx_reel_stop_2'),
	cue('sfx_reel_stop_3'),
	cue('sfx_reel_stop_4'),
	cue('sfx_reel_stop_5'),
	cue('sfx_royals_landing'),
	cue('sfx_scatter_reveal'),
	cue('sfx_scatter_stop_1'),
	cue('sfx_scatter_stop_2'),
	cue('sfx_scatter_stop_3'),
	cue('sfx_scatter_stop_4'),
	cue('sfx_scatter_stop_5'),
	cue('sfx_scatter_win'),
	cue('sfx_scatter_win_v2'),
	cue('sfx_superfreespin'),
	cue('sfx_symbols_landing'),
	cue('sfx_wild_explode'),
	cue('sfx_winlevel_end'),
	cue('sfx_winlevel_nice'),
	cue('sfx_winlevel_small'),
	cue('sfx_winlevel_standard'),
	cue('sfx_winlevel_substantial'),
	cue('sfx_youwon_panel'),
	cue('tumble_win_1'),
	cue('tumble_win_2'),
	cue('tumble_win_3'),
	cue('tumble_win_4'),
	cue('tumble_win_5'),
];

const byKey = new Map(KONG_ASSET_MANIFEST.map((entry) => [entry.key, entry]));

export const entryByKey = (key: string): ManifestEntry => {
	const entry = byKey.get(key);
	if (!entry) throw new Error(`Unknown Kong Club asset "${key}"`);
	return entry;
};

/** True when the page was opened with `?assetPlaceholders=1`. */
export const useAssetPlaceholders = (): boolean => {
	if (typeof window === 'undefined') return false;
	const query = new URLSearchParams(window.location.search);
	return query.has('assetPlaceholders') || query.get('assets') === 'placeholders';
};

export const fallbackSrc = (entry: ManifestEntry): string | SpineSrc => {
	switch (entry.fallback) {
		case 'texture':
			return PLACEHOLDER.texture;
		case 'spritesheet':
			return PLACEHOLDER.spritesheet;
		case 'spine':
			return PLACEHOLDER.spine;
		case 'bitmapFont':
			return PLACEHOLDER.bitmapFont;
		case 'audio':
			return typeof entry.src === 'string' && !entry.src.includes('.json')
				? PLACEHOLDER.silent
				: PLACEHOLDER.audio;
		case 'cssFont':
			return '';
		default: {
			const never: never = entry.fallback;
			return never;
		}
	}
};

/** Path the loader should request for this entry. */
export const resolvedSrc = (
	entry: ManifestEntry,
	placeholders = useAssetPlaceholders(),
): string | SpineSrc =>
	placeholders && entry.fallback !== 'cssFont' ? fallbackSrc(entry) : entry.src;

/** File path for a logical key. Spine entries resolve to the skeleton file. */
export const logicalPath = (key: string, placeholders = false): string => {
	const src = placeholders ? fallbackSrc(entryByKey(key)) : entryByKey(key).src;
	if (typeof src === 'string') return src;
	return src.skeleton;
};

export type PixiAssetRecord = {
	type: 'sprite' | 'sprites' | 'spine' | 'font' | 'spriteSheet' | 'audio';
	src: string | SpineSrc;
	preload?: boolean;
	fallbackSrc: string | SpineSrc;
};

const PIXI_TYPES = new Set(['sprite', 'sprites', 'spine', 'font', 'spriteSheet', 'audio']);

/** Pixi manifest. Runtime keys stay stable so existing sprite `key` props keep working. */
export const buildPixiAssets = (options?: {
	placeholders?: boolean;
}): Record<string, PixiAssetRecord> => {
	const placeholders = options?.placeholders ?? useAssetPlaceholders();
	const out: Record<string, PixiAssetRecord> = {};
	for (const entry of KONG_ASSET_MANIFEST) {
		if (!entry.runtimeKey || !PIXI_TYPES.has(entry.type)) continue;
		const src = resolvedSrc(entry, placeholders);
		out[entry.runtimeKey] = {
			type: entry.type as PixiAssetRecord['type'],
			src,
			...(entry.preload ? { preload: true } : {}),
			fallbackSrc: fallbackSrc(entry),
		};
	}
	return out;
};

export const cssFontEntries = (): ManifestEntry[] =>
	KONG_ASSET_MANIFEST.filter((entry) => entry.type === 'cssFont');
