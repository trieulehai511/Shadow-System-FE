import { useCallback, useEffect, useRef, useState } from 'react';
import { getMySettings } from '../services/settingService';

const SOUND_PATHS = {
    selectConfirm: '/sounds/select-confirm.wav',
    cancel: '/sounds/cancel.wav',
    generateQuest: '/sounds/generate-quest.wav',
    countdown5s: '/sounds/countdown-5s-phase-transition.wav',
    setComplete: '/sounds/set-complete.wav',
    reward: '/sounds/reward.wav',
} as const;

type SoundName = keyof typeof SOUND_PATHS;

export function useSoundEffects() {
    const [soundEnabled, setSoundEnabled] = useState(true);
    const playersRef = useRef<Partial<Record<SoundName, HTMLAudioElement>>>({});

    useEffect(() => {
        let active = true;

        const syncSoundPreference = async () => {
            try {
                const settings = await getMySettings();
                if (active) setSoundEnabled(settings.soundEnabled ?? true);
            } catch (error) {
                console.warn('Unable to load sound preference:', error);
            }
        };

        void syncSoundPreference();
        window.addEventListener('settingsUpdated', syncSoundPreference);

        return () => {
            active = false;
            window.removeEventListener('settingsUpdated', syncSoundPreference);
        };
    }, []);

    const play = useCallback((name: SoundName, startAt = 0) => {
        if (!soundEnabled) return;

        try {
            const player = playersRef.current[name] ?? new Audio(SOUND_PATHS[name]);
            playersRef.current[name] = player;
            player.currentTime = startAt;
            void player.play().catch(() => {
                // Browsers may reject playback before the first user interaction.
            });
        } catch {
            // Audio feedback must never block the related user action.
        }
    }, [soundEnabled]);

    return {
        playSelectConfirm: useCallback(() => play('selectConfirm'), [play]),
        playCancel: useCallback(() => play('cancel'), [play]),
        playGenerateQuest: useCallback(() => play('generateQuest'), [play]),
        playCountdown5s: useCallback((startAt = 0) => play('countdown5s', startAt), [play]),
        playSetComplete: useCallback(() => play('setComplete'), [play]),
        playReward: useCallback(() => play('reward'), [play]),
    };
}
