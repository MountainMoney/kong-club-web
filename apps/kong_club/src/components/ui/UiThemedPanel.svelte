<script lang="ts">
	import type { Snippet } from 'svelte';

	import { Container, Rectangle } from 'pixi-svelte';

	import { UI_THEME } from '../../game/uiTheme';

	type Props = {
		width: number;
		height: number;
		children: Snippet;
	};

	const props: Props = $props();
</script>

<Container>
	<Rectangle
		width={props.width}
		height={props.height}
		borderRadius={10}
		backgroundColor={UI_THEME.barBg}
		backgroundAlpha={0.95}
		borderColor={UI_THEME.gold}
		borderWidth={2}
	/>
	<Container x={props.width * 0.5} y={props.height * 0.5}>
		{@render props.children()}
	</Container>
</Container>
