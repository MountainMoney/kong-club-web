<script lang="ts">
	import { onMount } from 'svelte';
	import { getContextSpine } from 'pixi-svelte';

	import { hideBarrelGuang, measureBarrelArtFit, type BarrelArtFit } from '../game/barrelWildFit';

	type Props = {
		target: number;
		onfit: (fit: BarrelArtFit | null) => void;
	};

	const props: Props = $props();
	const spine = getContextSpine();

	onMount(() => {
		props.onfit(measureBarrelArtFit(spine, props.target));
		const previous = spine.beforeUpdateWorldTransforms;
		spine.beforeUpdateWorldTransforms = () => {
			previous?.();
			hideBarrelGuang(spine);
		};
		hideBarrelGuang(spine);
	});
</script>
