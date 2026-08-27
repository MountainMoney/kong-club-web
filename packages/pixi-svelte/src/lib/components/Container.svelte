<script lang="ts" module>
	import * as PIXI from 'pixi.js';
	import type { Snippet } from 'svelte';

	import type { OverwriteCursor } from '../types';

	export type Props = OverwriteCursor<Omit<PIXI.ContainerOptions, 'children'>> & {
		children: Snippet;
	};
</script>

<script lang="ts">
	import { getContext } from 'svelte';
	import { propsSyncEffect } from '../utils.svelte';
	import { createContextParent } from '../context.svelte';

	const props: Props = $props();
	const parentContext = getContext('@@pixi_parent') as ReturnType<typeof createContextParent>;
	const container = new PIXI.Container();

	propsSyncEffect({ props, target: container, ignore: ['children'] });
	parentContext.addToParent(container);
	createContextParent(container);
</script>

{@render props.children()}
