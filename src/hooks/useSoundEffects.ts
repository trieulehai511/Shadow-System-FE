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

const TRAINING_MUSIC_PATHS = [
    '/music/March_of_the_Unbroken.mp3',
    '/music/Copper_Knuckles.mp3',
] as const;
const TRAINING_MUSIC_VOLUME = 0.55;
const REST_MUSIC_PATH = '/music/Paperback_Afternoon.mp3';
const REST_MUSIC_VOLUME = 0.45;

const pickNextTrackIndex = (currentIndex: number) => {
    if (TRAINING_MUSIC_PATHS.length <= 1) return 0;

    const nextOffset = 1 + Math.floor(Math.random() * (TRAINING_MUSIC_PATHS.length - 1));
    return (currentIndex + nextOffset) % TRAINING_MUSIC_PATHS.length;
};

type SoundName = keyof typeof SOUND_PATHS;

export function useSoundEffects() {
    const [soundEnabled, setSoundEnabled] = useState(true);
    const playersRef = useRef<Partial<Record<SoundName, HTMLAudioElement>>>({});
    const trainingMusicRef = useRef<HTMLAudioElement | null>(null);
    const restMusicRef = useRef<HTMLAudioElement | null>(null);

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

    useEffect(() => {
        if (!soundEnabled) {
            trainingMusicRef.current?.pause();
            restMusicRef.current?.pause();
        }
    }, [soundEnabled]);

    useEffect(() => {
        let trackIndex = Math.floor(Math.random() * TRAINING_MUSIC_PATHS.length);
        const player = new Audio(TRAINING_MUSIC_PATHS[trackIndex]);
        player.loop = false;
        player.volume = TRAINING_MUSIC_VOLUME;
        trainingMusicRef.current = player;

        const playNextTrack = () => {
            trackIndex = pickNextTrackIndex(trackIndex);
            player.src = TRAINING_MUSIC_PATHS[trackIndex];
            player.currentTime = 0;
            void player.play().catch(() => {
                // Playback can be retried by the next workout interaction.
            });
        };

        player.addEventListener('ended', playNextTrack);

        return () => {
            player.pause();
            player.removeEventListener('ended', playNextTrack);
            trainingMusicRef.current = null;
        };
    }, []);

    useEffect(() => {
        const player = new Audio(REST_MUSIC_PATH);
        player.loop = true;
        player.volume = REST_MUSIC_VOLUME;
        restMusicRef.current = player;

        return () => {
            player.pause();
            restMusicRef.current = null;
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

    const startTrainingMusic = useCallback(() => {
        if (!soundEnabled) return;

        try {
            const player = trainingMusicRef.current;
            if (!player) return;

            if (player.muted) {
                player.currentTime = 0;
                player.muted = false;
            }
            void player.play().catch(() => {
                // Browsers may reject playback before the first user interaction.
            });
        } catch {
            // Background music must never block the workout timer.
        }
    }, [soundEnabled]);

    const unlockTrainingMusic = useCallback(() => {
        if (!soundEnabled) return;

        try {
            const player = trainingMusicRef.current;
            if (!player) return;

            player.currentTime = 0;
            player.muted = true;
            void player.play().catch(() => {
                // A later direct interaction can retry if this browser still blocks it.
            });

            const restPlayer = restMusicRef.current;
            if (restPlayer) {
                restPlayer.currentTime = 0;
                restPlayer.muted = true;
                void restPlayer.play().catch(() => {
                    // A later direct interaction can retry if this browser still blocks it.
                });
            }
        } catch {
            // Audio unlocking must never block the preparation countdown.
        }
    }, [soundEnabled]);

    const stopTrainingMusic = useCallback(() => {
        trainingMusicRef.current?.pause();
    }, []);

    const startRestMusic = useCallback(() => {
        if (!soundEnabled) return;

        try {
            const player = restMusicRef.current;
            if (!player) return;

            player.currentTime = 0;
            player.muted = false;
            void player.play().catch(() => {
                // The player is unlocked together with training music on Start/Resume.
            });
        } catch {
            // Rest music must never block the workout timer.
        }
    }, [soundEnabled]);

    const stopRestMusic = useCallback(() => {
        restMusicRef.current?.pause();
    }, []);

    return {
        playSelectConfirm: useCallback(() => play('selectConfirm'), [play]),
        playCancel: useCallback(() => play('cancel'), [play]),
        playGenerateQuest: useCallback(() => play('generateQuest'), [play]),
        playCountdown5s: useCallback((startAt = 0) => play('countdown5s', startAt), [play]),
        playSetComplete: useCallback(() => play('setComplete'), [play]),
        playReward: useCallback(() => play('reward'), [play]),
        unlockTrainingMusic,
        startTrainingMusic,
        stopTrainingMusic,
        startRestMusic,
        stopRestMusic,
    };
}
