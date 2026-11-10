<script lang="ts">
	import type { Texture } from 'pixi.js';
	import { Container, Graphics, Sprite, Text, getContextApp } from 'pixi-svelte';

	import { UI_BAR, UI_COLOR, UI_FONT_FAMILY, UI_POPUP } from '../../game/ggUi/constants';
	import { drawPlate } from '../../game/ggUi/plate';
	import { darken } from '../../game/ggUi/dim';
	import { createPress } from '../../game/ggUi/press.svelte';
	import { roundRectBand } from '../../game/ggUi/shapes';

	const chip = UI_BAR.chip;

	const {
		x,
		y,
		icon,
		label,
		width = chip.size,
		height = width,
		iconSize = chip.iconSize,
		rotation = 0,
		active = false,
		solid = false,
		plate = false,
		radius = chip.radius,
		border,
		disabled = false,
		disabledBrightness = UI_COLOR.disabledIconBrightness,
		onpress,
	}: {
		x: number;
		y: number;
		icon?: string;
		/** A popup cell: text in place of the icon. */
		label?: string;
		width?: number;
		height?: number;
		iconSize?: number;
		rotation?: number;
		active?: boolean;
		/** Figma: UI Turbo2 (30:1754): a filled chip, one step past `active`. */
		solid?: boolean;
		/** Figma: Group 2087331689 (30:3867): the overlays' close button is a small plate. */
		plate?: boolean;
		radius?: number;
		border?: number;
		disabled?: boolean;
		disabledBrightness?: number;
		onpress?: () => void;
	} = $props();

	// Fitted by width: the icons come in 24px and 28px SVGs and 2x PNGs.
	const contextApp = getContextApp();
	const texture = $derived(
		icon ? (contextApp.stateApp.loadedAssets?.[icon] as Texture | undefined) : undefined,
	);
	const iconScale = $derived(texture ? iconSize / texture.width : 1);

	const press = createPress();

	const body = $derived({ x: 0, y: 0, width, height, radius });
	const ink = $derived(solid ? 0x000000 : active ? UI_COLOR.accent : UI_COLOR.icon);
</script>

<Container
	{x}
	{y}
	eventMode={disabled ? 'none' : 'static'}
	cursor="pointer"
	onpointerdown={press.down}
	onpointerup={() => {
		press.up();
		onpress?.();
	}}
	onpointerupoutside={press.up}
	onpointerout={press.up}
>
	<!-- The hit area keeps its size; only the drawing shrinks. -->
	<Container
		x={width / 2}
		y={height / 2}
		pivot={{ x: width / 2, y: height / 2 }}
		scale={{ x: press.scale, y: press.scale }}
	>
		<Graphics
			draw={(graphics) => {
				if (plate) return drawPlate(graphics, width, height, radius, border);
				roundRectBand(graphics, body, chip.shadow, 'below').fill({
					color: 0x000000,
					alpha: UI_COLOR.shadowAlpha,
				});
				graphics
					.roundRect(body.x, body.y, body.width, body.height, body.radius)
					.fill({ color: UI_COLOR.chip, alpha: solid ? 1 : UI_COLOR.chipAlpha });
				if (solid) return;
				if (active) {
					graphics
						.roundRect(
							chip.border / 2,
							chip.border / 2,
							width - chip.border,
							height - chip.border,
							radius - chip.border / 2,
						)
						.stroke({
							width: chip.border,
							color: UI_COLOR.accent,
							alpha: UI_COLOR.activeBorderAlpha,
						});
				} else {
					roundRectBand(graphics, body, chip.inset, 'above').fill({
						color: 0xffffff,
						alpha: UI_COLOR.highlightAlpha,
					});
				}
			}}
		/>
		{#if icon}
			<Sprite
				key={icon}
				x={width / 2}
				y={height / 2}
				anchor={{ x: 0.5, y: 0.5 }}
				scale={{ x: iconScale, y: iconScale }}
				{rotation}
				tint={disabled ? darken(disabledBrightness, ink) : ink}
			/>
		{:else if label}
			<Text
				text={label}
				x={width / 2}
				y={height / 2}
				anchor={{ x: 0.5, y: 0.5 }}
				style={{
					fontFamily: UI_FONT_FAMILY,
					fontSize: UI_POPUP.cell.size,
					fontWeight: '600',
					letterSpacing: UI_POPUP.cell.tracking,
					fill: active ? UI_COLOR.accent : UI_COLOR.label,
				}}
			/>
		{/if}
	</Container>
</Container>
