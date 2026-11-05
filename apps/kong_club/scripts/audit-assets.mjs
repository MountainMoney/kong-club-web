import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const staticRoot = path.join(appRoot, 'static/assets');
const staticDir = path.join(appRoot, 'static');

const symbols = [
	'LE', 'CO', 'OR', 'GR', 'BA', 'T', 'J', 'Q', 'K', 'A', 'CB', 'CS', 'CG',
	'XM', 'XM_hollow', 'XM_green', 'XM_yellow', 'XM_red', 'CL', 'CL_empty',
	'W', 'EXPLODED_W', 'ST',
];

const checks = [
	'sprites/monkeySymbols/LE.png',
	'sprites/background/jungle_bg.png',
	'sprites/reelFrame/board.png',
	'sprites/reelFrame/border.png',
	'sprites/mascot/monkey.png',
	'spines/mmMascot/MM_Mascot_2.atlas',
	'spines/mmMascot/MM_Mascot_2.json',
	'spines/mmMascot/MM_Mascot_2.png',
	'spines/treeSunny/tree.atlas',
	'spines/treeSunny/tree.json',
	'spines/treeSunny/tree.png',
	'spines/treeSunny/tree_2.png',
	'spines/treeSunny/tree_3.png',
	'spines/treeSunny/tree_4.png',
	'spines/treeSunny/tree_5.png',
	'spines/treeSunny/tree_6.png',
	'spines/treeMidnight/tree.atlas',
	'spines/treeMidnight/tree.json',
	'spines/treeMidnight/tree.png',
	'spines/treeMidnight/tree_2.png',
	'spines/treeMidnight/tree_3.png',
	'spines/treeMidnight/tree_4.png',
	'spines/treeMidnight/tree_5.png',
	'spines/treeMidnight/tree_6.png',
	'spines/bushSunny/bush.atlas',
	'spines/bushSunny/bush.json',
	'spines/bushSunny/bush.png',
	'spines/bushMidnight/bush.atlas',
	'spines/bushMidnight/bush.json',
	'spines/bushMidnight/bush.png',
	'monkey/ui/btn_spin.png',
	'monkey/ui/btn_autospin.png',
	'monkey/ui/btn_turbo.png',
	'monkey/ui/bonus_button.png',
	'monkey/ui/btn_disable.png',
	'monkey/ui/progress_bar.png',
	'monkey/ui/progress_bar_fill.png',
	'audio/sounds.json',
	'audio/bgm_main.mp3',
	'audio/bgm_feature_spin.mp3',
	'audio/bgm_winlevel_max.mp3',
];

const maxWinChecks = [
	'monkey/ui/win_popup_big.png',
	'monkey/ui/win_popup_super.png',
	'monkey/ui/win_popup_mega.png',
	'monkey/ui/win_popup_epic.png',
	'monkey/ui/intro_card_10000x.png',
];

const rootLoaderChecks = [
	{ full: path.join(staticDir, 'trifecta/loader.css'), label: 'static/trifecta/loader.css (app.html boot loader)' },
	{ full: path.join(staticDir, 'trifecta/loader.js'), label: 'static/trifecta/loader.js (app.html boot loader)' },
	{ full: path.join(staticDir, 'trifecta/script.js'), label: 'static/trifecta/script.js (app.html boot loader)' },
	{ full: path.join(staticDir, 'trifecta/triforce-svgrepo-com.svg'), label: 'static/trifecta/triforce-svgrepo-com.svg (app.html boot loader)' },
	{ full: path.join(staticDir, 'trifecta/assets/unbounded-800.woff2'), label: 'static/trifecta/assets/unbounded-800.woff2 (app.html boot loader)' },
	{ full: path.join(staticDir, 'trifecta/assets/wave-start.wav'), label: 'static/trifecta/assets/wave-start.wav (app.html boot loader)' },
	{ full: path.join(staticDir, 'trifecta/assets/wave-logo.wav'), label: 'static/trifecta/assets/wave-logo.wav (app.html boot loader)' },
	{ full: path.join(staticDir, 'trifecta/vendor/xmb/spline.js'), label: 'static/trifecta/vendor/xmb/spline.js (app.html boot loader)' },
	{ full: path.join(staticDir, 'trifecta/vendor/xmb/spline-reverse.js'), label: 'static/trifecta/vendor/xmb/spline-reverse.js (app.html boot loader)' },
	{ full: path.join(staticDir, 'stake-engine-loader.gif'), label: 'static/stake-engine-loader.gif (StakeGameRoot)' },
];

const reelFrameChecks = [
	'sprites/reelFrame/board.png',
	'sprites/reelFrame/border.png',
];

const spriteAtlasChecks = [
	'sprites/freeSpins/freeSpins.json',
	'sprites/winSmall/MM_Localisation_winsmall.json',
];

const freeSpinLocaleFrames = [
	'freespins.png',
	'totalwin.png',
	'freespins_ar.png',
	'freespins_de.png',
	'freespins_en.png',
	'freespins_es.png',
	'freespins_fi.png',
	'freespins_fr.png',
	'freespins_hi.png',
	'freespins_id.png',
	'freespins_ja.png',
	'freespins_ko.png',
	'freespins_pl.png',
	'freespins_pt.png',
	'freespins_ru.png',
	'freespins_tr.png',
	'freespins_vi.png',
	'freespins_zh.png',
];

