import { Spring } from 'svelte/motion';

import { PRESS } from './constants';

export const createPress = () => {
	const scale = new Spring(1, { stiffness: PRESS.stiffness, damping: PRESS.damping });
	return {
		get scale() {
			return scale.current;
		},
		down: () => {
			scale.target = PRESS.scale;
		},
		up: () => {
			scale.target = 1;
		},
	};
};
