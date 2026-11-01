<script lang="ts">
	import { Container, Text } from 'pixi-svelte';

	import { UI_THEME } from '../../game/uiTheme';

	type Props = {
		label: string;
		value: string;
	};

	const props: Props = $props();
</script>

<Container>
	<Text
		anchor={{ x: 0, y: 0 }}
		text={props.label}
		style={{
			fontFamily: 'Inter',
			fontSize: 14,
			fontWeight: '700',
			fill: UI_THEME.labelFill,
			letterSpacing: 1,
		}}
	/>
	<Text
		anchor={{ x: 0, y: 0 }}
		y={22}
		text={props.value}
		style={{
			fontFamily: 'Inter',
			fontSize: 28,
			fontWeight: '800',
			fill: UI_THEME.valueFill,
		}}
	/>
</Container>
