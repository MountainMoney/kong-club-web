import profile from './mathProfile.json';

export type MathOdds = {
	id: string;
	label: string;
	socialLabel?: string;
	percent: number;
};

export type MathMode = {
	id: string;
	label: string;
	socialLabel: string;
	cost: number;
	feature: boolean;
	buyBonus: boolean;
	rtp: number;
	maxWin: number;
	odds?: MathOdds[];
	measured?: boolean;
};

export type MathProfile = {
	rtp: number;
	maxWin: number;
	modes: MathMode[];
};

export const mathProfile = profile as MathProfile;

export const mathModes = mathProfile.modes;

export const mathMode = (id: string): MathMode => {
	const mode = mathModes.find((entry) => entry.id === id);
	if (!mode) throw new Error(`Unknown math mode "${id}"`);
	return mode;
};

/** Integer costs use thousands separators. 1.4 stays 1.4. */
export const formatMathCost = (cost: number): string => {
	const rounded = Math.round(cost * 100) / 100;
	if (Number.isInteger(rounded)) return rounded.toLocaleString('en-US');
	return rounded.toFixed(1);
};

export const formatMathPercent = (percent: number): string => {
	const rounded = Math.round(percent * 10) / 10;
	return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

export const modeLabel = (id: string, social = false): string => {
	const mode = mathMode(id);
	return social ? mode.socialLabel || mode.label : mode.label;
};

/** "50% dead spin, 45% Hear No Evil, 5% Monkey Madness" */
export const oddsText = (id: string, social = false): string => {
	const odds = mathMode(id).odds ?? [];
	return odds
		.map((outcome) => {
			const label = social && outcome.socialLabel ? outcome.socialLabel : outcome.label;
			return `${formatMathPercent(outcome.percent)}% ${label}`;
		})
		.join(', ');
};

export const rtpPercentLabel = (rtp: number): string => (rtp * 100).toFixed(2);

export const formatMaxWin = (maxWin: number): string => maxWin.toLocaleString('en-US');

/** Cap used by win presentation. Comes from the generated profile. */
export const PUBLISHED_MAX_WIN_X = mathProfile.maxWin;
