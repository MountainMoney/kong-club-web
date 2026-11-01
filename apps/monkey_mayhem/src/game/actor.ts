import { browser } from '$app/environment';

import { gameActor as gameActorLocal } from './actorLocal';
import { gameActor as gameActorRgs } from './actorRgs';

const isStakeRoute = () =>
	browser && window.location.pathname.replace(/\/$/, '').endsWith('/stake');

const isStakeLaunch = () =>
	browser &&
	Boolean(
		new URLSearchParams(window.location.search).get('sessionID') &&
			new URLSearchParams(window.location.search).get('rgs_url'),
	);

const isReplayLaunch = () =>
	browser && new URLSearchParams(window.location.search).get('replay') === 'true';

export const isDemoPlay = () =>
	browser && !isReplayLaunch() && !isStakeRoute() && !isStakeLaunch();

/** Resolve demo vs RGS actor at call time (URL can change after module import). */
export const getGameActor = () => (isDemoPlay() ? gameActorLocal : gameActorRgs);
