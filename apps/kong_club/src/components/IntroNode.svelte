<script lang="ts">
	/** Mounts an imperative pixi node at this point of the pixi-svelte tree. */
	import type { Container } from 'pixi.js';
	import { getContextParent } from 'pixi-svelte';

	const { node }: { node: Container } = $props();
	getContextParent().addToParent(node);
</script>
