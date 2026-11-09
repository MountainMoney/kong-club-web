<script lang="ts">
	/** Slot split + clip driver for one GgFoliage rig (see GgFoliage.svelte). */
	import { getContextSpine } from 'pixi-svelte';

	type Props = {
		part: 'top' | 'bottom';
		hideMask: boolean;
		play: boolean;
		exiting: boolean;
	};

	const { part, hideMask, play, exiting }: Props = $props();

	const spine = getContextSpine();
	const BOTTOM_SLOT = /^co niz/;
	const MASK_SLOT = 'co mask';

	const hiddenSlots = spine.skeleton.slots.filter((slot) => {
		const name = slot.data.name;
		if (name === MASK_SLOT) return hideMask;
		const isBottom = BOTTOM_SLOT.test(name);
		return part === 'bottom' ? !isBottom : isBottom;
	});

	const applyHidden = () => {
		for (const slot of hiddenSlots) slot.color.a = 0;
	};
	applyHidden();
	spine.beforeUpdateWorldTransforms = applyHidden;

	let started = false;
	let exited = false;

	$effect(() => {
		if (!play || started) return;
		started = true;
		spine.state.setAnimation(0, 'entery', false);
		spine.state.addAnimation(0, 'loop', true, 0);
	});

	$effect(() => {
		if (!exiting || exited || !started) return;
		exited = true;
		spine.state.setAnimation(0, 'exit', false);
	});
</script>
