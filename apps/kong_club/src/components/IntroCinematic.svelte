<script lang="ts">
	/**
	 * Intro cinematic, ported 1:1 from Gaia's Grotto (live build, intro screen `tHe`,
	 * backdrop `nHe`, particles `fue`/`dD`, timelines `Cqe`/`Dce`/`Zqe`, CTA pulse `uN`,
	 * layouts `mm`/`P6e`). Same layering: backdrop (motes + foliage) → intro screen
	 * (cards → CTA → logo) → particles. Only art and copy are KC's.
	 *
	 * Flow (same as GG): Trifecta loader leaving → backdrop + camera zoom-in;
	 * loader gone → logo / cards / CTA timeline; click or Space → exit timeline.
	 * KC contract kept: `onleavestart` on click, `oncontinue` 560ms later.
	 */
	import * as PIXI from 'pixi.js';
	import { onMount } from 'svelte';

	import { getContext } from '../game/context';
	import { assetUrl } from '../game/assetUrl';
	import { usePortraitDesignSpace } from '../game/desktopLayout';
	import { ensureFredokaOneFont } from '../game/introFont';
	import { getMonkeyMascotLayout, getMonkeyUnifiedFrameLayout } from '../game/kongClubLayout';
	import { DropShadowFilter } from 'pixi-filters';
	import {
		BACKDROP,
		CAMERA,
		CARD_BOX,
		CARDS,
		CONTINUE_MS,
		CTA,
		CTA_START_MS,
		DESIGN,
		ENTER,
		INTRO_START_DELAY_MS,
		EXIT,
		GG_LOGO,
		HOVER,
		LAYOUT_DESKTOP,
		LAYOUT_PORTRAIT,
		LOGO,
		backOut,
		cardDustPoses,
		cardPose,
		clamp01,
		easeInOutCubic,
		easeOutCubic,
		enterPose,
		exitPose,
		hash01,
		lerp,
		logoPose,
		postsLandMs,
		progress,
		pulseAt,
		signLandMs,
		thudY,
	} from '../game/introCinematic';
	import { INTRO_DIM, introBackgroundBlur, stateIntroCinematic } from '../game/introCinematicState.svelte';
	import { playIntroSfx, preloadIntroSfx } from '../game/introSfx';
	import GgFoliage from './GgFoliage.svelte';
	import IntroNode from './IntroNode.svelte';

	type Props = {
		onleavestart?: () => void;
		oncontinue: () => void;
		/** Exit animations finished; unmount. */
		ondone?: () => void;
	};
	const props: Props = $props();

	const LEAVE_MS = 560; // KC OpeningSplash SPLASH_LEAVE_MS
	/** GG unmounts its backdrop when the entrance is posed [Xqe] (HUD 600+250+440). */
	const POSED_MS = 1290;
	const DT_CAP = 250;

	const context = getContext();

	// ── art: KC cards split into GG's posts / sign / text layers ───────────
	const CARD_KEYS = ['coins', 'maxwin', 'mystery'] as const;
	/** Fractions of each card (cards_meta.json from build_cards.py). */
	const CARD_META = {
		coins: { aspect: 0.731041, sign: [0.150129, 0.128121, 0.859536, 0.473387], text: [0.221005, 0.558643, 0.775129, 0.796985] },
		maxwin: { aspect: 0.729069, sign: [0.150323, 0.129821, 0.860645, 0.4746], text: [0.189032, 0.541392, 0.803871, 0.849012] },
		mystery: { aspect: 0.730697, sign: [0.150129, 0.129473, 0.859536, 0.474576], text: [0.171392, 0.563089, 0.832474, 0.775424] },
	} as const;
	/** KC title_art: square plate, wordmark bbox (texture px) — anchors the logo like GG's `logo`. */
	const TITLE_BBOX = { x0: 196, y0: 391, x1: 1212, y1: 968 };
	const TITLE_TEX = { w: 1408, h: 1408 }; // title_art.png
	const TITLE_ANCHOR = {
		x: (TITLE_BBOX.x0 + TITLE_BBOX.x1) / 2 / TITLE_TEX.w,
		y: (TITLE_BBOX.y0 + TITLE_BBOX.y1) / 2 / TITLE_TEX.h,
	};
	const TITLE_W = TITLE_BBOX.x1 - TITLE_BBOX.x0;
	const TITLE_H = TITLE_BBOX.y1 - TITLE_BBOX.y0;
	/** GG logo scale s ⇒ width kd·s; KC logo matches that width. */
	const LOGO_TEX_SCALE = GG_LOGO.w / TITLE_W;
	/** KC wordmark height at GG's logo width (GG pg = 204.125). */
	const LOGO_H = (GG_LOGO.w * TITLE_H) / TITLE_W;

	// Card-local geometry (GG Q0 box: 421.2 × 554.4, origin at centre).
	const U = CARD_BOX.h / 2; // GG `u`
	const cardGeo = CARD_KEYS.map((k) => {
		const m = CARD_META[k];
		const h = CARD_BOX.h;
		const w = h * m.aspect;
		const fx = (f: number) => (f - 0.5) * w;
		const fy = (f: number) => (f - 0.5) * h;
		const sign = { x: fx((m.sign[0] + m.sign[2]) / 2), y: fy((m.sign[1] + m.sign[3]) / 2), w: (m.sign[2] - m.sign[0]) * w, h: (m.sign[3] - m.sign[1]) * h };
		const text = { x: fx((m.text[0] + m.text[2]) / 2), y: fy((m.text[1] + m.text[3]) / 2), w: (m.text[2] - m.text[0]) * w, h: (m.text[3] - m.text[1]) * h };
		// GG hangs the sign from q2e (1.7, −165.6): 43.3% down its 437.5px sign.
		const pivot = { x: sign.x, y: sign.y - sign.h / 2 + sign.h * 0.433 };
		return { w, h, sign, text, pivot };
	});

	// ── loader → backdrop → intro phases (GG: loading → start → entering) ──
	let backdropOn = $state(false); // GG nHe mounted (loader leaving)
	let introOn = $state(false); // GG phase "start"
	let exiting = $state(false); // GG phase "entering"
	let assetsReady = $state(false);
	let fontReady = $state(false);

	const loaderEl = () => document.getElementById('trifecta-site-loader');
	const loaderLeaving = () => {
		const el = loaderEl();
		return !el || el.classList.contains('is-complete');
	};
	const loaderGone = () => !loaderEl();

	// ── pixi tree ───────────────────────────────────────────────────────────
	const back = new PIXI.Container(); // canvas space: glow + motes (under foliage)
	back.eventMode = 'none';
	const front = new PIXI.Container(); // canvas space: holds design-space stage
	const stage = new PIXI.Container(); // GG Or: design space, contain-fit, centred
	/** Ryan: vignette over the cinematic (canvas space, above foliage, under the cards). */
	const vignette = new PIXI.Sprite(makeVignetteTexture());
	vignette.eventMode = 'none';
	vignette.visible = false;
	front.addChild(vignette, stage);
	function makeVignetteTexture() {
		const size = 512;
		const cv = document.createElement('canvas');
		cv.width = size;
		cv.height = size;
		const g = cv.getContext('2d')!;
		const grad = g.createRadialGradient(size / 2, size / 2, size * 0.22, size / 2, size / 2, size * 0.72);
		grad.addColorStop(0, 'rgba(0,0,0,0)');
		grad.addColorStop(0.55, 'rgba(0,0,0,0.35)');
		grad.addColorStop(1, 'rgba(0,0,0,1)');
		g.fillStyle = grad;
		g.fillRect(0, 0, size, size);
		return PIXI.Texture.from(cv);
	}
	const screen = new PIXI.Container(); // GG intro screen (thud y, hit area)
	const cardsLayer = new PIXI.Container();
	cardsLayer.sortableChildren = true;
	const ctaC = new PIXI.Container();
	const logoC = new PIXI.Container();
	const particlesC = new PIXI.Container();
	particlesC.eventMode = 'none';
	screen.addChild(cardsLayer, ctaC, logoC);
	stage.addChild(screen, particlesC);
	screen.visible = false;

	const logoSprite = new PIXI.Sprite({ texture: PIXI.Texture.EMPTY, anchor: TITLE_ANCHOR });
	// Same drop shadow as PlayfieldTitle so the hand-over is seamless.
	logoSprite.filters = [new DropShadowFilter({ color: 0x000000, alpha: 0.28, blur: 3, offset: { x: 2, y: 3 }, quality: 3 })];
	logoC.addChild(logoSprite);

	let ctaText: PIXI.Text | null = null;

	type CardNodes = {
		root: PIXI.Container;
		posts: PIXI.Container;
		postsSprite: PIXI.Sprite;
		textC: PIXI.Container;
		textSprite: PIXI.Sprite;
		signC: PIXI.Container;
		signSprite: PIXI.Sprite;
		dustC: PIXI.Container;
		dust: PIXI.Sprite[];
		hover: { from: number; to: number; at: number; dur: number };
		wobbleAt: number;
	};
	const cards: CardNodes[] = CARD_KEYS.map((_, i) => {
		const g = cardGeo[i];
		const root = new PIXI.Container();
		root.hitArea = new PIXI.Rectangle(-CARD_BOX.w / 2, -CARD_BOX.h / 2, CARD_BOX.w, CARD_BOX.h);
		root.cursor = 'pointer';
		const posts = new PIXI.Container();
		const postsSprite = new PIXI.Sprite({ texture: PIXI.Texture.EMPTY, anchor: 0.5 });
		postsSprite.y = -U;
		const textC = new PIXI.Container();
		const textSprite = new PIXI.Sprite({ texture: PIXI.Texture.EMPTY, anchor: 0.5 });
		textSprite.position.set(g.text.x, g.text.y - U); // posts container origin is the card foot
		textC.addChild(textSprite);
		posts.addChild(postsSprite, textC);
		const signC = new PIXI.Container();
		const signSprite = new PIXI.Sprite({ texture: PIXI.Texture.EMPTY, anchor: 0.5 });
		signSprite.position.set(g.sign.x - g.pivot.x, g.sign.y - g.pivot.y);
		signC.addChild(signSprite);
		root.addChild(posts, signC);
		const dustC = new PIXI.Container();
		dustC.eventMode = 'none';
		const dust = Array.from({ length: CARDS.dust.puffs }, () => {
			const s = new PIXI.Sprite({ texture: PIXI.Texture.EMPTY, anchor: 0.5, tint: 15783600 });
			s.visible = false;
			dustC.addChild(s);
			return s;
		});
		cardsLayer.addChild(root, dustC);
		return { root, posts, postsSprite, textC, textSprite, signC, signSprite, dustC, dust, hover: { from: 0, to: 0, at: 0, dur: 0 }, wobbleAt: -1 };
	});

	// ── particles: GG pool `dD` + spawners `hm` (nuggets), `fD` (glint), `pqe` (grit) ──
	type Fx = { nugget: PIXI.Texture[]; dust: PIXI.Texture; glint: PIXI.Texture; mote: PIXI.Texture };
	let fx: Fx | null = null;
	type Particle = {
		sprite: PIXI.Sprite; x: number; y: number; vx: number; vy: number; gravity: number; drag: number;
		size: number; grow: number; curve: 'pop' | 'fade'; alpha: number; lifeMs: number; ageMs: number;
		spin: number; rotation: number; floorY?: number; bounced: boolean;
	};
	const live: Particle[] = [];
	const freeSprites: PIXI.Sprite[] = [];
	const CAPACITY = 160;
	const rand = (a: number, b: number) => a + Math.random() * (b - a);
	const poseParticle = (p: Particle) => {
		const d = Math.min(1, p.ageMs / p.lifeMs);
		const m = p.curve === 'pop' ? Math.sin(Math.PI * d) : 1;
		const g = p.size * (1 + (p.grow - 1) * d) * m;
		const t = p.sprite.texture;
		p.sprite.scale.set(g / Math.max(t.width, t.height, 1));
		p.sprite.position.set(p.x, p.y);
		p.sprite.rotation = p.rotation;
		const b = p.curve === 'pop' || d < 0.6 ? 1 : 1 - (d - 0.6) / 0.4;
		p.sprite.alpha = p.alpha * b;
	};
	const spawn = (o: Omit<Particle, 'sprite' | 'ageMs' | 'bounced'> & { texture: PIXI.Texture; tint: number; additive: boolean }) => {
		let s = freeSprites.pop();
		if (!s) {
			if (live.length >= CAPACITY) return;
			s = new PIXI.Sprite({ anchor: 0.5 });
			particlesC.addChild(s);
		}
		s.texture = o.texture;
		s.tint = o.tint;
		s.blendMode = o.additive ? 'add' : 'normal';
		s.visible = true;
		const { texture: _t, tint: _n, additive: _a, ...rest } = o;
		const p: Particle = { ...rest, sprite: s, ageMs: 0, bounced: false };
		live.push(p);
		poseParticle(p);
	};
	const stepParticles = (dt: number) => {
		for (let d = live.length - 1; d >= 0; d -= 1) {
			const f = live[d];
			f.ageMs += dt;
			if (f.ageMs >= f.lifeMs) {
				f.sprite.visible = false;
				freeSprites.push(f.sprite);
				live.splice(d, 1);
				continue;
			}
			const m = Math.pow(f.drag, dt / 1000);
			f.vx *= m;
			f.vy = f.vy * m + f.gravity * dt;
			f.x += f.vx * dt;
			f.y += f.vy * dt;
			f.rotation += f.spin * dt;
			if (f.floorY !== undefined && !f.bounced && f.vy > 0 && f.y >= f.floorY) {
				f.bounced = true;
				f.y = f.floorY;
				f.vy *= -0.32;
				f.vx *= 0.55;
				f.spin *= 0.5;
			}
			poseParticle(f);
		}
	};
	const nuggets = (
		at: { x: number; y: number },
		e: { count: number; speed: number; angle: number; spread: number; size: { min: number; max: number }; lifeMs: number; widthPx?: number; floorY?: number; scale?: number },
	) => {
		if (!fx) return;
		const r = e.scale ?? 1;
		for (let s = 0; s < e.count; s += 1) {
			const i = e.angle + rand(-e.spread, e.spread);
			const a = rand(0.35, 1) * e.speed * r;
			spawn({
				texture: fx.nugget[Math.floor(Math.random() * fx.nugget.length)],
				x: at.x + rand(-1, 1) * (e.widthPx ?? 0) * r,
				y: at.y,
				vx: Math.cos(i) * a,
				vy: Math.sin(i) * a,
				gravity: 0.0021 * r,
				drag: 0.6,
				size: rand(e.size.min, e.size.max) * r,
				grow: 1,
				curve: 'fade',
				alpha: 1,
				lifeMs: e.lifeMs * rand(0.8, 1.15),
				spin: rand(-0.012, 0.012),
				rotation: rand(0, Math.PI * 2),
				tint: 0xffffff,
				additive: false,
				floorY: e.floorY,
			});
		}
	};
	const glint = (at: { x: number; y: number }, size: number, lifeMs: number) => {
		if (!fx) return;
		spawn({
			texture: fx.glint, x: at.x, y: at.y, vx: 0, vy: 0, gravity: 0, drag: 1, size, grow: 1,
			curve: 'pop', alpha: 1, lifeMs, spin: 0.0016, rotation: rand(-0.3, 0.3), tint: 16774084, additive: true,
		});
	};
	const grit = (at: { x: number; y: number }, count: number, tint: number) => {
		if (!fx) return;
		for (let s = 0; s < count; s += 1)
			spawn({
				texture: fx.mote, x: at.x + rand(-14, 14), y: at.y + rand(-6, 6), vx: rand(-0.02, 0.02), vy: rand(0, 0.05),
				gravity: 0.0016, drag: 0.8, size: rand(4, 9), grow: 1, curve: 'fade', alpha: rand(0.7, 1),
				lifeMs: rand(900, 1400), spin: 0, rotation: 0, tint, additive: false,
			});
	};

	// ── backdrop: GG warm glow + motes [nHe] ───────────────────────────────
	const WARM = { x: 520, y: 640, width: 1300, height: 900, color: 16753992, alpha: 0.1, periodMs: 5300 };
	const warmGlow = new PIXI.Sprite({ texture: PIXI.Texture.EMPTY, anchor: 0.5, tint: WARM.color, blendMode: 'add' });
	const motesC = new PIXI.Container();
	back.addChild(warmGlow, motesC);
	const M = BACKDROP.motes;
	const motes = Array.from({ length: M.count }, (_, T) => {
		const near = T < M.near;
		const R = T * 7.13 + 1;
		const sprite = new PIXI.Sprite({ texture: PIXI.Texture.EMPTY, anchor: 0.5, tint: M.tint, blendMode: 'add' });
		motesC.addChild(sprite);
		return {
			sprite, near, x: hash01(R), y: hash01(R + 1),
			size: near ? lerp(M.nearSize.min, M.nearSize.max, hash01(R + 2)) : lerp(M.size.min, M.size.max, hash01(R + 2)),
			rise: lerp(M.rise.min, M.rise.max, hash01(R + 3)) * (near ? 1.8 : 1),
			swayMs: lerp(M.sway.periodMs.min, M.sway.periodMs.max, hash01(R + 4)),
			phase: hash01(R + 5) * Math.PI * 2,
			alpha: near ? M.nearAlpha : lerp(M.alpha.min, M.alpha.max, hash01(R + 6)),
			twinkle: lerp(M.twinkleHz.min, M.twinkleHz.max, hash01(R + 7)),
		};
	});
	back.visible = false;

	// ── camera [ja] ─────────────────────────────────────────────────────────
	type Tw = { from: number; to: number; at: number; dur: number; ease: (t: number) => number };
	let camera: Tw = { from: 1, to: 1, at: 0, dur: 0, ease: easeOutCubic };
	let clock = 0; // ms since component mount (ticker time)
	const cameraNow = () => lerp(camera.from, camera.to, camera.ease(progress(clock, camera.at, camera.dur)));
	const cameraTo = (to: number, dur: number, ease: Tw['ease']) => {
		camera = { from: cameraNow(), to, at: clock, dur, ease };
	};
	let foliageZoom = $state(1);

	// ── layout ──────────────────────────────────────────────────────────────
	const canvas = () => context.stateLayoutDerived.canvasSizes();
	const isPortrait = () => {
		const c = canvas();
		return usePortraitDesignSpace(c.width, c.height);
	};
	const layout = () => (isPortrait() ? LAYOUT_PORTRAIT : LAYOUT_DESKTOP);
	const stageFit = () => {
		const c = canvas();
		const d = isPortrait() ? DESIGN.portrait : DESIGN.desktop;
		const s = Math.min(c.width / d.width, c.height / d.height);
		return { s, x: (c.width - d.width * s) / 2, y: (c.height - d.height * s) / 2, d };
	};
	/**
	 * Entrance geometry in main-layout px (GG $qe drop distance, Jqe hop distance).
	 * Board: lifted until its bottom clears the canvas top by GG's marginPx.
	 * Monkey: starts just past the canvas right edge (GG: box right − hero x + half width).
	 */
	const entranceGeometry = () => {
		const c = canvas();
		const main = context.stateLayoutDerived.mainLayout();
		const an = main.anchor as unknown as number | { x: number; y: number } | undefined;
		const ax = typeof an === 'number' ? an : (an?.x ?? 0);
		const ay = typeof an === 'number' ? an : (an?.y ?? 0);
		const toMainX = (cx: number) => ax * main.width + (cx - main.x) / main.scale;
		const toMainY = (cy: number) => ay * main.height + (cy - main.y) / main.scale;
		const board = context.stateGameDerived.boardLayout();
		const frame = getMonkeyUnifiedFrameLayout(board);
		const frameBottom = frame.y + frame.height * (1 - frame.anchor.y);
		const dropPx = Math.max(0, frameBottom - toMainY(0) + EXIT.board.marginPx);
		const mascot = getMonkeyMascotLayout(main, board, c);
		const hopX = Math.max(0, toMainX(c.width) - mascot.x + mascot.width / 2);
		// GG arc = Vc.hero.arc * heroScale (spine units). Measured frame-by-frame on the box at 1920x1080:
		// GG's peak lift is ~0.88x the hero's on-screen height, so scale the arc to the KC mascot the same way.
		const arc = EXIT.hero.arc * (mascot.height * GG_ARC_PER_HERO_HEIGHT);
		return { dropPx, hopX, arc, feet: { x: mascot.x, y: mascot.y } };
	};
	const GG_ARC_PER_HERO_HEIGHT = 0.88 / EXIT.hero.arc;
	let entrance = { dropPx: 0, hopX: 0, arc: 0, feet: { x: 0, y: 0 } };
	const applyEntrance = (n: number) => {
		const e = enterPose(n);
		stateIntroCinematic.uiAlpha = e.unblur;
		stateIntroCinematic.boardY = -entrance.dropPx * e.boardDrop;
		stateIntroCinematic.hero = {
			x: entrance.hopX * e.heroX,
			y: -entrance.arc * e.heroArc,
			sx: e.heroSquash.x,
			sy: e.heroSquash.y,
			px: entrance.feet.x,
			py: entrance.feet.y,
		};
	};
	const resetEntrance = () => {
		stateIntroCinematic.uiAlpha = 1;
		stateIntroCinematic.boardY = 0;
		stateIntroCinematic.hero = { x: 0, y: 0, sx: 1, sy: 1, px: 0, py: 0 };
		stateIntroCinematic.blur = 0;
		introBackgroundBlur.strength = 0;
	};

	// ── interaction [wf, Yr hotkey Space] ───────────────────────────────────
	let t = 0; // intro clock [tHe t]
	let n = 0; // exit clock [l6e elapsedMs]
	let leaveTimer: ReturnType<typeof setTimeout> | undefined;
	let pressed = false;
	const canContinue = () => introOn && !exiting && t >= CONTINUE_MS;
	const doContinue = () => {
		if (!canContinue()) return;
		exiting = true;
		n = 0;
		cameraTo(1, EXIT.cameraMs, easeInOutCubic); // GG _Ie(cameraMs)
		// Board / monkey start off screen, UI + logo transparent, before the playfield mounts.
		entrance = entranceGeometry();
		applyEntrance(0);
		playIntroSfx('intro_click');
		playIntroSfx('intro_whoosh'); // GG sfx_entrance_whoosh
		props.onleavestart?.();
		leaveTimer = setTimeout(() => props.oncontinue(), LEAVE_MS);
	};
	screen.on('pointerdown', () => (pressed = true));
	screen.on('pointerup', () => {
		if (pressed) {
			pressed = false;
			doContinue();
		}
	});
	screen.on('pointerupoutside', () => (pressed = false));
	cards.forEach((c, i) => {
		c.root.on('pointerover', () => {
			if (exiting) return;
			c.hover = { from: hoverValue(c), to: 1, at: clock, dur: HOVER.ms };
			c.wobbleAt = clock;
		});
		c.root.on('pointerout', () => {
			c.hover = { from: hoverValue(c), to: 0, at: clock, dur: HOVER.ms };
		});
	});
	function hoverValue(c: CardNodes) {
		return lerp(c.hover.from, c.hover.to, backOut(progress(clock, c.hover.at, c.hover.dur)));
	}
	const onKey = (e: KeyboardEvent) => {
		if (e.code !== 'Space' && e.key !== 'Enter') return;
		if (!canContinue()) return;
		e.preventDefault();
		e.stopImmediatePropagation();
		doContinue();
	};

	// ── per-frame ───────────────────────────────────────────────────────────
	let landed = false;
	const signFx = [false, false, false];
	const postsSfx = [false, false, false];
	let nextGlint = LOGO.dropMs + 300;
	let backTime = 0;
	let backFade = 1;
	let gritIn: number = BACKDROP.grit.everyMs.min;
	let done = false;
	let goneClock = -1;

	const frame = (rawDt: number) => {
		const dt = Math.min(rawDt, DT_CAP);
		clock += dt;
		const c = canvas();

		// Phase gates (GG: nHe mounts when the loader leaves; tHe at phase "start").
		const ready = context.stateApp.loaded && assetsReady && fontReady;
		if (!backdropOn && ready && loaderLeaving()) {
			backdropOn = true;
			back.visible = true;
			cameraTo(CAMERA.zoom, CAMERA.inMs, easeOutCubic); // GG yIe
		}
		if (backdropOn && !introOn && loaderGone() && goneClock < 0) goneClock = clock;
		if (backdropOn && !introOn && goneClock >= 0 && clock - goneClock >= INTRO_START_DELAY_MS) {
			introOn = true;
			screen.visible = true;
			t = 0;
			playIntroSfx('intro_whoosh');
		}

		// Camera + KC background dim.
		const zoom = cameraNow();
		stateIntroCinematic.zoom = zoom;
		foliageZoom = 1 + (zoom - 1) * BACKDROP.parallax;
		const ex = exiting ? exitPose(n) : null;
		stateIntroCinematic.dim = backdropOn ? INTRO_DIM * (ex ? 1 - ex.scene : 1) : 0;
		// Blur + vignette ride the camera: in with GG's zoom-in, out with the exit unblur.
		const blurShare = backdropOn ? clamp01((zoom - 1) / (CAMERA.zoom - 1)) : 0;
		stateIntroCinematic.blur = blurShare;
		introBackgroundBlur.strength = ENTER.blurPx * (c.height / 1080) * blurShare;
		vignette.visible = blurShare > 0.001;
		vignette.position.set(0, 0);
		vignette.width = c.width;
		vignette.height = c.height;
		vignette.alpha = ENTER.vignetteAlpha * blurShare;
		if (exiting) applyEntrance(n);

		// Backdrop (canvas space) — GG nHe S(k).
		if (backdropOn) {
			backTime += dt / 1000;
			if (exiting) backFade = Math.max(0, backFade - dt / BACKDROP.fadeOutMs);
			const R = { x: c.width / 2, y: c.height / 2 };
			const N = (A: number, F: number, D: number) => ({ x: R.x + (A - R.x) * D, y: R.y + (F - R.y) * D });
			const O = foliageZoom;
			// KC background cover rect stands in for GG's scene rect (cV).
			const bgS = Math.max(c.width / 1920, c.height / 1080);
			const q = { x: (c.width - 1920 * bgS) / 2, y: (c.height - 1080 * bgS) / 2, width: 1920 * bgS, height: 1080 * bgS };
			const Uc = (A: number, F: number) => N(q.x + (A / 1920) * q.width, q.y + (F / 1080) * q.height, zoom);
			const I = (q.width / 1920) * zoom;
			const L = (A: number, F: number) => 0.75 + 0.25 * Math.sin((backTime * 1000 * 2 * Math.PI) / A + F);
			const G = Uc(WARM.x, WARM.y);
			warmGlow.position.set(G.x, G.y);
			warmGlow.width = WARM.width * I;
			warmGlow.height = WARM.height * I;
			warmGlow.alpha = WARM.alpha * L(WARM.periodMs, 1.9) * backFade;
			warmGlow.visible = warmGlow.alpha > 0.001;
			const B = Math.max(c.width, c.height) / 1920;
			for (const A of motes) {
				A.y -= (A.rise * B * dt) / Math.max(c.height, 1);
				if (A.y < -0.06) {
					A.y += 1.12;
					A.x = Math.random();
				}
				const F = M.sway.px * B * Math.sin((backTime * 1000 * 2 * Math.PI) / A.swayMs + A.phase);
				const D = N(A.x * c.width + F, A.y * c.height, A.near ? O * 1.3 : O);
				A.sprite.position.set(D.x, D.y);
				const S = A.size * B * (A.near ? O : 1);
				A.sprite.width = S;
				A.sprite.height = S;
				const W = 0.55 + 0.45 * Math.sin(backTime * A.twinkle * 2 * Math.PI + A.phase);
				A.sprite.alpha = A.alpha * (A.near ? 1 : W) * backFade;
				A.sprite.visible = A.sprite.alpha > 0.001;
			}
			if (!exiting) {
				gritIn -= dt;
				if (gritIn <= 0) {
					gritIn = lerp(BACKDROP.grit.everyMs.min, BACKDROP.grit.everyMs.max, Math.random());
					const fit = stageFit();
					const px = c.width * lerp(0.12, 0.88, Math.random());
					const py = c.height * lerp(0.1, 0.17, Math.random());
					grit(
						{ x: (px - fit.x) / fit.s, y: (py - fit.y) / fit.s },
						Math.round(lerp(BACKDROP.grit.specks.min, BACKDROP.grit.specks.max, Math.random())),
						BACKDROP.grit.tint,
					);
				}
			}
		}

		// Design-space stage (GG Or).
		const fit = stageFit();
		stage.position.set(fit.x, fit.y);
		stage.scale.set(fit.s);
		screen.hitArea = new PIXI.Rectangle(-fit.x / fit.s - 40, -fit.y / fit.s - 40, c.width / fit.s + 80, c.height / fit.s + 80);

		if (introOn) {
			t += dt;
			if (exiting) n += dt;
			const L0 = layout();

			// Logo + land nuggets + glints.
			const lp = logoPose(t, L0.logoTo);
			if (!landed && t >= LOGO.dropMs) {
				landed = true;
				const F = L0.logoTo;
				for (const D of [-1, 1])
					nuggets(
						{ x: F.x + D * GG_LOGO.w * F.scale * 0.3, y: F.y + LOGO_H * F.scale * 0.36 },
						{ count: Math.ceil(LOGO.landNuggets / 2), speed: 0.42, angle: -Math.PI / 2 + D * 0.5, spread: 0.45, size: { min: 10, max: 20 }, lifeMs: 1100, widthPx: 40, scale: F.scale },
					);
			}
			if (!exiting && t >= nextGlint) {
				nextGlint = t + LOGO.glintEveryMs.min + Math.random() * (LOGO.glintEveryMs.max - LOGO.glintEveryMs.min);
				const g = LOGO.glints[Math.floor(Math.random() * LOGO.glints.length)];
				glint(
					{ x: lp.x + g.x * GG_LOGO.w * lp.scaleX, y: lp.y + g.y * LOGO_H * lp.scaleY },
					LOGO.glintSize * lp.scaleX,
					LOGO.glintMs,
				);
			}
			// Ryan: no logo slide on exit — the intro logo fades out in place (GG logo timing
			// delayMs/ms, easeInOutCubic) while the in-game logo fades in with the unblur.
			logoC.position.set(lp.x, lp.y);
			logoSprite.scale.set(lp.scaleX * LOGO_TEX_SCALE, lp.scaleY * LOGO_TEX_SCALE);
			logoC.alpha = ex ? 1 - ex.logo : 1;
			logoC.visible = logoC.alpha > 0.001;

			// Cards.
			cards.forEach((cn, i) => {
				const pose = cardPose(t, i);
				const slot = L0.cards[i];
				const out = ex ? ex.cards[i] : { y: 0, rotation: 0, alpha: 1 };
				const hv = hoverValue(cn);
				const wp = cn.wobbleAt < 0 ? 1 : clamp01((clock - cn.wobbleAt) / HOVER.wobbleMs);
				const we = Math.sin(wp * HOVER.wobbleFreq) * HOVER.wobbleAmp * (1 - wp);
				const depth = 2 * (L0.depth[i] ?? i);
				cn.root.zIndex = depth;
				cn.dustC.zIndex = depth + 1;
				cn.root.eventMode = exiting ? 'none' : 'static';
				cn.root.position.set(slot.x, slot.y - HOVER.lift * hv + out.y);
				cn.root.rotation = out.rotation;
				cn.root.alpha = out.alpha;
				cn.root.visible = out.alpha > 0;
				cn.root.scale.set(slot.scale * (1 + HOVER.grow * hv));
				cn.posts.visible = pose.postsShown;
				cn.posts.y = U + pose.postsY / slot.scale;
				cn.posts.scale.set(pose.postsScale.x, pose.postsScale.y);
				cn.textC.alpha = pose.textAlpha;
				cn.textC.visible = pose.textAlpha > 0;
				cn.textC.y = pose.textY; // GG: textY − u + middle (−u + middle baked into the sprite position)
				cn.signC.visible = pose.signShown;
				cn.signC.x = cardGeo[i].pivot.x;
				cn.signC.y = cardGeo[i].pivot.y + pose.signY / slot.scale;
				cn.signC.rotation = pose.signRotation + we;
				cn.signC.scale.set(pose.signScale.x, pose.signScale.y);
				// Dust at the card foot [Em / Pqe], in the card's (unlifted) slot.
				cn.dustC.position.set(slot.x, slot.y);
				cn.dustC.scale.set(slot.scale);
				const poses = cardDustPoses(t, i);
				cn.dust.forEach((s, k) => {
					const g = poses[k];
					s.visible = !!g && g.alpha > 0.001 && !!fx;
					if (!s.visible || !g) return;
					s.position.set(g.x, g.y);
					s.scale.set(g.size / Math.max(s.texture.width, s.texture.height, 1));
					s.rotation = g.rotation;
					s.alpha = g.alpha;
				});
				if (!postsSfx[i] && t >= postsLandMs(i)) {
					postsSfx[i] = true;
					playIntroSfx('intro_card');
				}
				if (!signFx[i] && t >= signLandMs(i)) {
					signFx[i] = true;
					if (i === 1) {
						const C = (x: number, y: number) => ({ x: slot.x + x * slot.scale, y: slot.y + y * slot.scale });
						const pv = cardGeo[i].pivot;
						nuggets(C(pv.x, pv.y), {
							count: CARDS.signNuggets, speed: 0.55, angle: -Math.PI / 2, spread: 1, size: { min: 12, max: 24 },
							lifeMs: 1150, widthPx: 150, floorY: C(0, U).y, scale: slot.scale,
						});
					}
				}
			});

			// CTA [eb + uN].
			if (ctaText) {
				const S = backOut(progress(t, CTA_START_MS, CTA.inMs));
				const pulse = exiting ? { rot: 0, scale: 1 } : pulseAt(t);
				const legible = (() => {
					const px = CTA.fontSize * L0.cta.scale * fit.s;
					return px > 0 ? Math.min(1.5, Math.max(1, 12 / px)) : 1;
				})();
				const ctaOut = ex ? ex.ctaOut : 0;
				ctaC.position.set(L0.cta.x, L0.cta.y);
				ctaC.alpha = clamp01(S) * (exiting ? 1 - ctaOut : 1);
				ctaC.visible = S > 0 && !(exiting && ctaOut >= 1);
				ctaC.scale.set(L0.cta.scale * legible * (CTA.startScale + (1 - CTA.startScale) * S) * pulse.scale * (1 + 0.25 * ctaOut * (exiting ? 1 : 0)));
				ctaC.rotation = pulse.rot;
			}

			// Whole screen thud [Oqe].
			screen.y = exiting ? 0 : thudY(t);
			screen.eventMode = exiting ? 'none' : 'static';
			screen.cursor = exiting || t < CONTINUE_MS ? 'default' : 'pointer';
		}

		stepParticles(dt);
		// Test hook (read-only): headless captures wait on this instead of wall time.
		(window as unknown as { __kcIntro?: object }).__kcIntro = { backdropOn, introOn, exiting, t, n, fps: dt > 0 ? 1000 / dt : 0 };

		if (exiting && !done && n >= POSED_MS && live.length === 0) {
			done = true;
			stateIntroCinematic.holdTitle = false;
			stateIntroCinematic.zoom = 1;
			stateIntroCinematic.dim = 0;
			resetEntrance();
			props.ondone?.();
		}
	};

	// ── assets ──────────────────────────────────────────────────────────────
	const INTRO_DIR = '/assets/sprites/intro';
	const loadAssets = async () => {
		const urls: string[] = [];
		CARD_KEYS.forEach((k) => ['posts', 'sign', 'text'].forEach((p) => urls.push(assetUrl(`${INTRO_DIR}/card_${k}_${p}.webp`))));
		const [tex, sheet] = await Promise.all([
			PIXI.Assets.load<PIXI.Texture>(urls),
			PIXI.Assets.load<PIXI.Spritesheet>(assetUrl(`${INTRO_DIR}/fx.json`)),
		]);
		const get = (k: string, p: string) => tex[assetUrl(`${INTRO_DIR}/card_${k}_${p}.webp`)];
		CARD_KEYS.forEach((k, i) => {
			const cn = cards[i];
			const g = cardGeo[i];
			cn.postsSprite.texture = get(k, 'posts');
			cn.postsSprite.setSize(g.w, g.h);
			cn.signSprite.texture = get(k, 'sign');
			cn.signSprite.setSize(g.sign.w, g.sign.h);
			cn.textSprite.texture = get(k, 'text');
			cn.textSprite.setSize(g.text.w, g.text.h);
		});
		const st = sheet.textures;
		fx = {
			nugget: Array.from({ length: 10 }, (_, i) => st[`introNugget${i + 1}`]).filter(Boolean),
			dust: st.introSmoke,
			glint: st.introGlint,
			mote: st.introMote,
		};
		warmGlow.texture = fx.mote;
		motes.forEach((m) => (m.sprite.texture = fx!.mote));
		cards.forEach((cn) => cn.dust.forEach((s) => (s.texture = fx!.dust)));
		assetsReady = true;
	};

	$effect(() => {
		const tex = context.stateApp.loadedAssets?.title_art;
		if (tex) logoSprite.texture = tex as PIXI.Texture;
	});

	onMount(() => {
		stateIntroCinematic.active = true;
		preloadIntroSfx();
		void loadAssets().catch((err) => {
			console.error('[IntroCinematic] asset load failed', err);
		});
		void ensureFredokaOneFont().then(() => {
			// KC "CLICK TO CONTINUE!" style: Fredoka One, white, black outside stroke (0.1em).
			ctaText = new PIXI.Text({
				text: 'CLICK TO CONTINUE!',
				anchor: 0.5,
				resolution: Math.min(window.devicePixelRatio || 1, 2) * 2,
				style: {
					fontFamily: 'Fredoka One',
					fontSize: CTA.fontSize,
					fill: 0xffffff,
					align: 'center',
					letterSpacing: -0.02 * CTA.fontSize,
					stroke: { color: 0x000000, width: 0.2 * CTA.fontSize, join: 'round' },
				},
			});
			ctaC.addChild(ctaText);
			ctaC.visible = false;
			fontReady = true;
		});
		const ticker = context.stateApp.pixiApplication?.ticker ?? PIXI.Ticker.shared;
		const tick = (tk: PIXI.Ticker) => frame(tk.deltaMS);
		ticker.add(tick);
		window.addEventListener('keydown', onKey, true);
		return () => {
			ticker.remove(tick);
			window.removeEventListener('keydown', onKey, true);
			if (leaveTimer !== undefined) clearTimeout(leaveTimer);
			stateIntroCinematic.zoom = 1;
			stateIntroCinematic.dim = 0;
			stateIntroCinematic.holdTitle = false;
			resetEntrance();
		};
	});
</script>

<!-- GG layering: backdrop (glow, motes, foliage rigs) → intro screen → particles. -->
<IntroNode node={back} />
<GgFoliage variant="splash" play={backdropOn} exiting={exiting} zoom={foliageZoom} />
<IntroNode node={front} />
