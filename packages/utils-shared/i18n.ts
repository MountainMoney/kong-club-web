import _ from 'lodash';
import type { Messages } from '@lingui/core';

import type { Language } from 'state-shared';

export type MessagesMap = Record<Language, Messages>;

export const mergeMessagesMaps = (messagesMapList: MessagesMap[]) => {
	const merged = messagesMapList
		.filter(Boolean)
		.reduce((acc, current) => _.merge(acc, current), {} as MessagesMap);

	return merged;
};

/** True when every reference key has a non-empty translation. */
export const isLocaleComplete = (
	localeMessages: Messages | undefined,
	referenceMessages: Messages,
): boolean => {
	if (!localeMessages) return false;
	return Object.keys(referenceMessages).every(
		(key) => typeof localeMessages[key] === 'string' && localeMessages[key].length > 0,
	);
};

/** Use English when a non-English catalog is missing keys (avoids mixed unsafe fallbacks). */
export const resolveLocaleMessages = (
	requestedLang: Language,
	messagesMap: MessagesMap,
): { locale: Language; messages: Messages } => {
	const enMessages = messagesMap.en ?? {};
	if (requestedLang === 'en') {
		return { locale: 'en', messages: enMessages };
	}

	const candidate = messagesMap[requestedLang];
	if (isLocaleComplete(candidate, enMessages)) {
		return { locale: requestedLang, messages: candidate as Messages };
	}

	if (import.meta.env.DEV) {
		const missing = Object.keys(enMessages).filter(
			(key) => typeof candidate?.[key] !== 'string' || !candidate[key],
		);
		console.warn(
			`[i18n] Locale "${requestedLang}" is incomplete (${missing.length} missing keys); using English.`,
			missing.slice(0, 25),
		);
	}

	return { locale: 'en', messages: enMessages };
};
