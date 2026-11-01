<script lang="ts" module>
	export type EmitterEventTransition = { type: 'transition' };
</script>

<script lang="ts">
	import { getContext } from '../game/context';

	const context = getContext();

	/** FS / mode changes — no mining rock spine; resolve immediately. */
	context.eventEmitter.subscribeOnMount({
		transition: async () => {},
	});
</script>