const winSmallLocaleFrames = [
	'winsmall_totalwin.png',
	'winsmall_ar.png',
	'winsmall_de.png',
	'winsmall_en.png',
	'winsmall_es.png',
	'winsmall_fi.png',
	'winsmall_fr.png',
	'winsmall_hi.png',
	'winsmall_id.png',
	'winsmall_ja.png',
	'winsmall_ko.png',
	'winsmall_pl.png',
	'winsmall_pt.png',
	'winsmall_ru.png',
	'winsmall_tr.png',
	'winsmall_vi.png',
	'winsmall_zh.png',
];

let missing = 0;

const reportMissing = (label) => {
	console.error('MISSING:', label);
	missing++;
};

const checkExists = (full, label) => {
	if (!fs.existsSync(full)) reportMissing(label);
};

for (const rel of [...checks, ...maxWinChecks, ...reelFrameChecks]) {
	checkExists(path.join(staticRoot, rel), rel);
}

for (const { full, label } of rootLoaderChecks) {
	checkExists(full, label);
}

for (const sym of symbols) {
	const rel = `sprites/monkeySymbols/${sym}.png`;
	checkExists(path.join(staticRoot, rel), rel);
}

const checkSpriteAtlas = (jsonRel, requiredFrames) => {
	const jsonPath = path.join(staticRoot, jsonRel);
	if (!fs.existsSync(jsonPath)) return;

	let data;
	try {
		data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
	} catch {
		console.error('INVALID JSON:', jsonRel);
		missing++;
		return;
	}

	const image = data.meta?.image;
	if (!image) {
		reportMissing(`${jsonRel} meta.image`);
	} else {
		const imageRel = path.join(path.dirname(jsonRel), image).replace(/\\/g, '/');
		checkExists(path.join(staticRoot, imageRel), imageRel);
	}

	for (const frame of requiredFrames) {
		if (!data.frames?.[frame]) {
			reportMissing(`${jsonRel} frame "${frame}"`);
		}
	}
};

for (const jsonRel of spriteAtlasChecks) {
	checkSpriteAtlas(jsonRel, jsonRel.includes('freeSpins') ? freeSpinLocaleFrames : winSmallLocaleFrames);
}

const appHtmlPath = path.join(appRoot, 'src/app.html');
if (fs.existsSync(appHtmlPath)) {
	const appHtml = fs.readFileSync(appHtmlPath, 'utf8');
	if (
		!appHtml.includes('trifecta/loader.css') ||
		!appHtml.includes('trifecta-site-loader') ||
		!appHtml.includes('trifecta/triforce-svgrepo-com.svg')
	) {
		reportMissing('src/app.html trifecta loader markup');
	}
	// Local @font-face only — Stake CSP blocks fonts.googleapis.com.
	if (!appHtml.includes('Fredoka') || !appHtml.includes('Fredoka-Variable.ttf')) {
		reportMissing('src/app.html local Fredoka @font-face (free-spin social labels)');
	}
} else {
	reportMissing('src/app.html');
}

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8]);

const pngOnly = [
	'sprites/background/jungle_bg.png',
	'sprites/reelFrame/board.png',
	'sprites/reelFrame/border.png',
	'sprites/mascot/monkey.png',
	'spines/treeSunny/tree.png',
	'spines/treeSunny/tree_2.png',
	'spines/treeSunny/tree_3.png',
	'spines/treeSunny/tree_4.png',
	'spines/treeSunny/tree_5.png',
	'spines/treeSunny/tree_6.png',
	'spines/treeMidnight/tree.png',
	'spines/treeMidnight/tree_2.png',
	'spines/treeMidnight/tree_3.png',
	'spines/treeMidnight/tree_4.png',
	'spines/treeMidnight/tree_5.png',
	'spines/treeMidnight/tree_6.png',
	'spines/bushSunny/bush.png',
	'spines/bushMidnight/bush.png',
	...symbols.map((sym) => `sprites/monkeySymbols/${sym}.png`),
	...maxWinChecks,
];

let badFormat = 0;
for (const rel of pngOnly) {
	const full = rel.startsWith('..') ? path.join(appRoot, rel) : path.join(staticRoot, rel);
	if (!fs.existsSync(full)) continue;
	const head = fs.readFileSync(full).subarray(0, 8);
	if (head.subarray(0, 8).equals(PNG_MAGIC)) continue;
	if (head.subarray(0, 2).equals(JPEG_MAGIC)) {
		console.error('JPEG masquerading as PNG (run scripts/process_png_assets.py):', rel);
		badFormat++;
	}
}

if (missing === 0 && badFormat === 0) {
	console.log('Asset audit OK — all checked files present.');
} else if (missing > 0) {
	console.error(`Asset audit FAILED — ${missing} missing file(s).`);
	process.exit(1);
} else {
	console.error(`Asset audit FAILED — ${badFormat} mislabeled JPEG PNG(s).`);
	process.exit(1);
}
