<script lang="ts" module>
	import type { BookEventOfType } from '../game/typesBookEvent';
	import type { Position } from '../game/types';

	export type EmitterEventTileLevelGrid =
		| { type: 'monkeyTilesUpdate'; payload: BookEventOfType<'updateLevelUpTiles'> }
		| { type: 'monkeyTilesClear' }
		| { type: 'monkeyTileWinPulse'; positions: Position[] }
		| { type: 'monkeyTileWinPulseClear' }
		| { type: 'monkeyMechanicsReset'; instant?: boolean }
		| { type: 'heldBoardSpinAway' };
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { cubicIn } from 'svelte/easing';
	import { FillGradient, Texture } from 'pixi.js';
	import { Container, Graphics } from 'pixi-svelte';
	import { stateBet } from 'state-shared';

	import BoardContainer from './BoardContainer.svelte';
	import { BOARD_DIMENSIONS, SYMBOL_SIZE, zIndexes } from '../game/constants';
	import { isPeakSpinBetMode } from '../game/betModes';
	import {
		emptyTileLevels,
		normalizeTileLevels,
		TIER_CELL_STYLE,
		tileLevelToTier,
	} from '../game/tileLevelVisual';
	import { getSymbolX } from '../game/utils';
	import { getContext } from '../game/context';
	import { stateGame } from '../game/stateGame.svelte';
	import {
		clearLastTileLevels,
		rememberResolvedTileLevels,
		rememberTileLevels,
	} from '../game/lastTileLevels';
	import {
		completeHeldTileFade,
		finishHeldBoardDismiss,
		setHeldTileFadeAlpha,
		stateCoinFeatureCover,
		tryFinishHeldBoardDismiss,
	} from '../game/coinFeatureCover.svelte';

	const context = getContext();

	/** Plaques fill the cell — no wood gutter between bronze / silver / gold. */
	const GRID_LINE = 0;
	const CELL = SYMBOL_SIZE - GRID_LINE;
	const HALF = CELL / 2;
	const FRAME = Math.max(4, Math.round(CELL * 0.07));
	const TIER_BUMP_MS = 180;
	let pulsePhase = $state(0);
	let pulseRaf = 0;
	let tileFadeRaf = 0;
	let tileFadeRunning = false;

	const stopTileFade = () => {
		if (tileFadeRaf) cancelAnimationFrame(tileFadeRaf);
		tileFadeRaf = 0;
		tileFadeRunning = false;
	};

	onMount(() => {
		const start = performance.now();
		const tick = () => {
			pulsePhase = (performance.now() - start) / 1000;
			pulseRaf = requestAnimationFrame(tick);
		};
		tick();
		return () => {
			cancelAnimationFrame(pulseRaf);
			stopTileFade();
			peakPlateGradient.destroy();
			peakRimGradient.destroy();
			for (const texture of Object.values(wellTextures)) {
				if (texture !== Texture.EMPTY) texture.destroy(true);
			}
		};
	});

	let tileLevels = $state(emptyTileLevels());
	let winPulse = $state<Record<string, number>>({});
	let tierBump = $state<Record<string, number>>({});
	/** Connection cells waiting for updateLevelUpTiles — fill immediately, one square each. */
	let pending = $state<Record<string, number>>({});

	const cellKey = (reel: number, row: number) => `${reel}:${row}`;

	const hasLeftoverPlaques = () =>
		tileLevels.some((reel) => reel.some((level) => (level ?? 0) > 0)) ||
		Object.keys(pending).length > 0;

	const snapClearTiles = () => {
		stopTileFade();
		clearLastTileLevels();
		tileLevels = emptyTileLevels();
		winPulse = {};
		tierBump = {};
		pending = {};
		finishHeldBoardDismiss();
	};

	/** Same beat as leftover progress-bar drain on the next spin. */
	const TILE_SPIN_FADE_MS = 420;

	const fadeTilesAway = () => {
		if (tileFadeRaf) cancelAnimationFrame(tileFadeRaf);
		tileFadeRaf = 0;
		tileFadeRunning = true;
		stateCoinFeatureCover.tileFadeActive = true;
		const start = performance.now();
		const from = stateCoinFeatureCover.tileFadeAlpha > 0.01 ? stateCoinFeatureCover.tileFadeAlpha : 1;
		const tick = (now: number) => {
			if (!tileFadeRunning) return;
			const t = Math.min(1, (now - start) / TILE_SPIN_FADE_MS);
			setHeldTileFadeAlpha(from * (1 - cubicIn(t)));
			if (t < 1) {
				tileFadeRaf = requestAnimationFrame(tick);
				return;
			}
			tileFadeRaf = 0;
			tileFadeRunning = false;
			clearLastTileLevels();
			tileLevels = emptyTileLevels();
			winPulse = {};
			tierBump = {};
			pending = {};
			completeHeldTileFade();
			setHeldTileFadeAlpha(1);
		};
		tileFadeRaf = requestAnimationFrame(tick);
	};

	const bumpCells = (keys: string[]) => {
		if (keys.length === 0) return;
		const next = { ...tierBump };
		for (const key of keys) next[key] = 1;
		tierBump = next;
		setTimeout(() => {
			const faded = { ...tierBump };
			for (const key of keys) delete faded[key];
			tierBump = faded;
		}, TIER_BUMP_MS);
	};

	const PEAK_RIM = 0xffe566;
	const PEAK_GRID = 0x2a241c;

	/** Blend bright gold (0xffc107) over dark bronze (0x4a320c) — not charcoal. */
	const goldOverDarkGold = (amount: number) => {
		const r = Math.round(74 + (255 - 74) * amount);
		const g = Math.round(50 + (193 - 50) * amount);
		const b = Math.round(12 + (7 - 12) * amount);
		return (r << 16) | (g << 8) | b;
	};
	const goldRimRgba = (alpha: number) => `rgba(255, 229, 102, ${alpha})`;

	const mixColor = (from: number, to: number, amount: number) => {
		const fr = (from >> 16) & 255;
		const fg = (from >> 8) & 255;
		const fb = from & 255;
		const tr = (to >> 16) & 255;
		const tg = (to >> 8) & 255;
		const tb = to & 255;
		const r = Math.round(fr + (tr - fr) * amount);
		const g = Math.round(fg + (tg - fg) * amount);
		const b = Math.round(fb + (tb - fb) * amount);
		return (r << 16) | (g << 8) | b;
	};

	const makeWellTexture = (top: number, bottom: number) => {
		if (typeof document === 'undefined') return Texture.EMPTY;
		const size = 256;
		const canvas = document.createElement('canvas');
		canvas.width = 1;
		canvas.height = size;
		const ctx = canvas.getContext('2d');
		if (!ctx) return Texture.EMPTY;
		const pixels = ctx.createImageData(1, size);
		const hold = Math.round(size * 0.22);
		for (let y = 0; y < size; y += 1) {
			const t = y <= hold ? 0 : (y - hold) / Math.max(1, size - 1 - hold);
			const color = mixColor(top, bottom, t);
			const i = y * 4;
			pixels.data[i] = (color >> 16) & 255;
			pixels.data[i + 1] = (color >> 8) & 255;
			pixels.data[i + 2] = color & 255;
			pixels.data[i + 3] = 255;
		}
		ctx.putImageData(pixels, 0, 0);
		return Texture.from(canvas);
	};

	const wellTextures = {
		bronze: makeWellTexture(TIER_CELL_STYLE.bronze.wellTop, TIER_CELL_STYLE.bronze.wellBottom),
		silver: makeWellTexture(TIER_CELL_STYLE.silver.wellTop, TIER_CELL_STYLE.silver.wellBottom),
		gold: makeWellTexture(TIER_CELL_STYLE.gold.wellTop, TIER_CELL_STYLE.gold.wellBottom),
	};

	const drawPlaque = (
		g: import('pixi.js').Graphics,
		x0: number,
		y0: number,
		tier: 'bronze' | 'silver' | 'gold',
	) => {
		const style = TIER_CELL_STYLE[tier];
		g.rect(x0, y0, CELL, CELL);
		g.fill({ color: style.frame, alpha: style.alpha });
		const inner = CELL - FRAME * 2;
		g.rect(x0 + FRAME, y0 + FRAME, inner, inner);
		g.fill({ texture: wellTextures[tier], textureSpace: 'local' });
		g.rect(x0, y0, CELL, 1);
		g.fill({ color: 0x2a1a0c, alpha: 0.7 });
		g.rect(x0, y0, 1, CELL);
		g.fill({ color: 0x2a1a0c, alpha: 0.7 });
		g.rect(x0, y0 + CELL - 1, CELL, 1);
		g.fill({ color: 0x2a1a0c, alpha: 0.7 });
		g.rect(x0 + CELL - 1, y0, 1, CELL);
		g.fill({ color: 0x2a1a0c, alpha: 0.7 });
	};

	/** Cached — `draw` can run every frame; a new FillGradient each time leaks textures. */
	const peakPlateGradient = new FillGradient({
		type: 'linear',
		start: { x: 0, y: 0 },
		end: { x: 0, y: 1 },
		textureSpace: 'local',
		textureSize: 256,
		colorStops: [
			{ offset: 0, color: goldOverDarkGold(0.5) },
			{ offset: 0.32, color: goldOverDarkGold(0.38) },
			{ offset: 0.58, color: goldOverDarkGold(0.26) },
			{ offset: 0.82, color: goldOverDarkGold(0.16) },
			{ offset: 1, color: goldOverDarkGold(0.1) },
		],
	});
	const peakRimGradient = new FillGradient({
		type: 'linear',
		start: { x: 0, y: 0 },
		end: { x: 0, y: 1 },
		textureSpace: 'local',
		textureSize: 256,
		colorStops: [
			{ offset: 0, color: goldRimRgba(0.92) },
			{ offset: 0.4, color: goldRimRgba(0.68) },
			{ offset: 0.72, color: goldRimRgba(0.4) },
			{ offset: 1, color: goldRimRgba(0.22) },
		],
	});

	const drawPeakPlate = (g: import('pixi.js').Graphics) => {
		const width = SYMBOL_SIZE * BOARD_DIMENSIONS.x;
		const height = SYMBOL_SIZE * BOARD_DIMENSIONS.y;
		const cols = BOARD_DIMENSIONS.x;
		const rows = BOARD_DIMENSIONS.y;

		g.rect(0, 0, width, height);
		g.fill({ fill: peakPlateGradient });

		for (let col = 1; col < cols; col += 1) {
			g.rect(col * SYMBOL_SIZE - 0.5, 0, 1, height);
			g.fill({ color: PEAK_GRID, alpha: 0.28 });
		}
		for (let row = 1; row < rows; row += 1) {
			g.rect(0, row * SYMBOL_SIZE - 0.5, width, 1);
			g.fill({ color: PEAK_GRID, alpha: 0.28 });
		}

		// Sit on the wood inner lip (grid edge), not inset on the plate.
		const rimW = 3;
		g.rect(-rimW, -rimW, width + rimW * 2, rimW);
		g.fill({ color: PEAK_RIM, alpha: 0.95 });
		g.rect(-rimW, -rimW, rimW, height + rimW * 2);
		g.fill({ fill: peakRimGradient });
		g.rect(width, -rimW, rimW, height + rimW * 2);
		g.fill({ fill: peakRimGradient });
		g.rect(-rimW, height, width + rimW * 2, rimW);
		g.fill({ color: PEAK_RIM, alpha: 0.14 });
	};

	const visualLevel = (reel: number, row: number) => {
		const level = tileLevels[reel]?.[row] ?? 0;
		if (level > 0) return level;
		return pending[cellKey(reel, row)] ?? 0;
	};

	const drawGrid = (
		g: import('pixi.js').Graphics,
		levels: number[][],
		pulseMap: Record<string, number>,
		bumpMap: Record<string, number>,
		pendingMap: Record<string, number>,
		_pulsePhase: number,
		_coverStamp: number,
		peakPlate: boolean,
		hideSummitCells: boolean,
	) => {
		g.clear();
		if (peakPlate) drawPeakPlate(g);
		if (hideSummitCells) return;
		for (let reelIndex = 0; reelIndex < levels.length; reelIndex += 1) {
			const reel = levels[reelIndex] ?? [];
			for (let rowIndex = 0; rowIndex < reel.length; rowIndex += 1) {
				const key = cellKey(reelIndex, rowIndex);
				const pulse = pulseMap[key] ?? 0;
				const bump = bumpMap[key] ?? 0;
				if (peakPlate && pulse <= 0 && bump <= 0) continue;

				const stored = reel[rowIndex] ?? 0;
				const level = stored > 0 ? stored : pendingMap[key] ?? 0;
				const tier = tileLevelToTier(level);
				if (tier === 'none') continue;

				const x = getSymbolX(reelIndex);
				const y = (rowIndex + 0.5) * SYMBOL_SIZE;
				const style = TIER_CELL_STYLE[tier];
				const breathe = pulse > 0 ? 0.5 + 0.5 * Math.sin(pulsePhase * Math.PI * 2) : 0;
				const x0 = x - HALF;
				const y0 = y - HALF;
				if (pulse > 0 || bump > 0) {
					const glowPad = 3 + breathe * 2 + bump * 2;
					g.rect(x0 - glowPad, y0 - glowPad, CELL + glowPad * 2, CELL + glowPad * 2);
					g.fill({
						color: style.glow,
						alpha: 0.08 + pulse * 0.12 + breathe * 0.08 + bump * 0.06,
					});
				}
				if (!peakPlate) {
					drawPlaque(g, x0, y0, tier);
				} else {
					g.rect(x0 + 1, y0 + 1, CELL - 2, CELL - 2);
					g.stroke({
						color: style.rim,
						width: 2,
						alpha: 0.35 + pulse * 0.35 + breathe * 0.25 + bump * 0.2,
					});
				}
			}
		}
	};

	context.eventEmitter.subscribeOnMount({
		monkeyTilesUpdate: (event) => {
			stopTileFade();
			stateCoinFeatureCover.tileFadeActive = false;
			tryFinishHeldBoardDismiss();
			setHeldTileFadeAlpha(1);
			rememberTileLevels(event.payload.tileLevels, event.payload.tileMultipliers);
			const incoming = normalizeTileLevels(
				event.payload.tileLevels,
				event.payload.tileMultipliers,
			).map((reel) =>
				reel.map((level) =>
					stateGame.sessionBonusTier === 3 && level === 1 ? 0 : level,
				),
			);
			const persist = stateGame.gameType === 'freegame';
			const nextLevels = incoming.map((reel, reelIndex) =>
				reel.map((level, rowIndex) =>
					persist ? Math.max(visualLevel(reelIndex, rowIndex), level) : level,
				),
			);
			const bumped: string[] = [];
			const nextPending = { ...pending };
			nextLevels.forEach((reel, reelIndex) => {
				reel.forEach((level, rowIndex) => {
					const prev = visualLevel(reelIndex, rowIndex);
					if (level > prev) bumped.push(cellKey(reelIndex, rowIndex));
					if (level > 0) delete nextPending[cellKey(reelIndex, rowIndex)];
				});
			});
			tileLevels = nextLevels;
			pending = persist ? nextPending : {};
			if (persist) rememberResolvedTileLevels(nextLevels);
			bumpCells(bumped);
		},
		monkeyTilesClear: () => {
			snapClearTiles();
		},
		monkeyMechanicsReset: (event) => {
			if (event.instant) {
				snapClearTiles();
				return;
			}
			// See / Hear / Madness tiles persist — do not fade mid-bonus.
			if (stateGame.gameType === 'freegame') return;
			if (tileFadeRunning) return;
			if (stateCoinFeatureCover.tileFadeActive && !hasLeftoverPlaques()) return;
			fadeTilesAway();
		},
		heldBoardSpinAway: () => {
			// See / Hear / Madness plaques persist for the whole bonus.
			// Still release the dismiss latch — the fade never runs in freegame,
			// and leaving tileFadeActive set hangs the next tumble.
			if (stateGame.gameType === 'freegame') {
				completeHeldTileFade();
				return;
			}
			fadeTilesAway();
		},
		monkeyTileWinPulse: (event) => {
			const nextPulse = { ...winPulse };
			const nextPending = { ...pending };
			for (const pos of event.positions) {
				const reel = pos.reel;
				const row = pos.row;
				if (reel < 0 || row < 0) continue;
				const key = cellKey(reel, row);
				nextPulse[key] = 1;
				if ((tileLevels[reel]?.[row] ?? 0) <= 0) {
					nextPending[key] = stateGame.sessionBonusTier === 3 ? 2 : 1;
				}
			}
			winPulse = nextPulse;
			pending = nextPending;
			setTimeout(() => {
				const faded = { ...winPulse };
				for (const pos of event.positions) {
					delete faded[cellKey(pos.reel, pos.row)];
				}
				winPulse = faded;
			}, 520);
		},
		monkeyTileWinPulseClear: () => {
			winPulse = {};
		},
	});
</script>

<BoardContainer zIndex={zIndexes.boardTiles}>
	{@const levels = tileLevels}
	{@const pulseMap = winPulse}
	{@const bumpMap = tierBump}
	{@const pendingMap = pending}
	{@const peakPlate = stateCoinFeatureCover.summitPlateActive}
	{@const hideSummitCells =
		isPeakSpinBetMode(stateBet.activeBetModeKey) && !stateCoinFeatureCover.summitPlateActive}
	<Container zIndex={-1} alpha={stateCoinFeatureCover.tileFadeAlpha}>
		<Graphics
			draw={(g) =>
				drawGrid(
					g,
					levels,
					pulseMap,
					bumpMap,
					pendingMap,
					pulsePhase,
					(stateCoinFeatureCover.preCoinShrinkActive ? 1 : 0) +
						(stateCoinFeatureCover.summitPlateActive ? 2 : 0) +
						(hideSummitCells ? 4 : 0) +
						stateCoinFeatureCover.shrinkKeys.size +
						stateCoinFeatureCover.keys.size,
					peakPlate,
					hideSummitCells,
				)
			}
		/>
	</Container>
</BoardContainer>
