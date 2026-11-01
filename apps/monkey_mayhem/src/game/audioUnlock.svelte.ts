/** Browser autoplay policy: no SFX/BGM until the player has interacted. */
const AUDIO_UNLOCK_KEY = 'mm_audio_unlocked';

export const stateAudioUnlock = $state({
	unlocked: false,
});

const persistAudioUnlock = () => {
	if (typeof window === 'undefined') return;
	try {
		sessionStorage.setItem(AUDIO_UNLOCK_KEY, '1');
	} catch {
		/* ignore */
	}
};

export const hasPersistedAudioUnlock = () => {
	if (typeof window === 'undefined') return false;
	try {
		return sessionStorage.getItem(AUDIO_UNLOCK_KEY) === '1';
	} catch {
		return false;
	}
};

export const unlockGameAudio = () => {
	if (stateAudioUnlock.unlocked) return;
	stateAudioUnlock.unlocked = true;
	persistAudioUnlock();
};

export const isGameAudioUnlocked = () => stateAudioUnlock.unlocked;
