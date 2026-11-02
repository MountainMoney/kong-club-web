<script lang="ts">
	import { Authenticate, LoadI18n } from 'components-shared';

	import Game from './Game.svelte';
	import messagesMap from '../i18n/messagesMap';
	import { initKongClubBetModes, normalizeAuthResumeBetState } from '../game/betModes';

	initKongClubBetModes();
</script>

<Authenticate onAuthenticated={normalizeAuthResumeBetState}>
	<LoadI18n {messagesMap}>
		<Game />
	</LoadI18n>
</Authenticate>
