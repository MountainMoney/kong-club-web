import type { BookEvent } from './typesBookEvent';
import { isModeStateBookEvent } from './modeStateEvent';
import { normalizeLegacyBetModeKey } from './betModes';
import { scatterPositionsFromBoard } from './scatterAnticipation';
import { startMathBooksLoading, stopMathBooksLoading } from './stateMathBooksLoading.svelte';

export type MathBook = {
	id: number;
	payoutMultiplier: number;
	events: BookEvent[];
};

type LutEntry = { index: number; weight: number; payout: number };

type ModeCache = {
	books: MathBook[];
	lutEntries: LutEntry[];
};

type ModeCacheEntry = ModeCache & { revision: string };

const modeCache = new Map<string, ModeCacheEntry>();
const lastPickedBookIndexByMode = new Map<string, number>();
const forcedNextBookIndexByMode = new Map<string, number>();
let booksRevision: string | undefined;

/** Bust in-memory book cache when `.cache/math-books` is rewarmed. */
async function getBooksRevision(): Promise<string> {
	try {
		const res = await fetch(`/__math/meta?t=${Date.now()}`);
		if (res.ok) {
			const meta = (await res.json()) as { generatedAt?: string; revision?: string };
			return String(meta.revision ?? meta.generatedAt ?? Date.now());
		}
	} catch {
		/* fall through */
	}
	return String(Date.now());
}

async function loadModeData(rawMode: string): Promise<ModeCache> {
	const mode = normalizeLegacyBetModeKey(rawMode);
	const revision = await getBooksRevision();
	if (booksRevision !== revision) {
		modeCache.clear();
		booksRevision = revision;
	}

	const cached = modeCache.get(mode);
	if (cached && cached.revision === revision) return cached;

	startMathBooksLoading(mode);
	try {
		const [booksRes, lutRes] = await Promise.all([
			fetch(`/__math/books/${mode}?v=${encodeURIComponent(revision)}`),
			fetch(`/__math/lut/${mode}?v=${encodeURIComponent(revision)}`),
		]);

		if (!booksRes.ok) {
			throw new Error(`Failed to load math books for "${mode}": ${booksRes.status}`);
		}
		if (!lutRes.ok) {
			throw new Error(`Failed to load math LUT for "${mode}": ${lutRes.status}`);
		}

		const books = (await booksRes.json()) as MathBook[];
		if (!Array.isArray(books) || books.length === 0) {
			throw new Error(`Invalid math books payload for mode "${mode}".`);
		}

		const { entries } = (await lutRes.json()) as { entries: LutEntry[] };
		if (!Array.isArray(entries) || entries.length === 0) {
			throw new Error(`Invalid math LUT payload for mode "${mode}".`);
		}

		const data: ModeCacheEntry = { books, lutEntries: entries, revision };
		modeCache.set(mode, data);
		return data;
	} finally {
		stopMathBooksLoading(mode);
	}
}

function pickLutEntry(entries: LutEntry[], excludedIndex?: number): LutEntry {
	const candidates =
		excludedIndex === undefined || entries.length <= 1
			? entries
			: entries.filter((entry) => entry.index !== excludedIndex);
	const totalWeight = candidates.reduce((sum, entry) => sum + entry.weight, 0);
	let roll = Math.random() * totalWeight;

	for (const entry of candidates) {
		roll -= entry.weight;
		if (roll <= 0) return entry;
	}

	return candidates[candidates.length - 1] ?? entries[entries.length - 1]!;
}

/** FX Lab: force the next pickMathBook call to return this book index. */
export const setForcedNextBookIndex = (mode: string, index: number | null) => {
	const key = normalizeLegacyBetModeKey(mode);
	if (index == null) {
		forcedNextBookIndexByMode.delete(key);
		return;
	}
	forcedNextBookIndexByMode.set(key, index);
};

/** Find first book containing an event type (FX Lab helpers). */
export async function findFirstBookWithEvent(
	mode: string,
	eventType: BookEvent['type'],
): Promise<number | null> {
	const { books } = await loadModeData(mode);
	const idx = books.findIndex((book) => book.events.some((e) => e.type === eventType));
	return idx >= 0 ? idx : null;
}

const POWER_BOOK_MODES = [
	'feature_spin',
	'peak_spin',
	'bonus_see',
	'bonus_hear',
	'base_ante',
	'base',
] as const;

