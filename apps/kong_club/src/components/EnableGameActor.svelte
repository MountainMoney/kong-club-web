<script lang="ts">
	import { onMount } from 'svelte';

	import { Text } from 'pixi-svelte';

	import { getGameActor } from '../game/actor';
	import { getContext } from '../game/context';
	import { stateGameplayLock, unlockGameplayInput } from '../game/gameplayLock.svelte';
	import { stateUi } from 'state-shared';

	type Props = {
		debug?: boolean;
	};

	const props: Props = $props();
	const context = getContext();

	onMount(() => {
		const gameActor = getGameActor();
		const { unsubscribe } = gameActor.subscribe((snapshot) => {
			context.stateXstate.value = snapshot.value;
			if (snapshot.matches('idle')) {
				unlockGameplayInput();
			}
		});

		gameActor.start();
		gameActor.send({ type: 'RENDERED' });

		return () => {
			// Equivalent to onDestroy(); Leave this comment for searching.
			unsubscribe();
			gameActor.stop();
		};
	});

	context.eventEmitter.subscribeOnMount({
		// Connect every actor with app.eventEmitter to avoid call actor directly
		bet: () => {
			if (stateUi.config.mode === 'replay') return;
			if (!stateGameplayLock.locked) return;
			getGameActor().send({ type: 'BET' });
		},
		autoBet: () => {
			if (stateUi.config.mode === 'replay') return;
			if (!stateGameplayLock.locked) return;
			getGameActor().send({ type: 'AUTO_BET' });
		},
		resumeBet: () => getGameActor().send({ type: 'RESUME_BET' }),
	});
</script>

{#if props.debug}
	<Text
		x={context.stateLayoutDerived.canvasSizes().width}
		anchor={{ x: 1, y: 0 }}
		style={{ fill: 0xffffff }}
		text={JSON.stringify(context.stateXstate.value, undefined, 2)}
	/>
{/if}
