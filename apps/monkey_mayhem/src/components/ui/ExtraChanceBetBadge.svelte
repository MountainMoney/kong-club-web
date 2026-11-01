<script lang="ts">
	import { Container, Rectangle, Sprite, Text } from 'pixi-svelte';

	import {
		ANTE_ACCENT_FILL,
		ANTE_VALUE_FILL,
		PILL_BORDER_RADIUS,
		PILL_FILL,
		PILL_STROKE,
		PILL_STROKE_ALPHA,
		PILL_STROKE_WIDTH,
	} from '../../game/uiBarTheme';
	import { extraChanceCostLabel } from '../../game/betModes';
	import { getPixiTextResolution } from '../../game/pixiTextCrisp';
	import { UI_FONT } from '../../game/uiFont';

	type Props = {
		uiScale: number;
		/** Portrait centers the badge; landscape left-aligns with BET label. */
		centered?: boolean;
	};

	const props: Props = $props();

	const FONT = UI_FONT;
	const textRes = getPixiTextResolution();
	const costText = extraChanceCostLabel();

	const badgeH = $derived(26 * props.uiScale);
	const badgeW = $derived(78 * props.uiScale);
	const trophySize = $derived(20 * props.uiScale);
	const pillW = $derived(28 * props.uiScale);
	const pillH = $derived(14 * props.uiScale);
	const fontSize = $derived(9 * props.uiScale);
	const anchorX = $derived(props.centered ? 0.5 : 0);
</script>

<Container anchor={{ x: anchorX, y: 0.5 }}>
	<Rectangle
		anchor={{ x: anchorX, y: 0.5 }}
		width={badgeW}
		height={badgeH}
		borderRadius={PILL_BORDER_RADIUS * props.uiScale}
		backgroundColor={PILL_FILL}
		backgroundAlpha={0.78}
		borderColor={PILL_STROKE}
		borderAlpha={PILL_STROKE_ALPHA}
		borderWidth={PILL_STROKE_WIDTH}
	/>
	<Rectangle
		anchor={{ x: anchorX, y: 0.5 }}
		x={(props.centered ? -badgeW / 2 : 0) + 3 * props.uiScale}
		width={3 * props.uiScale}
		height={badgeH - 6 * props.uiScale}
		borderRadius={2 * props.uiScale}
		backgroundColor={ANTE_ACCENT_FILL}
		backgroundAlpha={0.95}
	/>
	<Sprite
		key="sym_S"
		anchor={0.5}
		x={(props.centered ? -badgeW / 2 : 0) + trophySize * 0.9}
		width={trophySize}
		height={trophySize}
	/>
	<Rectangle
		anchor={0.5}
		x={(props.centered ? badgeW / 2 : badgeW) - pillW * 0.65}
		width={pillW}
		height={pillH}
		borderRadius={pillH / 2}
		backgroundColor={ANTE_ACCENT_FILL}
		backgroundAlpha={1}
		borderColor={ANTE_VALUE_FILL}
		borderAlpha={0.9}
		borderWidth={1}
	/>
	<Text
		anchor={0.5}
		x={(props.centered ? badgeW / 2 : badgeW) - pillW * 0.65}
		text={costText}
		style={{
			fontFamily: FONT,
			fontSize,
			fontWeight: '900',
			fill: 0xffffff,
		}}
		resolution={textRes}
	/>
</Container>
