import { defineMeta } from '@storybook/addon-svelte-csf';

import Game from '../../components/Game.svelte';
import { setContext } from '../../game/context';
import { playBookEvent } from '../../game/utils';
import events from '../data/monkey_events';

const { Story } = defineMeta({
	title: 'MODE_BASE/bookEvent/monkey',
	component: Game,
	parameters: { layout: 'fullscreen' },
	beforeEach: () => setContext(),
});

const templateArgs = (data: object) => ({
	parameters: { chromatic: { disableSnapshot: false } },
	args: { skipLoadingScreen: true, data, action: async (d: object) => playBookEvent(d, { bookEvents: [] }) },
});

export default { Story };

export const UpdateLevelUpTiles = Story(templateArgs(events.updateLevelUpTiles));
export const ProgressFill = Story(templateArgs(events.progressFill));
export const BoardActivation = Story(templateArgs(events.boardActivation));
export const CoinSeed = Story(templateArgs(events.coinSeed));
export const ScatterPayout = Story(templateArgs(events.scatterPayout));
export const StickyWilds = Story(templateArgs(events.stickyWilds));
export const KongClubMode = Story(templateArgs(events.kongClubMode));