const bookHasCoinKind = (book: MathBook, kind: 'multiplier' | 'collector') =>
	book.events.some((event) => {
		if (event.type !== 'boardActivation') return false;
		const items = event.coinFeature?.items ?? [];
		if (items.some((item) => item.kind === kind)) return true;
		const rounds = event.coinFeature?.rounds;
		if (!Array.isArray(rounds)) return false;
		return rounds.some((round) => (round.items ?? []).some((item) => item.kind === kind));
	});

/** First live book that actually rolled MULTI or COLLECTOR. */
export async function findFirstBookWithCoinKind(
	kind: 'multiplier' | 'collector',
	modes: readonly string[] = POWER_BOOK_MODES,
): Promise<{ mode: string; index: number } | null> {
	for (const mode of modes) {
		const { books } = await loadModeData(mode);
		const index = books.findIndex((book) => bookHasCoinKind(book, kind));
		if (index >= 0) return { mode, index };
	}
	return null;
}

/** Find first book with a mode-state event (`kongClubMode` or `monkeyMayhemMode`). */
export async function findFirstBookWithModeState(
	mode: string,
	stateIncludes: string,
): Promise<number | null> {
	const { books } = await loadModeData(mode);
	const idx = books.findIndex((book) =>
		book.events.some((event) => isModeStateBookEvent(event) && event.state.includes(stateIncludes)),
	);
	return idx >= 0 ? idx : null;
}

/** First book whose opening reveal has at least `minVisible` scatters on the 6×5. */
export async function findFirstBookWithScatterCount(
	mode: string,
	minVisible: number,
): Promise<number | null> {
	const { books } = await loadModeData(mode);
	const idx = books.findIndex((book) => {
		const reveal = book.events.find((event) => event.type === 'reveal');
		if (!reveal || reveal.type !== 'reveal') return false;
		return scatterPositionsFromBoard(reveal.board).length >= minVisible;
	});
	return idx >= 0 ? idx : null;
}

const SPEAK_TRIGGER_STATES = new Set([
	'start_bonus_madness',
	'organic_bonus_madness',
	'start_bonus_speak',
	'organic_bonus_speak',
	'start_bonus_speak_no_evil',
	'organic_bonus_speak_no_evil',
]);
const MADNESS_TRIGGER_MODES = ['bonus_mystery', 'base', 'base_ante'] as const;

const isMadnessTriggerBook = (book: MathBook) => {
	const reveal = book.events.find((event) => event.type === 'reveal');
	if (!reveal || reveal.type !== 'reveal' || reveal.gameType !== 'basegame') return false;
	if (scatterPositionsFromBoard(reveal.board).length < 5) return false;
	const modeEvent = book.events.find(isModeStateBookEvent);
	if (!modeEvent) return false;
	return SPEAK_TRIGGER_STATES.has(modeEvent.state) || modeEvent.state.toLowerCase().includes('speak');
};

/** Trigger book only — not a mid-bonus FS row that still has tablets on a kept board. */
export async function findFirstMadnessTriggerBook(): Promise<{
	mode: string;
	index: number;
} | null> {
	for (const mode of MADNESS_TRIGGER_MODES) {
		const { books } = await loadModeData(mode);
		const index = books.findIndex(isMadnessTriggerBook);
		if (index >= 0) return { mode, index };
	}
	return null;
}

export async function pickMathBook(mode: string): Promise<MathBook> {
	const key = normalizeLegacyBetModeKey(mode);
	const { books, lutEntries } = await loadModeData(key);

	if (!lutEntries.length) {
		throw new Error(`No LUT entries for mode "${key}" matching loaded books.`);
	}

	const forcedIndex = forcedNextBookIndexByMode.get(key);
	if (forcedIndex != null) {
		forcedNextBookIndexByMode.delete(key);
		const book = books[forcedIndex];
		if (!book) {
			throw new Error(`Forced book index ${forcedIndex} missing for mode "${key}".`);
		}
		lastPickedBookIndexByMode.set(key, forcedIndex);
		return book;
	}

	const lutPick = pickLutEntry(lutEntries, lastPickedBookIndexByMode.get(key));
	const book = books[lutPick.index];

	if (!book) {
		throw new Error(`LUT index ${lutPick.index} has no book for mode "${key}".`);
	}

	lastPickedBookIndexByMode.set(key, lutPick.index);
	return book;
}

export async function prefetchMathBooksMode(mode: string) {
	await loadModeData(mode);
}

export async function getMathBookByIndex(mode: string, index: number): Promise<MathBook> {
	const { books } = await loadModeData(mode);
	const book = books[index];
	if (!book) {
		throw new Error(`No book at index ${index} for mode "${mode}".`);
	}
	return book;
}
