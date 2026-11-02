import type { BookEvent, BookEventOfType } from './typesBookEvent';

/**
 * Current books emit `kongClubMode`. Compressed publish books from before the
 * rename still emit `monkeyMayhemMode`. Both carry the same fields
 * (`index`, `state`, `mode`, `gameType`) and must play identically.
 */
export const MODE_STATE_EVENT_TYPES = ['kongClubMode', 'monkeyMayhemMode'] as const;

export type ModeStateEventType = (typeof MODE_STATE_EVENT_TYPES)[number];

export type ModeStateBookEvent =
	| BookEventOfType<'kongClubMode'>
	| BookEventOfType<'monkeyMayhemMode'>;

const MODE_STATE_EVENT_TYPE_SET = new Set<string>(MODE_STATE_EVENT_TYPES);

export const isModeStateBookEvent = (event: { type: string }): event is ModeStateBookEvent =>
	MODE_STATE_EVENT_TYPE_SET.has(event.type);

export const findLastModeStateBookEvent = (bookEvents: readonly BookEvent[]) => {
	for (let index = bookEvents.length - 1; index >= 0; index -= 1) {
		const event = bookEvents[index];
		if (event && isModeStateBookEvent(event)) return event;
	}
	return undefined;
};
