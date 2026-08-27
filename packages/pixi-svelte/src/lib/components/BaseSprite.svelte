<script lang="ts" module>
	import * as PIXI from 'pixi.js';

	import type { OverwriteCursor } from '../types';

	export type Props = OverwriteCursor<PIXI.SpriteOptions> & {
		isMask?: boolean;
	};
</script>

<script lang="ts">
	import { getContext } from 'svelte';
	import { propsSyncEffect } from '../utils.svelte';
	import { getContextParent } from '../context.svelte';

	const props: Props = $props();

	const parentContext = getContext('@@pixi_parent') as ReturnType<typeof getContextParent>;
	const sprite = new PIXI.Sprite(props.texture);

	propsSyncEffect({ props, target: sprite, ignore: ['isMask'] });

	$effect(() => {
		if (props.isMask !== undefined) {
			parentContext.parent.mask = props.isMask ? sprite : null;
		}
	});

	parentContext.addToParent(sprite);
</script>
