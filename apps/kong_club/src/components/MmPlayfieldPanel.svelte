<script lang="ts">
	import { Graphics } from 'pixi-svelte';

	import { drawMmPlaquePanel } from '../game/mmPlayfieldUiTheme';

	type Props = {
		width: number;
		height: number;
		pulse?: number;
	};

	const props: Props = $props();
</script>

<Graphics draw={(g) => drawMmPlaquePanel(g, props.width, props.height, props.pulse ?? 0)} />
