<script lang="ts">
	import { Texture } from 'pixi.js';
	import { BaseSprite, Container, Graphics, Rectangle, Sprite, Text } from 'pixi-svelte';

	import {
		BONUS_BUY,
		BONUS_BUY_COLOR,
		UI_FONT_FAMILY,
		type BonusCardCut,
	} from '../../game/ggUi/constants';
	import { type BonusOffer, type CardCut } from '../../game/ggUi/offers';
	import { createPress } from '../../game/ggUi/press.svelte';
	import {
		alphaGradient,
		roundRectBand,
		verticalGradient,
		type RoundRect,
	} from '../../game/ggUi/shapes';
	import HuntSlider from './HuntSlider.svelte';

	const {
		x,
		y,
		offer,
		cut,
		tier,
		body = '',
		price,
		label,
		kind,
		active = false,
		dimmed = false,
		onpress,
		onslide,
	}: {
		x: number;
		y: number;
		offer: BonusOffer;
		cut: CardCut;
		tier: number;
		body?: string;
		price: string;
		label: string;
		kind: BonusOffer['kind'] | 'confirm';
		active?: boolean;
		dimmed?: boolean;
		onpress?: () => void;
		onslide?: (level: number) => void;
	} = $props();

	const B = BONUS_BUY;
	const C = BONUS_BUY_COLOR;
	const L: BonusCardCut = $derived(B.card[cut]);

	const face = verticalGradient(C.card.top, C.card.bottom);
	const border = alphaGradient(C.border, C.borderAlpha);
	const wash = alphaGradient(C.accent, B.button.activate.alpha);
	const washBorder = alphaGradient(C.accent, B.button.activate.alpha.border);

	// A stencil cannot fade, so the art's fade-out is a strip of alpha stretched over it.
	const fadeOut = (from: number) => {
		const canvas = document.createElement('canvas');
		canvas.width = 1;
		canvas.height = B.fadeStrip;
		const context = canvas.getContext('2d')!;
		const gradient = context.createLinearGradient(0, 0, 0, B.fadeStrip);
		gradient.addColorStop(from, 'rgba(255,255,255,1)');
		gradient.addColorStop(1, 'rgba(255,255,255,0)');
		context.fillStyle = gradient;
		context.fillRect(0, 0, 1, B.fadeStrip);
		return Texture.from(canvas);
	};
	const artFade = $derived(L.art.fade && fadeOut(L.art.fade.from));

	const plates = $derived<RoundRect[]>([
		{ x: 0, y: 0, width: L.width, height: L.height, radius: L.radius },
		...(L.strip
			? [{ x: 0, y: L.strip.y, width: L.width, height: L.strip.height, radius: L.radius }]
			: []),
	]);

	const spotOf = (spot: NonNullable<BonusOffer['artSpot']>[CardCut]) => ({
		x: L.art.x + (spot?.dx ?? 0),
		y: L.art.y + (spot?.dy ?? 0),
		scale: B.artScale * (spot?.scale ?? 1),
	});
	const art = $derived(spotOf(offer.artSpot?.[cut]));
	const prop = $derived(offer.prop?.spot[cut] && spotOf(offer.prop.spot[cut]));

	const press = createPress();
	// A running activation stays pushed in.
	const sink = $derived(active ? B.button.sink : 0);
	const button = $derived<RoundRect>({
		x: L.button.x,
		y: L.button.y - (kind === 'buy' ? B.button.buy.lift : 0) + sink,
		width: L.button.width,
		height: L.button.height,
		radius: B.button[kind].radius,
	});

	const centre = $derived({ x: button.x + button.width / 2, y: button.y + button.height / 2 });

	const text = (size: number, fill: number, extra: Record<string, unknown> = {}) => ({
		fontFamily: UI_FONT_FAMILY,
		fontSize: size,
		fontWeight: '600' as const,
		fill,
		align: 'center' as const,
		lineHeight: size,
		...extra,
	});
</script>

