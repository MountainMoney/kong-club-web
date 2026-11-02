<script lang="ts" module>
	export type Popup = 'menu' | 'bets' | 'auto' | null;
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { FillGradient } from 'pixi.js';
	import { Container, Graphics, Rectangle, Sprite, Text } from 'pixi-svelte';
	import { Tween } from 'svelte/motion';
	import { linear } from 'svelte/easing';
	import { stateSound } from 'state-shared';

	import { setMusicVolume, setSfxVolume } from '../../game/ggUi/actions';

	import {
		DESIGN_PORTRAIT,
		UI_BAR,
		UI_BAR_PORTRAIT,
		UI_COLOR,
		UI_FONT_FAMILY,
		UI_POPUP,
	} from '../../game/ggUi/constants';
	import { alphaGradient, roundRectBand } from '../../game/ggUi/shapes';
	import { formatMoney } from '../../game/stakeMoney';
	import { isSocialMode } from '../../game/socialCopy';
	import UiButton from './UiButton.svelte';
	import UiChip from './UiChip.svelte';
	import UiSlider from './UiSlider.svelte';

	let {
		popup = $bindable(),
		mobile,
		bonus,
		autoPick,
		currentBet,
		bets,
		onauto,
		onbet,
		oninfo,
		onholdskip,
	}: {
		popup: Popup;
		mobile: boolean;
		bonus: boolean;
		autoPick: number;
		currentBet: number;
		bets: number[];
		onauto: (rounds: number) => void;
		onbet: (amount: number) => void;
		oninfo: () => void;
		onholdskip: () => void;
	} = $props();

	const P = UI_POPUP;
	const { menu: M, autoplay: A, bets: B, cell } = P;

	const face = new FillGradient({
		type: 'linear',
		start: { x: 0, y: 0 },
		end: { x: 0, y: 1 },
		textureSpace: 'local',
		colorStops: [
			{ offset: 0, color: P.top },
			{ offset: 1, color: P.bottom },
		],
	});
	const border = alphaGradient(0xffffff, P.borderAlpha);

	const grid = (count: number, columns: number, cellWidth: number, top: number = P.pad) => {
		const rows = Math.ceil(count / columns);
		return {
			width: P.pad * 2 + columns * cellWidth + (columns - 1) * cell.gap,
			height: top + rows * cell.height + (rows - 1) * cell.gap + P.pad,
			at: (index: number) => ({
				x: P.pad + (index % columns) * (cellWidth + cell.gap),
				y: top + Math.floor(index / columns) * (cell.height + cell.gap),
			}),
		};
	};

	const betGrid = $derived(grid(bets.length, mobile ? B.mobileColumns : B.columns, B.cell));
	const autoGrid = grid(A.rounds.length, A.columns, A.cell, A.top);
	const menuHeight = $derived(bonus ? M.bonusHeight : M.height);

	const place = (width: number, height: number, x: number) => {
		if (!mobile) return { x, y: -P.gap - height, scale: 1 };
		const scale = Math.min(1, P.mobileWidth / width);
		return {
			x: (DESIGN_PORTRAIT.width - width * scale) / 2,
			y: UI_BAR_PORTRAIT.top - P.mobileGap - height * scale,
			scale,
		};
	};

	const text = (fill: number) => ({
		fontFamily: UI_FONT_FAMILY,
		fontSize: cell.size,
		fontWeight: '600' as const,
		fill,
	});

	const hold = new Tween(0, { duration: M.hold.ms, easing: linear });
	let holding = false;
	const pressHold = async () => {
		holding = true;
		await hold.set(1);
		if (!holding) return;
		release();
		popup = null;
		onholdskip();
	};
	const release = () => {
		holding = false;
		hold.set(0, { duration: 0 });
	};

	const music = $derived(stateSound.volumeValueMusic / 100);
	const sound = $derived(stateSound.volumeValueSoundEffect / 100);
	const volumes = [
		{ key: 'music' as const, on: 'ggUiIconMusic', off: 'ggUiIconMusicOff' },
		{ key: 'sound' as const, on: 'ggUiIconSound', off: 'ggUiIconSoundOff' },
	];

	const infoLabel = 'GAME INFO';
	const autoTitle = isSocialMode() ? 'AUTO PLAY' : 'AUTOPLAY ROUNDS';
	const holdLabel = isSocialMode() ? 'HOLD TO SKIP' : 'HOLD TO SKIP BONUS';
</script>

