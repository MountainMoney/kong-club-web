<script lang="ts">
	import { Container, Rectangle, Text } from 'pixi-svelte';

	type Props = {
		label: string;
		value: string;
		width?: number;
		height?: number;
	};

	const props: Props = $props();
	const w = $derived(props.width ?? 200);
	const h = $derived(props.height ?? 68);
</script>

<Container>
	<Rectangle
		width={w}
		height={h}
		borderRadius={h * 0.5}
		backgroundColor={0x1a1a1a}
		backgroundAlpha={0.92}
		borderColor={0x333333}
		borderWidth={1}
	/>
	<Text
		x={16}
		y={12}
		text={props.label}
		style={{
			fontFamily: 'Inter',
			fontSize: 13,
			fontWeight: '700',
			fill: 0xb0bec5,
			letterSpacing: 0.5,
		}}
	/>
	<Text
		x={16}
		y={34}
		text={props.value}
		style={{
			fontFamily: 'Inter',
			fontSize: 24,
			fontWeight: '800',
			fill: 0xffffff,
		}}
	/>
</Container>
