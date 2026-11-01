<script lang="ts">
	import { onMount } from 'svelte';
	import { Rectangle as PixiRectangle } from 'pixi.js';
	import { Container, Rectangle, Text } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { stateUi } from 'state-shared';

	import {
		AUTO_POPUP_ACTIVE_OVERLAY_ALPHA,
		AUTO_POPUP_BTN_FILL,
		AUTO_POPUP_BTN_STROKE,
		AUTO_POPUP_BTN_STROKE_ALPHA,
		AUTO_POPUP_CELL_H,
		AUTO_POPUP_COLS,
		AUTO_POPUP_CONTENT_W,
		AUTO_POPUP_FILL,
		AUTO_POPUP_FILL_ALPHA,
		AUTO_POPUP_GAP,
		AUTO_POPUP_HOVER_OVERLAY_ALPHA,
		AUTO_POPUP_PAD,
		AUTO_POPUP_ROWS,
		AUTO_POPUP_STROKE,
		AUTO_POPUP_STROKE_ALPHA,
		AUTO_POPUP_SUBTITLE_SIZE,
		AUTO_POPUP_TITLE_SIZE,
	} from '../../game/autoplayPopupTheme';
	import { ensureAileronFont } from '../../game/introFont';
	import { UI_FONT } from '../../game/uiFont';
	import { getPixiTextResolution, roundFontSize, roundPix } from '../../game/pixiTextCrisp';
	import { PILL_BORDER_RADIUS, PILL_STROKE_WIDTH } from '../../game/uiBarTheme';
	import { autoplayPopupTitle, autoplayRoundsLabel } from '../../game/socialCopy';

	const FONT = UI_FONT;
	let aileronReady = $state(false);

	const autoOptions = ['∞', '10', '25', '50', '75', '100', '500', '1000'] as const;

	type Props = {
		scale: number;
		x: number;
		y: number;
		onSelect: (option: (typeof autoOptions)[number]) => void;
	};

	const props: Props = $props();
	const sx = $derived(props.scale);
	const textRes = getPixiTextResolution();

	const pad = $derived(AUTO_POPUP_PAD * sx);
	const gap = $derived(AUTO_POPUP_GAP * sx);
	const contentW = $derived(AUTO_POPUP_CONTENT_W * sx);
	const outerW = $derived(contentW + pad * 2);

	const cellGap = $derived(gap);
	const cellW = $derived((contentW - cellGap * (AUTO_POPUP_COLS - 1)) / AUTO_POPUP_COLS);
	const cellH = $derived(AUTO_POPUP_CELL_H * sx);
	const gridH = $derived(AUTO_POPUP_ROWS * cellH + cellGap * (AUTO_POPUP_ROWS - 1));

	const titleSize = $derived(roundFontSize(AUTO_POPUP_TITLE_SIZE * sx));
	const subtitleSize = $derived(roundFontSize(AUTO_POPUP_SUBTITLE_SIZE * sx));
	const titleLineH = $derived(titleSize * 1.15);
	const subtitleLineH = $derived(subtitleSize * 1.2);

	const textBlockH = $derived(titleLineH + gap + subtitleLineH);
	const contentH = $derived(textBlockH + gap + gridH);
	const outerH = $derived(contentH + pad * 2);

	const contentLeftX = $derived(roundPix(-outerW + pad));
	const gridTopY = $derived(roundPix(-outerH + pad + textBlockH + gap));

	const titleStyle = $derived({
		fontFamily: aileronReady ? FONT : 'Arial',
		fontSize: titleSize,
		fontWeight: 'bold' as const,
		fill: 0xffffff,
	});
	const subtitleStyle = $derived({
		fontFamily: aileronReady ? FONT : 'Arial',
		fontSize: subtitleSize,
		fontWeight: 'bold' as const,
		fill: 0xffffff,
	});
	const cellLabelStyle = $derived({
		fontFamily: aileronReady ? FONT : 'Arial',
		fontSize: roundFontSize(12 * sx),
		fontWeight: 'bold' as const,
		fill: 0xffffff,
	});

	const isSelected = (opt: (typeof autoOptions)[number]) => stateUi.autoSpinsText === opt;

	onMount(() => {
		void ensureAileronFont().then(() => {
			aileronReady = true;
		});
	});
</script>



<!-- anchor bottom-right: aligns with toolbar right edge -->

<Container x={props.x} y={props.y} zIndex={100} eventMode="passive">

	<Rectangle

		anchor={{ x: 1, y: 1 }}

		width={outerW}

		height={outerH}

		borderRadius={PILL_BORDER_RADIUS}

		backgroundColor={AUTO_POPUP_FILL}

		backgroundAlpha={AUTO_POPUP_FILL_ALPHA}

		borderColor={AUTO_POPUP_STROKE}

		borderAlpha={AUTO_POPUP_STROKE_ALPHA}

		borderWidth={PILL_STROKE_WIDTH}

		eventMode="static"

	/>



	<Text

		anchor={{ x: 0, y: 0 }}

		x={contentLeftX}

		y={roundPix(-outerH + pad)}
		text={autoplayPopupTitle()}
		eventMode="none"
		style={titleStyle}
		resolution={textRes}
	/>
	<Text
		anchor={{ x: 0, y: 0 }}
		x={contentLeftX}
		y={roundPix(-outerH + pad + titleLineH + gap)}
		text={autoplayRoundsLabel()}
		eventMode="none"
		style={subtitleStyle}
		resolution={textRes}
	/>



	{#each autoOptions as opt, i (opt)}

		{@const col = i % AUTO_POPUP_COLS}

		{@const row = Math.floor(i / AUTO_POPUP_COLS)}

		{@const cx = contentLeftX + col * (cellW + cellGap) + cellW / 2}

		{@const cy = gridTopY + row * (cellH + cellGap) + cellH / 2}

		{@const selected = isSelected(opt)}
		{@const hitArea = new PixiRectangle(0, 0, cellW, cellH)}

		<Container x={cx} y={cy} eventMode="static">

			<Button
				anchor={0.5}
				sizes={{ width: cellW, height: cellH }}
				{hitArea}
				onpress={() => props.onSelect(opt)}
			>

				{#snippet children({ center, hovered })}

					<Container {...center} eventMode="none">

						<Rectangle

							anchor={0.5}

							width={cellW}

							height={cellH}

							borderRadius={4}

							backgroundColor={AUTO_POPUP_BTN_FILL}

							backgroundAlpha={1}

							borderColor={AUTO_POPUP_BTN_STROKE}

							borderAlpha={AUTO_POPUP_BTN_STROKE_ALPHA}

							borderWidth={1}

						/>

						{#if hovered && !selected}

							<Rectangle

								anchor={0.5}

								width={cellW}

								height={cellH}

								borderRadius={4}

								backgroundColor={0xffffff}

								backgroundAlpha={AUTO_POPUP_HOVER_OVERLAY_ALPHA}

							/>

						{/if}

						{#if selected}

							<Rectangle

								anchor={0.5}

								width={cellW}

								height={cellH}

								borderRadius={4}

								backgroundColor={0xffffff}

								backgroundAlpha={AUTO_POPUP_ACTIVE_OVERLAY_ALPHA}

							/>

							<Rectangle

								anchor={0.5}

								width={cellW}

								height={cellH}

								borderRadius={4}

								borderColor={0xffffff}

								borderAlpha={0.55}

								borderWidth={1}

							/>

						{/if}

						<Text anchor={0.5} text={opt} eventMode="none" style={cellLabelStyle} resolution={textRes} />
					</Container>

				{/snippet}

			</Button>

		</Container>

	{/each}

</Container>