{#snippet panel(width: number, height: number, x: number, children: Snippet)}
	{@const at = place(width, height, x)}
	<Container x={at.x} y={at.y} scale={{ x: at.scale, y: at.scale }} eventMode="static">
		<Graphics
			draw={(graphics) => {
				graphics
					.roundRect(
						-P.outline,
						-P.outline,
						width + P.outline * 2,
						height + P.outline * 2 + P.lip,
						P.radius + P.outline,
					)
					.fill(0x000000);
				roundRectBand(
					graphics,
					{ x: 0, y: 0, width, height, radius: P.radius },
					P.edge.offset,
					'below',
				).fill(P.edge.color);
				graphics.roundRect(0, 0, width, height, P.radius).fill(face);
				graphics
					.roundRect(
						P.border / 2,
						P.border / 2,
						width - P.border,
						height - P.border,
						P.radius - P.border / 2,
					)
					.stroke({ width: P.border, fill: border });
			}}
		/>
		{@render children()}
	</Container>
{/snippet}

{#snippet menuBody()}
	{#each volumes as volume, index (volume.key)}
		{@const value = volume.key === 'music' ? music : sound}
		<UiButton
			onpress={() =>
				volume.key === 'music'
					? setMusicVolume(value > 0 ? 0 : 1)
					: setSfxVolume(value > 0 ? 0 : 1)}
		>
			<Sprite
				key={value > 0 ? volume.on : volume.off}
				x={M.icon.x}
				y={M.icon.y + index * M.row}
				anchor={{ x: 0.5, y: 0.5 }}
			/>
		</UiButton>
		<UiSlider
			x={M.slider.x}
			y={M.slider.y + index * M.row}
			{value}
			onchange={(next) => (volume.key === 'music' ? setMusicVolume(next) : setSfxVolume(next))}
		/>
	{/each}

	<UiButton onpress={oninfo}>
		<Rectangle
			x={M.info.hit.x}
			y={M.info.hit.y}
			width={M.info.hit.width}
			height={M.info.hit.height}
			backgroundColor={0x000000}
			backgroundAlpha={0.001}
		/>
		<Sprite
			key="ggUiIconInfo"
			x={M.icon.x}
			y={M.icon.y + volumes.length * M.row}
			anchor={{ x: 0.5, y: 0.5 }}
		/>
		<Text
			text={infoLabel}
			x={M.info.x}
			y={M.icon.y + volumes.length * M.row}
			anchor={{ x: 0, y: 0.5 }}
			style={text(UI_COLOR.value)}
		/>
	</UiButton>

	{#if bonus}
		{@const H = M.hold}
		<Container
			x={H.x}
			y={H.y}
			eventMode="static"
			cursor="pointer"
			onpointerdown={pressHold}
			onpointerup={release}
			onpointerupoutside={release}
			onpointerout={release}
		>
			<Graphics
				draw={(graphics) => {
					const body = { x: 0, y: 0, width: H.width, height: H.height, radius: UI_BAR.chip.radius };
					roundRectBand(graphics, body, UI_BAR.chip.shadow, 'below').fill({
						color: 0x000000,
						alpha: UI_COLOR.shadowAlpha,
					});
					graphics.roundRect(0, 0, H.width, H.height, body.radius).fill({
						color: UI_COLOR.chip,
						alpha: UI_COLOR.chipAlpha,
					});
					if (hold.current > 0) {
						graphics
							.roundRect(0, 0, H.width * hold.current, H.height, body.radius)
							.fill({ color: 0xffffff, alpha: H.fillAlpha });
					}
					graphics
						.roundRect(1, 1, H.width - 2, H.height - 2, body.radius - 1)
						.stroke({ width: 2, color: 0xffffff, alpha: H.borderAlpha });
				}}
			/>
			<Text
				text={holdLabel}
				x={H.width / 2}
				y={H.height / 2}
				anchor={{ x: 0.5, y: 0.5 }}
				style={text(UI_COLOR.value)}
			/>
		</Container>
	{/if}
{/snippet}

{#snippet autoBody()}
	<Text
		text={autoTitle}
		x={autoGrid.width / 2}
		y={A.title.y}
		anchor={{ x: 0.5, y: 0.5 }}
		style={text(UI_COLOR.value)}
	/>
	<Rectangle
		x={P.pad}
		y={A.rule - 1}
		width={autoGrid.width - P.pad * 2}
		height={2}
		backgroundColor={0xffffff}
		backgroundAlpha={UI_COLOR.highlightAlpha}
	/>
	{#each A.rounds as rounds, index (rounds)}
		{@const at = autoGrid.at(index)}
		<UiChip
			x={at.x}
			y={at.y}
			width={A.cell}
			height={cell.height}
			icon={rounds === Infinity ? 'ggUiIconInfinity' : undefined}
			iconSize={A.infinity}
			label={`${rounds === Infinity ? '' : rounds}`}
			active={rounds === autoPick}
			onpress={() => onauto(rounds)}
		/>
	{/each}
{/snippet}

{#snippet betsBody()}
	{#each bets as bet, index (bet)}
		{@const at = betGrid.at(index)}
		<UiChip
			x={at.x}
			y={at.y}
			width={B.cell}
			height={cell.height}
			label={formatMoney(bet, 'bet')}
			active={bet === currentBet}
			onpress={() => onbet(bet)}
		/>
	{/each}
{/snippet}

{#if popup === 'menu'}
	{@render panel(M.width, menuHeight, M.x, menuBody)}
{:else if popup === 'auto'}
	{@render panel(autoGrid.width, autoGrid.height, A.right - autoGrid.width, autoBody)}
{:else if popup === 'bets'}
	{@render panel(betGrid.width, betGrid.height, B.right - betGrid.width, betsBody)}
{/if}
