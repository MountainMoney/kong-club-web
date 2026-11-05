import type { BookEvent } from './typesBookEvent';

/**
 * Event-type renames. Playback already accepts `kongClubMode` and
 * `monkeyMayhemMode`. Newer books may use a Speak No Evil type name
 * with the same fields.
 */
const EVENT_TYPE_ALIASES: Record<string, BookEvent['type']> = {
	speakNoEvilMode: 'kongClubMode',
	speakMode: 'kongClubMode',
	monkeyMadnessMode: 'kongClubMode',
	madnessMode: 'kongClubMode',
	mayhemMode: 'kongClubMode',
	monkeyMayhemState: 'kongClubMode',
};

export const aliasBookEventType = (type: string): string => EVENT_TYPE_ALIASES[type] ?? type;

/** Drop unknown event types so a new math book cannot hard-stop the round. */
export const normalizeBookEvents = (
	events: readonly { type: string }[],
	knownTypes: ReadonlySet<string>,
): BookEvent[] => {
	const playable: BookEvent[] = [];
	for (const event of events) {
		const type = aliasBookEventType(event.type);
		if (!knownTypes.has(type)) {
			console.warn(`[kong-club] skipping unknown book event "${event.type}"`);
			continue;
		}
		if (type === event.type) {
			playable.push(event as BookEvent);
			continue;
		}
		playable.push({ ...event, type } as BookEvent);
	}
	return playable;
};
