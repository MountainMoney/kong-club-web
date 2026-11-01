<script lang="ts">
	import { Authenticate, LoaderStakeEngine, LoadI18n } from 'components-shared';

	import Game from './Game.svelte';
	import messagesMap from '../i18n/messagesMap';
	import { stateApp } from '../game/stateApp';
	import { initKongClubBetModes, normalizeAuthResumeBetState } from '../game/betModes';

	/** Prefer static/ so Vite serves it; fall back to app-root copy for Stake packaging. */
	const loaderUrlStakeEngine = '/stake-engine-loader.gif';

	initKongClubBetModes();
</script>

<Authenticate onAuthenticated={normalizeAuthResumeBetState}>
	<LoadI18n {messagesMap}>
		<Game />
	</LoadI18n>
</Authenticate>

<LoaderStakeEngine src={loaderUrlStakeEngine} complete={stateApp.loaded} />
