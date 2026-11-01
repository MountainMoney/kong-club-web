import { stateModal } from 'state-shared';

import { insufficientSpinBalanceMessage } from './socialCopy';

export const showInsufficientBalanceModal = (
	message: string = insufficientSpinBalanceMessage(),
) => {
	stateModal.modal = {
		name: 'insufficientBalance',
		message,
	};
};