<Container {x} {y} alpha={dimmed ? B.dimAlpha : 1}>
	<Graphics
		draw={(graphics) => {
			for (const plate of plates) {
				graphics
					.roundRect(
						plate.x - B.outline,
						plate.y - B.outline,
						plate.width + B.outline * 2,
						plate.height + B.outline * 2 + L.lip,
						plate.radius + B.outline,
					)
					.fill(C.outline);
				roundRectBand(graphics, plate, B.edge, 'below').fill(C.edge);
				graphics.roundRect(plate.x, plate.y, plate.width, plate.height, plate.radius).fill(face);
			}
		}}
	/>

	<!-- The backdrop and art stay inside the border: the exported backdrops carry a lighter edge of their own. -->
	<Container>
		<Graphics
			isMask
			draw={(graphics) =>
				graphics
					.roundRect(
						L.border,
						L.border,
						L.width - L.border * 2,
						L.height - L.border * 2,
						L.radius - L.border,
					)
					.fill(0xffffff)}
		/>
		<Sprite key={offer.backdrop[cut]} />
		<Container>
			{#if artFade}
				<BaseSprite isMask texture={artFade} width={L.width} height={L.art.fade!.height} />
			{/if}
			{#if prop}
				<Sprite
					key={offer.prop!.key}
					x={prop.x}
					y={prop.y}
					anchor={0.5}
					scale={{ x: prop.scale, y: prop.scale }}
				/>
			{/if}
			<Sprite
				key={offer.art}
				x={art.x}
				y={art.y}
				anchor={0.5}
				scale={{ x: art.scale, y: art.scale }}
			/>
		</Container>
	</Container>

	<Graphics
		draw={(graphics) => {
			for (const plate of plates) {
				graphics
					.roundRect(
						plate.x + L.border / 2,
						plate.y + L.border / 2,
						plate.width - L.border,
						plate.height - L.border,
						plate.radius - L.border / 2,
					)
					.stroke({ width: L.border, fill: border });
			}
		}}
	/>

	{#if offer.lettering}
		<Sprite
			key={offer.lettering}
			x={L.title.x}
			y={L.title.y}
			anchor={0.5}
			scale={{ x: B.artScale * L.title.lettering, y: B.artScale * L.title.lettering }}
		/>
	{:else}
		<!-- Figma breaks every title before its last word. -->
		<Text
			text={offer.title.toUpperCase().replace(/ (?=\S+$)/, '\n')}
			x={L.title.x}
			y={L.title.y}
			anchor={0.5}
			style={text(L.title.size, C.title, {
				fontWeight: '700',
				dropShadow: {
					color: C.title,
					alpha: B.titleShadow.alpha,
					distance: B.titleShadow.distance,
					angle: Math.PI / 2,
					blur: 0,
				},
			})}
		/>
	{/if}

	{#if onslide && L.slider}
		<HuntSlider
			x={L.slider.x}
			y={L.slider.y}
			width={L.slider.width}
			level={tier}
			levels={B.pips.count}
			{onslide}
		/>
	{:else if L.label}
		<Text
			text={offer.volatility}
			x={L.title.x}
			y={L.label.y}
			anchor={0.5}
			style={text(L.label.size, C.label)}
		/>
	{/if}

	{#each Array.from({ length: B.pips.count }, (__, index) => index) as index (index)}
		<Container
			x={L.pips.x + index * B.pips.pitch}
			y={L.pips.y}
			eventMode={onslide ? 'static' : 'none'}
			cursor={onslide ? 'pointer' : undefined}
			onpointerdown={() => onslide?.(index + 1)}
			onpointerover={(event) => event.buttons & 1 && onslide?.(index + 1)}
		>
			<Rectangle
				x={-B.pips.slack}
				y={-B.pips.slack}
				width={B.pips.pitch + B.pips.slack}
				height={B.pips.height + B.pips.slack * 2}
				backgroundColor={0x000000}
				backgroundAlpha={0.001}
			/>
			<Sprite
				key="ggUiIconBolt"
				width={B.pips.width}
				height={B.pips.height}
				alpha={index < tier ? 1 : B.pips.dimAlpha}
			/>
		</Container>
	{/each}

	{#if L.body}
		<Text
			text={body.toUpperCase()}
			x={L.width / 2}
			y={L.body.y}
			anchor={{ x: 0.5, y: 0 }}
			style={text(L.body.size, C.label, {
				lineHeight: L.body.lineHeight,
				wordWrap: true,
				wordWrapWidth: L.body.width,
			})}
		/>
	{/if}
	<Text text={price} x={L.price.x} y={L.price.y} anchor={0.5} style={text(L.price.size, C.text)} />

	<Container
		eventMode="static"
		cursor="pointer"
		x={centre.x}
		y={centre.y}
		pivot={centre}
		scale={{ x: press.scale, y: press.scale }}
		alpha={active ? B.button.activeAlpha : 1}
		onpointerdown={press.down}
		onpointerup={() => {
			press.up();
			onpress?.();
		}}
		onpointerupoutside={press.up}
		onpointerout={press.up}
	>
		<Graphics
			draw={(graphics) => {
				if (kind === 'buy') {
					const { lip } = B.button.buy;
					roundRectBand(graphics, button, lip.far - sink, 'below').fill({
						color: C.accent,
						alpha: lip.alpha,
					});
					roundRectBand(graphics, button, lip.near, 'below').fill({
						color: C.accent,
						alpha: lip.alpha,
					});
					graphics
						.roundRect(button.x, button.y, button.width, button.height, button.radius)
						.fill(C.accent);
				} else if (kind === 'activate') {
					const { border, lip, lipAlpha } = B.button.activate;
					roundRectBand(graphics, button, lip - sink, 'below').fill({
						color: C.ink,
						alpha: lipAlpha,
					});
					graphics
						.roundRect(
							button.x + border / 2,
							button.y + border / 2,
							button.width - border,
							button.height - border,
							button.radius - border / 2,
						)
						.fill(wash)
						.stroke({ width: border, fill: washBorder });
				} else {
					graphics
						.roundRect(button.x, button.y, button.width, button.height, button.radius)
						.fill(C.text);
				}
			}}
		/>
		<Text
			text={label}
			x={button.x + button.width / 2}
			y={button.y + button.height / 2}
			anchor={0.5}
			style={text(L.button.size, kind === 'activate' ? C.accent : C.ink)}
		/>
	</Container>
</Container>
