import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { apiRequest } from '../../services/api';
import { SystemAlert } from '../../components/SystemAlert';
import { useSoundEffects } from '../../hooks/useSoundEffects';
import styles from './DailyQuest.module.css';
import type { DailyQuestResponse, QuestItem, ActiveQuestSession, TrainingPace } from '../../models/QuestModel';

type TokenPayload = {
    sub: string;
    username: string; 
};

type DailyQuestApiResponse = {
    result?: DailyQuestResponse;
};

type AttributeName = 'strength' | 'agility' | 'vitality';
type AttributeValues = Partial<Record<AttributeName, number>>;

type HunterAttributesResponse = {
    result?: AttributeValues;
} & AttributeValues;

type ScreenWakeLockSentinel = EventTarget & {
    readonly released: boolean;
    release: () => Promise<void>;
};

type WakeLockNavigator = Navigator & {
    wakeLock?: {
        request: (type: 'screen') => Promise<ScreenWakeLockSentinel>;
    };
};

const ATTRIBUTE_NAMES: AttributeName[] = ['strength', 'agility', 'vitality'];
const ATTRIBUTE_LABELS: Record<AttributeName, string> = {
    strength: 'STR',
    agility: 'AGI',
    vitality: 'VIT',
};

const ATTRIBUTE_GAINS_PREFIX = 'shadow_quest_attribute_gains_';

const getAttributes = (response: HunterAttributesResponse): AttributeValues => {
    const profile = response.result ?? response;
    return Object.fromEntries(
        ATTRIBUTE_NAMES
            .filter((attribute) => typeof profile[attribute] === 'number')
            .map((attribute) => [attribute, profile[attribute]])
    ) as AttributeValues;
};

const getAttributeGains = (
    before: AttributeValues,
    after: AttributeValues
): AttributeValues =>
    Object.fromEntries(
        ATTRIBUTE_NAMES
            .filter(
                attribute =>
                    typeof before[attribute] === 'number' &&
                    typeof after[attribute] === 'number'
            )
            .map(attribute => [
                attribute,
                Math.max(0, after[attribute]! - before[attribute]!),
            ])
    ) as AttributeValues;

const addAttributeGains = (
    current: AttributeValues,
    added: AttributeValues
): AttributeValues =>
    Object.fromEntries(
        ATTRIBUTE_NAMES.map(attribute => [
            attribute,
            (current[attribute] ?? 0) + (added[attribute] ?? 0),
        ])
    ) as AttributeValues;

const SYSTEM_BRIEFINGS = [
    'Your identity has awakened. Today’s directive awaits; the System will remember any delay.',
    'Do not mistake comfort for safety. Those who choose rest will soon be left behind.',
    'The System does not care about your excuses. Complete the directive, or accept your weakness.',
    'A new day has begun. Prove that you deserve to survive this selection.',
    'Every action is recorded—especially the moment you consider abandoning your quest.'
];

const STRENGTH_MESSAGES = [
    'Physical attributes increased. Maintain your progress or face elimination.',
    'A limit has been removed. Do not grow complacent. You are still far too weak.',
    'Your physical condition has improved. The System requires you to maintain the current intensity.',
    'Energy absorption complete. Survival probability increased slightly.',
    'New evolution progress recorded. To stop is to invite destruction.',
    'Directive complete. Power increased. Prepare for the next challenge.'
];

const pickSystemMessage = (messages: string[]) => messages[Math.floor(Math.random() * messages.length)];

const hasFinishedWorkoutTimer = (
    session: ActiveQuestSession | null,
    item: QuestItem | null
) =>
    Boolean(
        session &&
        item &&
        session.phase === 'training' &&
        session.currentSet >= item.targetSets &&
        session.timeLeft === 0
    );

export default function DailyQuest() {
    const {
        playCancel,
        playSelectConfirm,
        playGenerateQuest,
        playCountdown5s,
        playSetComplete,
        playReward,
    } = useSoundEffects();
    const [questData, setQuestData] = useState<DailyQuestResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [selectedExerciseForModal, setSelectedExerciseForModal] = useState<QuestItem | null>(null);
    const [activeWorkoutItem, setActiveWorkoutItem] = useState<QuestItem | null>(null);
    const [activeSession, setActiveSession] = useState<ActiveQuestSession | null>(null);
    const [selectedPace, setSelectedPace] = useState<TrainingPace>('AVERAGE');
    const [preparationStep, setPreparationStep] = useState<number | 'go' | null>(null);
    const [timerError, setTimerError] = useState<string | null>(null);
    const [entryBriefing, setEntryBriefing] = useState<string | null>(null);
    const [completionReward, setCompletionReward] = useState<{
        message: string;
        questCleared: boolean;
        attributeGains: AttributeValues;
    } | null>(null);
    const pingTickRef = useRef<number>(0);
    const pingInFlightRef = useRef<boolean>(false);
    const pauseRequestRef = useRef<Promise<any> | null>(null);
    const preparationTimersRef = useRef<number[]>([]);
    const countdownPhaseRef = useRef<string | null>(null);
    const previousTimerRef = useRef<{
        itemId: string;
        phase: ActiveQuestSession['phase'];
        timeLeft: number;
    } | null>(null);
    const wakeLockRef = useRef<ScreenWakeLockSentinel | null>(null);
    const navigate = useNavigate();

    const [hunterId, setHunterId] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [isWorkoutActionLoading, setIsWorkoutActionLoading] = useState<boolean>(false);
    const [actionError, setActionError] = useState<string | null>(null);
    
    const initialOrderRef = useRef<string[]>([]);

    const activeSessionRef = useRef<ActiveQuestSession | null>(null);
    useEffect(() => {
        activeSessionRef.current = activeSession;
    }, [activeSession]);

    useEffect(() => {
        if (!activeSession) {
            previousTimerRef.current = null;
            return;
        }

        const previous = previousTimerRef.current;
        const sameWorkout = previous?.itemId === activeSession.itemId;
        const movedFromTrainingToRest = sameWorkout
            && previous?.phase === 'training'
            && activeSession.phase === 'rest';
        const finishedFinalTrainingSet = sameWorkout
            && previous?.phase === 'training'
            && activeSession.phase === 'training'
            && previous.timeLeft > 0
            && activeSession.timeLeft === 0;

        if (movedFromTrainingToRest || finishedFinalTrainingSet) {
            playSetComplete();
        }

        previousTimerRef.current = {
            itemId: activeSession.itemId,
            phase: activeSession.phase,
            timeLeft: activeSession.timeLeft,
        };
    }, [activeSession, playSetComplete]);

    useEffect(() => {
        if (!activeSession || activeSession.isPaused || activeSession.timeLeft !== 4) return;

        const phaseKey = `${activeSession.itemId}-${activeSession.currentSet}-${activeSession.phase}`;
        if (countdownPhaseRef.current === phaseKey) return;

        countdownPhaseRef.current = phaseKey;
        playCountdown5s();
    }, [activeSession, playCountdown5s]);

    const shouldKeepScreenAwake = Boolean(
        activeWorkoutItem && (
            preparationStep !== null ||
            (activeSession && !activeSession.isPaused && activeSession.timeLeft > 0)
        )
    );

    useEffect(() => {
        const wakeLock = (navigator as WakeLockNavigator).wakeLock;
        if (!wakeLock) return;

        let cancelled = false;
        let requestInFlight = false;

        const releaseWakeLock = () => {
            const sentinel = wakeLockRef.current;
            wakeLockRef.current = null;
            if (sentinel && !sentinel.released) {
                void sentinel.release().catch(error => {
                    console.warn('Wake Lock release failed:', error);
                });
            }
        };

        const requestWakeLock = async () => {
            if (
                cancelled ||
                requestInFlight ||
                !shouldKeepScreenAwake ||
                document.visibilityState !== 'visible' ||
                (wakeLockRef.current && !wakeLockRef.current.released)
            ) {
                return;
            }

            requestInFlight = true;
            try {
                const sentinel = await wakeLock.request('screen');
                if (
                    cancelled ||
                    !shouldKeepScreenAwake ||
                    document.visibilityState !== 'visible'
                ) {
                    if (!sentinel.released) await sentinel.release();
                    return;
                }
                wakeLockRef.current = sentinel;
                sentinel.addEventListener('release', () => {
                    if (wakeLockRef.current === sentinel) {
                        wakeLockRef.current = null;
                    }
                    if (!cancelled && shouldKeepScreenAwake && document.visibilityState === 'visible') {
                        window.setTimeout(() => void requestWakeLock(), 0);
                    }
                }, { once: true });
            } catch (error) {
                if (!cancelled) console.warn('Wake Lock request failed:', error);
            } finally {
                requestInFlight = false;
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                void requestWakeLock();
            } else {
                releaseWakeLock();
            }
        };

        if (shouldKeepScreenAwake) void requestWakeLock();
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            cancelled = true;
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            releaseWakeLock();
        };
    }, [shouldKeepScreenAwake]);

    const activeWorkoutItemRef = useRef<QuestItem | null>(null);
    useEffect(() => {
        activeWorkoutItemRef.current = activeWorkoutItem;
    }, [activeWorkoutItem]);

    const sortByInitialOrder = useCallback((response: DailyQuestResponse): DailyQuestResponse => {
        if (initialOrderRef.current.length === 0) {
            initialOrderRef.current = response.questItems.map(item => item.id);
            return response;
        }
        
        const orderMap = new Map(initialOrderRef.current.map((id, index) => [id, index]));
        const sortedItems = [...response.questItems].sort((a, b) => {
            const orderA = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
            const orderB = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
            return orderA - orderB;
        });
        
        return { ...response, questItems: sortedItems };
    }, []);

    const saveSessionToStorage = useCallback((session: ActiveQuestSession) => {
        localStorage.setItem(`shadow_quest_session_${session.itemId}`, JSON.stringify(session));
    }, []);

    const removeSessionFromStorage = useCallback((itemId: string) => {
        localStorage.removeItem(`shadow_quest_session_${itemId}`);
    }, []);

    const cancelPreparation = useCallback(() => {
        preparationTimersRef.current.forEach(id => clearTimeout(id));
        preparationTimersRef.current = [];
        setPreparationStep(null);
    }, []);

    useEffect(() => cancelPreparation, [cancelPreparation]);

    const fetchDailyQuest = useCallback(async (): Promise<void> => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            const decoded = jwtDecode<TokenPayload>(token);
            const usernameParam = decoded.sub;
            setHunterId(usernameParam);

            try {
                const data: DailyQuestApiResponse = await apiRequest(`/daily-quest/today`);
                if (data.result) {
                    const sorted = sortByInitialOrder(data.result);
                    setQuestData(sorted);
                    window.dispatchEvent(new CustomEvent('questUpdated'));
                } else {
                    setQuestData(null);
                }
            } catch (questErr) {
                console.error("Failed to synchronize today's quest data:", questErr);
                setQuestData(null);
            }
        } catch (error) {
            console.error("Failed to synchronize System data:", error);
        } finally {
            setLoading(false);
        }
    }, [navigate, sortByInitialOrder]);

    useEffect(() => {
        fetchDailyQuest();
    }, [fetchDailyQuest]);

    const pauseCurrentSession = useCallback(async () => {
        const current = activeSessionRef.current;
        if (!current || current.timeLeft === 0) return;

        if (!current.isPaused) playCancel();

        const paused = current.isPaused ? current : { ...current, isPaused: true };
        activeSessionRef.current = paused;
        setActiveSession(paused);
        saveSessionToStorage(paused);

        if (pauseRequestRef.current) {
            try {
                await pauseRequestRef.current;
            } catch {}
            return;
        }

        try {
            const pauseReq = apiRequest(`/daily-quest/item/${current.itemId}/pause`, { method: 'POST' });
            pauseRequestRef.current = pauseReq;
            const response = await pauseReq;
            const serverAccumulated = response?.result?.accumulatedSeconds ?? paused.accumulatedSeconds;

            setActiveSession((prev) => {
                if (!prev || prev.itemId !== current.itemId) return prev;
                const updated = {
                    ...prev,
                    accumulatedSeconds: serverAccumulated,
                    isPaused: true,
                };
                activeSessionRef.current = updated;
                saveSessionToStorage(updated);
                return updated;
            });

            setQuestData((prev) =>
                prev
                    ? {
                        ...prev,
                        questItems: prev.questItems.map(item =>
                            item.id === current.itemId
                                ? {
                                    ...item,
                                    status: 'PAUSED',
                                    accumulatedSeconds: serverAccumulated,
                                }
                                : item
                        ),
                    }
                    : prev
            );
        } catch (err: any) {
            const staleSessionCodes = [2002, 2004, 2005, 2012];
            if (staleSessionCodes.includes(err.code)) {
                removeSessionFromStorage(current.itemId);
                activeSessionRef.current = null;
                setActiveSession((prev) => (prev?.itemId === current.itemId ? null : prev));
                void fetchDailyQuest();
            } else {
                console.error("Pause workout error:", err);
                if (activeWorkoutItemRef.current?.id === current.itemId) {
                    setTimerError(err.message || "Failed to pause training session.");
                }
            }
        } finally {
            pauseRequestRef.current = null;
        }
    }, [fetchDailyQuest, playCancel, removeSessionFromStorage, saveSessionToStorage]);

    const beginPreparation = useCallback(
        (targetSession: ActiveQuestSession, resumeOnServer = false) => {
            cancelPreparation();
            playCountdown5s(1);

            const paused = { ...targetSession, isPaused: true };
            activeSessionRef.current = paused;
            setActiveSession(paused);
            saveSessionToStorage(paused);
            setPreparationStep(3);

            const show = (step: number | 'go', delay: number) => {
                preparationTimersRef.current.push(
                    window.setTimeout(() => setPreparationStep(step), delay)
                );
            };

            show(2, 1000);
            show(1, 2000);
            show('go', 3000);

            preparationTimersRef.current.push(
                window.setTimeout(async () => {
                    const current = activeSessionRef.current;
                    if (!current || current.timeLeft <= 0) {
                        setPreparationStep(null);
                        preparationTimersRef.current = [];
                        return;
                    }

                    try {
                        let accumulatedSeconds = current.accumulatedSeconds;
                        if (resumeOnServer) {
                            if (pauseRequestRef.current) {
                                await pauseRequestRef.current;
                            }
                            const res = await apiRequest(`/daily-quest/item/${current.itemId}/resume`, {
                                method: 'POST',
                            });
                            accumulatedSeconds = res?.result?.accumulatedSeconds ?? accumulatedSeconds;
                        }

                        const running = {
                            ...current,
                            accumulatedSeconds,
                            isPaused: false,
                        };
                        activeSessionRef.current = running;
                        setActiveSession(running);
                        saveSessionToStorage(running);
                        setQuestData(prev =>
                            prev
                                ? {
                                    ...prev,
                                    questItems: prev.questItems.map(item =>
                                        item.id === current.itemId
                                            ? {
                                                ...item,
                                                status: 'IN_PROGRESS',
                                                accumulatedSeconds,
                                            }
                                            : item
                                    ),
                                }
                                : prev
                        );
                    } catch (err: any) {
                        console.error("Resume training session failed:", err);
                        setTimerError(err.message || "Unable to resume training session.");
                    }
                    setPreparationStep(null);
                    preparationTimersRef.current = [];
                }, 3600)
            );
        },
        [cancelPreparation, playCountdown5s, saveSessionToStorage]
    );

    useEffect(() => {
        const handlePauseOnExit = () => {
            cancelPreparation();
            void pauseCurrentSession();
        };

        window.addEventListener('beforeunload', handlePauseOnExit);

        const handleVisibilityChange = () => {
            if (document.hidden) {
                handlePauseOnExit();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('beforeunload', handlePauseOnExit);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [cancelPreparation, pauseCurrentSession]);

    useEffect(() => {
        if (loading || sessionStorage.getItem('shadow_system_entry_pending') !== 'true') return;

        sessionStorage.removeItem('shadow_system_entry_pending');
        setEntryBriefing(pickSystemMessage(SYSTEM_BRIEFINGS));
    }, [loading]);

    const handleGenerateQuest = async () => {
        if (!hunterId) {
            setActionError("Hunter ID not found. Please reload the page.");
            return;
        }
        if (isGenerating) return;
        setIsGenerating(true);
        setActionError(null);
        try {
            playGenerateQuest();
            const data: DailyQuestApiResponse = await apiRequest(`/daily-quest/hunter/${hunterId}/generate`, {
                method: 'POST'
            });

            if (data.result) {
                setQuestData(sortByInitialOrder(data.result));
                window.dispatchEvent(new CustomEvent('questUpdated'));
            } else {
                throw new Error("Unable to initialize a new quest from the System.");
            }
        } catch (err: any) {
            console.error("Failed to initialize quest:", err);
            setActionError(err.message || "Quest initialization failed.");
        } finally {
            setIsGenerating(false);
        }
    };

    const syncProgress = useCallback(async (session: ActiveQuestSession, showSyncError = false) => {
        if (pingInFlightRef.current) return;

        pingInFlightRef.current = true;
        try {
            const data = await apiRequest(`/daily-quest/item/${session.itemId}/ping-progress`, {
                method: 'POST'
            });
            if (data?.result) {
                const serverAccumulated = data.result.accumulatedSeconds;
                setActiveSession((prev) => {
                    if (!prev || prev.itemId !== session.itemId) return prev;
                    const updated = {
                        ...prev,
                        accumulatedSeconds: serverAccumulated,
                        isFinishing: false,
                    };
                    saveSessionToStorage(updated);
                    return updated;
                });
            }
        } catch (err) {
            console.error("Failed to send progress ping:", err);
            setActiveSession((prev) => {
                if (!prev || prev.itemId !== session.itemId) return prev;
                const updated = { ...prev, isFinishing: false };
                saveSessionToStorage(updated);
                return updated;
            });
            if (showSyncError) {
                setTimerError("Unable to synchronize final progress. Please try again.");
            }
        } finally {
            pingInFlightRef.current = false;
        }
    }, [saveSessionToStorage]);

    useEffect(() => {
        if (!activeSession || activeSession.isPaused) {
            return;
        }

        const intervalId = setInterval(() => {
            const currentSession = activeSessionRef.current;
            const item = activeWorkoutItemRef.current;
            const isLastTrainingSecond = Boolean(
                currentSession &&
                item &&
                currentSession.phase === 'training' &&
                currentSession.currentSet >= item.targetSets &&
                currentSession.timeLeft <= 1
            );

            setActiveSession((prev) => {
                if (!prev || prev.isPaused) return prev;

                let nextTimeLeft = prev.timeLeft - 1;
                let nextPhase = prev.phase;
                let nextSet = prev.currentSet;

                if (nextTimeLeft <= 0) {
                    if (prev.phase === 'training') {
                        if (activeWorkoutItemRef.current && prev.currentSet >= activeWorkoutItemRef.current.targetSets) {
                            const updated = {
                                ...prev,
                                timeLeft: 0,
                                isPaused: true,
                                isFinishing: prev.accumulatedSeconds < prev.totalRequiredSeconds,
                            };
                            saveSessionToStorage(updated);
                            return updated;
                        } else {
                            nextPhase = 'rest';
                            nextTimeLeft = prev.restSeconds;
                        }
                    } else {
                        nextPhase = 'training';
                        nextTimeLeft = prev.secondsPerSet;
                        nextSet = prev.currentSet + 1;
                    }
                }

                const updated = {
                    ...prev,
                    timeLeft: nextTimeLeft,
                    phase: nextPhase,
                    currentSet: nextSet,
                };
                saveSessionToStorage(updated);
                return updated;
            });

            if (currentSession && !currentSession.isPaused) {
                pingTickRef.current += 1;
                if (pingTickRef.current >= 10 && !isLastTrainingSecond) {
                    pingTickRef.current = 0;
                    void syncProgress(currentSession);
                }
            }
        }, 1000);

        return () => clearInterval(intervalId);
    }, [activeSession?.isPaused, activeSession?.itemId, saveSessionToStorage, syncProgress]);

    useEffect(() => {
        const needsFinalSync =
            activeSession?.timeLeft === 0 &&
            activeSession.accumulatedSeconds < activeSession.totalRequiredSeconds;

        if (!needsFinalSync) return;

        let cancelled = false;

        const retryFinalSync = async () => {
            const current = activeSessionRef.current;
            if (
                cancelled ||
                !current ||
                current.timeLeft !== 0 ||
                current.accumulatedSeconds >= current.totalRequiredSeconds
            ) {
                return;
            }

            setActiveSession(prev => (prev ? { ...prev, isFinishing: true } : prev));
            await syncProgress(current, true);
        };

        void retryFinalSync();
        const retryInterval = setInterval(retryFinalSync, 5000);

        return () => {
            cancelled = true;
            clearInterval(retryInterval);
        };
    }, [
        activeSession?.timeLeft,
        activeSession?.accumulatedSeconds,
        activeSession?.totalRequiredSeconds,
        syncProgress,
    ]);

    const handleOpenWorkoutModal = async (item: QuestItem) => {
        playSelectConfirm();
        setActiveWorkoutItem(item);
        pingTickRef.current = 0;
        const saved = localStorage.getItem(`shadow_quest_session_${item.id}`);
        const serverAccumulated = item.accumulatedSeconds ?? 0;
        const serverRequired = item.requiredSeconds ?? 0;

        if (saved) {
            try {
                const parsed = JSON.parse(saved) as ActiveQuestSession;
                const updatedSession: ActiveQuestSession = {
                    ...parsed,
                    accumulatedSeconds: Math.max(parsed.accumulatedSeconds, serverAccumulated),
                    isPaused: true
                };
                setActiveSession(updatedSession);
                saveSessionToStorage(updatedSession);
                setSelectedPace(parsed.pace);
                setQuestData(prev => prev ? {
                    ...prev,
                    questItems: prev.questItems.map(questItem =>
                        questItem.id === item.id ? { ...questItem, status: 'IN_PROGRESS' } : questItem
                    )
                } : prev);
                return;
            } catch (e) {
                console.error("Failed to parse saved session:", e);
                localStorage.removeItem(`shadow_quest_session_${item.id}`);
            }
        }

        if (item.status === 'IN_PROGRESS' || item.status === 'PAUSED' || serverAccumulated > 0) {
            const secondsPerSet = Math.max(1, item.targetReps * 3);
            const restSeconds = 60;
            const calculatedRequired = (secondsPerSet * item.targetSets) + (restSeconds * Math.max(0, item.targetSets - 1));
            const newSession: ActiveQuestSession = {
                itemId: item.id,
                exerciseName: item.exerciseName,
                pace: 'AVERAGE',
                secondsPerSet: secondsPerSet,
                restSeconds: restSeconds,
                totalRequiredSeconds: calculatedRequired || serverRequired || 100,
                accumulatedSeconds: serverAccumulated,
                currentSet: 1,
                phase: 'training',
                timeLeft: secondsPerSet,
                isPaused: true,
            };
            setActiveSession(newSession);
            saveSessionToStorage(newSession);
            return;
        }

        setActiveSession(null);
        setSelectedPace('AVERAGE');
        setTimerError(null);
    };

    const handleCloseWorkoutModal = () => {
        cancelPreparation();
        playCancel();
        setActiveWorkoutItem(null);
        setTimerError(null);
        void pauseCurrentSession().finally(fetchDailyQuest);
    };

    const handleStartWorkout = async (item: QuestItem) => {
        if (isWorkoutActionLoading) return;
        setIsWorkoutActionLoading(true);
        try {
            setTimerError(null);
            pingTickRef.current = 0;
            const data = await apiRequest(`/daily-quest/item/${item.id}/start?pace=${selectedPace}`, {
                method: 'POST'
            });

            if (data?.result) {
                const { secondsPerSet, restSeconds, totalRequiredSeconds } = data.result;
                const newSession: ActiveQuestSession = {
                    itemId: item.id,
                    exerciseName: item.exerciseName,
                    pace: selectedPace,
                    secondsPerSet: secondsPerSet,
                    restSeconds: restSeconds,
                    totalRequiredSeconds: totalRequiredSeconds,
                    accumulatedSeconds: 0,
                    currentSet: 1,
                    phase: 'training',
                    timeLeft: secondsPerSet,
                    isPaused: true,
                };
                setQuestData(prev => prev ? {
                    ...prev,
                    questItems: prev.questItems.map(i =>
                        i.id === item.id ? { ...i, status: 'IN_PROGRESS' } : i
                    )
                } : prev);
                beginPreparation(newSession);
            }
        } catch (err: any) {
            console.error("Failed to start exercise:", err);
            setTimerError(err.message || "Unable to start the exercise.");
        } finally {
            setIsWorkoutActionLoading(false);
        }
    };

    const handleResetWorkout = async (itemId: string) => {
        if (isWorkoutActionLoading) return;
        if (!window.confirm("Are you sure you want to reset this exercise progress?")) return;

        setIsWorkoutActionLoading(true);
        try {
            setTimerError(null);
            await apiRequest(`/daily-quest/item/${itemId}/reset`, { method: 'POST' });
            removeSessionFromStorage(itemId);
            setActiveSession(null);
            setActiveWorkoutItem(null);
            await fetchDailyQuest();
        } catch (err: any) {
            console.error("Failed to reset exercise:", err);
            setTimerError(err.message || "Unable to reset the exercise.");
        } finally {
            setIsWorkoutActionLoading(false);
        }
    };

    const handleCompleteWorkout = async (itemId: string) => {
        if (!activeWorkoutItem || isWorkoutActionLoading) return;
        if (
            !hasFinishedWorkoutTimer(activeSessionRef.current, activeWorkoutItem) ||
            (activeSessionRef.current?.accumulatedSeconds ?? 0) <
                (activeSessionRef.current?.totalRequiredSeconds ?? Number.MAX_SAFE_INTEGER)
        ) {
            setTimerError("Exercise timer or required training duration is not yet finished.");
            return;
        }

        setIsWorkoutActionLoading(true);
        try {
            setTimerError(null);
            const isMainQuestItem = activeWorkoutItem.type !== 'BONUS';
            const mainItemsBefore = questData?.questItems.filter(item => item.type !== 'BONUS') ?? [];
            const wasMainQuestCompleted = mainItemsBefore.length > 0 && mainItemsBefore.every(item => item.completed);
            let attributesBefore: AttributeValues = {};

            if (isMainQuestItem) {
                try {
                    const profileBefore: HunterAttributesResponse = await apiRequest('/auth/me');
                    attributesBefore = getAttributes(profileBefore);
                } catch (profileErr) {
                    console.error("Read attributes before completion error:", profileErr);
                }
            }

            const data: DailyQuestApiResponse = await apiRequest(`/daily-quest/item/${itemId}/complete`, {
                method: 'PATCH'
            });

            if (data.result) {
                const quest = data.result;
                removeSessionFromStorage(itemId);
                setActiveWorkoutItem(null);
                setActiveSession(null);

                const sortedQuest = sortByInitialOrder(quest);
                setQuestData(sortedQuest);
                window.dispatchEvent(new CustomEvent('questUpdated'));

                const mainItemsAfter = sortedQuest.questItems.filter(item => item.type !== 'BONUS');
                const isMainQuestCompleted = mainItemsAfter.length > 0 && mainItemsAfter.every(item => item.completed);
                const questJustCleared = !wasMainQuestCompleted && isMainQuestCompleted;

                let accumulatedAttributeGains: AttributeValues = {};

                if (isMainQuestItem) {
                    const storageKey = `${ATTRIBUTE_GAINS_PREFIX}${quest.id}`;

                    try {
                        const storedGains = localStorage.getItem(storageKey);
                        accumulatedAttributeGains = storedGains ? JSON.parse(storedGains) : {};
                    } catch (storageErr) {
                        console.error("Read accumulated attribute gains error:", storageErr);
                    }

                    try {
                        const profileAfter: HunterAttributesResponse = await apiRequest('/auth/me');
                        const attributesAfter = getAttributes(profileAfter);
                        const currentGains = getAttributeGains(attributesBefore, attributesAfter);
                        accumulatedAttributeGains = addAttributeGains(accumulatedAttributeGains, currentGains);
                        localStorage.setItem(storageKey, JSON.stringify(accumulatedAttributeGains));
                    } catch (profileErr) {
                        console.error("Track attribute gains error:", profileErr);
                    }
                }

                if (questJustCleared) {
                    playReward();
                    setCompletionReward({
                        message: pickSystemMessage(STRENGTH_MESSAGES),
                        questCleared: true,
                        attributeGains: accumulatedAttributeGains,
                    });
                    localStorage.removeItem(`${ATTRIBUTE_GAINS_PREFIX}${quest.id}`);
                }
            }
        } catch (err: any) {
            console.error("Failed to record exercise completion:", err);
            setTimerError(err.message || "Completion could not be recorded.");
        } finally {
            setIsWorkoutActionLoading(false);
        }
    };

    if (loading) return <div className={styles.centerLoading}><h3>⚡ SYNCHRONIZING SYSTEM DATA...</h3></div>;

    const mainQuestItems = questData?.questItems.filter(item => item.type !== 'BONUS') ?? [];
    const bonusQuestItems = questData?.questItems.filter(item => item.type === 'BONUS') ?? [];
    const completedMainCount = mainQuestItems.filter(item => item.completed).length;
    const completedBonusCount = bonusQuestItems.filter(item => item.completed).length;
    const progressPercent = mainQuestItems.length > 0
        ? Math.round((completedMainCount / mainQuestItems.length) * 100)
        : 0;

    return (
        <div className={styles.dashboardCanvas}>
            {entryBriefing && (
                <SystemAlert
                    title="SYSTEM DIRECTIVE"
                    message={entryBriefing}
                    type="warning"
                    confirmText="ACCEPT"
                    onClose={() => setEntryBriefing(null)}
                />
            )}

            {/* STRENGTH GAIN / QUEST CLEARED OVERLAY */}
            {completionReward && (
                <div className={styles.levelUpOverlay} onClick={() => setCompletionReward(null)}>
                    <div className={styles.levelUpCard} onClick={(event) => event.stopPropagation()}>
                        <div className={styles.systemHeader}>
                            <span className={styles.systemBadge}>SYSTEM</span>
                            <span className={styles.systemStatus}>
                                {completionReward.questCleared ? 'QUEST CLEARED' : 'UPDATE COMPLETED'}
                            </span>
                        </div>
                        
                        <h2 className={styles.levelUpTitle}>
                            {completionReward.questCleared ? 'QUEST COMPLETE' : 'PHYSICAL GROWTH'}
                        </h2>
                        
                        <p className={styles.levelUpSubtitle}>{completionReward.message}</p>
                        
                        {completionReward.questCleared && ATTRIBUTE_NAMES.some((attribute) => typeof completionReward.attributeGains[attribute] === 'number') && (
                            <div className={styles.attributeList}>
                                <div className={styles.attributeListTitle}>ATTRIBUTE CHANGES:</div>
                                <div className={styles.attributeGrid}>
                                    {ATTRIBUTE_NAMES.map((attribute) => {
                                        const gain = completionReward.attributeGains[attribute];
                                        if (typeof gain !== 'number' || gain <= 0) return null;
                                        return (
                                            <div className={styles.attributeRow} key={attribute}>
                                                <span className={styles.attrLabel}>{ATTRIBUTE_LABELS[attribute]}</span>
                                                <span className={styles.attrValue}>+{gain}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        
                        <div className={styles.rewardActions}>
                            {completionReward.questCleared && (
                                <button
                                    className={styles.viewProfileBtn}
                                    onClick={() => {
                                        setCompletionReward(null);
                                        navigate('/profile');
                                    }}
                                >
                                    VIEW ATTRIBUTES
                                </button>
                            )}
                            <button
                                className={styles.levelUpBtn}
                                onClick={() => setCompletionReward(null)}
                            >
                                CONFIRM
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* EXERCISE DETAIL MODAL */}
            {selectedExerciseForModal && (
                <div className={styles.modalOverlay} onClick={() => { playCancel(); setSelectedExerciseForModal(null); }}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <button 
                            className={styles.closeBtn}
                            onClick={() => { playCancel(); setSelectedExerciseForModal(null); }}
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>

                        <div className={styles.exerciseDetailHeader}>
                            <span className={styles.categoryBadge}>{selectedExerciseForModal.category}</span>
                            <h2 className={styles.detailTitle}>{selectedExerciseForModal.exerciseName}</h2>
                            <p className={styles.detailTarget}>
                                Target Stat: <span className={styles.neonBlue}>{selectedExerciseForModal.targetStat}</span>
                            </p>
                        </div>

                        <div className={styles.detailBody}>
                            {selectedExerciseForModal.imageUrl && (
                                <div className={styles.detailImageContainer}>
                                    <img 
                                        src={selectedExerciseForModal.imageUrl} 
                                        alt={selectedExerciseForModal.exerciseName} 
                                        className={styles.detailImage}
                                    />
                                </div>
                            )}

                            <div className={styles.detailSection}>
                                <h3 className={styles.sectionHeader}>
                                    <span className="material-symbols-outlined">description</span>
                                    EXERCISE DESCRIPTION
                                </h3>
                                <p className={styles.sectionText}>
                                    {selectedExerciseForModal.description || "No description is available for this exercise."}
                                </p>
                            </div>

                            <div className={styles.detailStatsRow}>
                                <div className={styles.detailStatCard}>
                                    <span className={styles.statLabel}>TARGET SETS</span>
                                    <span className={styles.statVal}>{selectedExerciseForModal.targetSets} Sets</span>
                                </div>
                                <div className={styles.detailStatCard}>
                                    <span className={styles.statLabel}>TARGET REPS</span>
                                    <span className={styles.statVal}>{selectedExerciseForModal.targetReps} Reps</span>
                                </div>
                            </div>

                            {selectedExerciseForModal.safetyTips && (
                                <div className={styles.detailSection}>
                                    <h3 className={`${styles.sectionHeader} ${styles.warningHeader}`}>
                                        <span className="material-symbols-outlined">gpp_maybe</span>
                                        SAFETY NOTES
                                    </h3>
                                    <p className={styles.sectionText}>
                                        {selectedExerciseForModal.safetyTips}
                                    </p>
                                </div>
                            )}

                            {selectedExerciseForModal.tutorialVideoUrl && (
                                <div className={styles.detailSection}>
                                    <a 
                                        href={selectedExerciseForModal.tutorialVideoUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className={styles.videoLinkBtn}
                                    >
                                        <span className="material-symbols-outlined">play_circle</span>
                                        WATCH TUTORIAL VIDEO
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ACTIVE WORKOUT TIMER MODAL */}
            {activeWorkoutItem && (
                <div className={styles.modalOverlay} onClick={handleCloseWorkoutModal}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
                        <button 
                            className={styles.closeBtn}
                            onClick={handleCloseWorkoutModal}
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>

                        {/* PREPARATION STEP OVERLAY */}
                        {preparationStep !== null && (
                            <div className={styles.prepOverlay}>
                                <div className={styles.prepContent}>
                                    <span className={styles.prepLabel}>GET READY</span>
                                    <span className={`${styles.prepValue} ${preparationStep === 'go' ? styles.prepGo : ''}`}>
                                        {preparationStep === 'go' ? 'GO!' : preparationStep}
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className={styles.exerciseDetailHeader}>
                            <span className={styles.categoryBadge}>{activeWorkoutItem.category}</span>
                            <h2 className={styles.detailTitle}>{activeWorkoutItem.exerciseName}</h2>
                            <p className={styles.detailTarget}>
                                Target: <span className={styles.neonBlue}>{activeWorkoutItem.targetSets} Sets × {activeWorkoutItem.targetReps} Reps</span>
                            </p>
                        </div>

                        <div className={styles.detailBody}>
                            {!activeSession ? (
                                <div className={styles.paceSelectionContainer}>
                                    <h3 className={styles.sectionHeader}>
                                        <span className="material-symbols-outlined">speed</span>
                                        SELECT TRAINING INTENSITY
                                    </h3>
                                    <p className={styles.paceDescription}>
                                        Select an intensity so the System can calculate appropriate training and recovery intervals.
                                    </p>
                                    
                                    <div className={styles.paceCardsRow}>
                                        {(['STRONG', 'AVERAGE', 'WEAK'] as const).map((p) => (
                                            <div 
                                                key={p}
                                                className={`${styles.paceCard} ${selectedPace === p ? styles.paceCardActive : ''}`}
                                                onClick={() => { playSelectConfirm(); setSelectedPace(p); }}
                                            >
                                                <span className={styles.paceName}>
                                                    {p === 'STRONG' ? '⚡ STRONG' : p === 'AVERAGE' ? '⚖️ AVERAGE' : '🌱 WEAK'}
                                                </span>
                                                <span className={styles.paceSub}>
                                                    {p === 'STRONG' ? 'Fast & Heavy' : p === 'AVERAGE' ? 'Moderate' : 'Light'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    <button 
                                        className={styles.startWorkoutBtn}
                                        onClick={() => handleStartWorkout(activeWorkoutItem)}
                                        disabled={isWorkoutActionLoading}
                                    >
                                        {isWorkoutActionLoading ? 'ACTIVATING...' : 'START TRAINING'}
                                    </button>
                                    
                                    {timerError && <p className={styles.errorText}>{timerError}</p>}
                                </div>
                            ) : (
                                <div className={styles.activeTimerContainer}>
                                    <div className={styles.phaseIndicator}>
                                        <span className={`${styles.phaseBadge} ${activeSession.phase === 'training' ? styles.phaseTraining : styles.phaseRest}`}>
                                            {activeSession.phase === 'training' ? 'TRAINING' : 'RESTING'}
                                        </span>
                                        <span className={styles.phaseText}>
                                            SET {activeSession.currentSet} / {activeWorkoutItem.targetSets}
                                        </span>
                                    </div>

                                    <div className={styles.circularTimerWrapper}>
                                        <svg className={styles.timerSvg}>
                                            <circle className={styles.timerTrack} cx="100" cy="100" r="85" />
                                            <circle 
                                                className={`${styles.timerIndicator} ${activeSession.phase === 'training' ? styles.timerIndicatorTraining : styles.timerIndicatorRest}`} 
                                                cx="100" 
                                                cy="100" 
                                                r="85" 
                                                strokeDasharray={2 * Math.PI * 85}
                                                strokeDashoffset={
                                                    2 * Math.PI * 85 * (1 - activeSession.timeLeft / (activeSession.phase === 'training' ? activeSession.secondsPerSet : activeSession.restSeconds))
                                                }
                                            />
                                        </svg>
                                        <div className={styles.timerTextContainer}>
                                            <span className={styles.timerValue}>
                                                {Math.floor(activeSession.timeLeft / 60)}:{(activeSession.timeLeft % 60).toString().padStart(2, '0')}
                                            </span>
                                            <span className={styles.timerLabel}>
                                                {activeSession.isFinishing
                                                    ? 'SYNCHRONIZING RESULTS'
                                                    : activeSession.phase === 'training' ? 'TRAINING' : 'RESTING'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className={styles.controlsRow}>
                                        {activeSession.timeLeft === 0 && activeSession.accumulatedSeconds < activeSession.totalRequiredSeconds ? (
                                            <button
                                                className={`${styles.controlBtn} ${styles.btnPrimary}`}
                                                disabled={activeSession.isFinishing}
                                                onClick={() => void syncProgress(activeSession, true)}
                                            >
                                                <span className="material-symbols-outlined">
                                                    {activeSession.isFinishing ? 'sync' : 'sync_problem'}
                                                </span>
                                                {activeSession.isFinishing ? 'SYNCHRONIZING...' : 'RETRY SYNC'}
                                            </button>
                                        ) : (
                                            <button
                                                className={`${styles.controlBtn} ${activeSession.isPaused ? styles.btnPrimary : styles.btnSecondary}`}
                                                onClick={() => {
                                                    if (activeSession.isPaused) {
                                                        beginPreparation(activeSession, true);
                                                    } else {
                                                        void pauseCurrentSession();
                                                    }
                                                }}
                                            >
                                                {activeSession.isPaused ? (
                                                    <>
                                                        <span className="material-symbols-outlined">play_arrow</span>
                                                        RESUME
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="material-symbols-outlined">pause</span>
                                                        PAUSE
                                                    </>
                                                )}
                                            </button>
                                        )}
                                        <button
                                            className={`${styles.controlBtn} ${styles.btnSecondary}`}
                                            title="Reset exercise progress to start over"
                                            disabled={isWorkoutActionLoading}
                                            onClick={() => handleResetWorkout(activeWorkoutItem.id)}
                                            style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#EF4444' }}
                                        >
                                            <span className="material-symbols-outlined">restart_alt</span>
                                            RESET
                                        </button>
                                    </div>

                                    {hasFinishedWorkoutTimer(activeSession, activeWorkoutItem) && activeSession.accumulatedSeconds >= activeSession.totalRequiredSeconds && (
                                        <button 
                                            className={styles.completeExerciseBtn}
                                            onClick={() => handleCompleteWorkout(activeWorkoutItem.id)}
                                            disabled={isWorkoutActionLoading}
                                        >
                                            <span className="material-symbols-outlined">{isWorkoutActionLoading ? 'sync' : 'verified'}</span>
                                            {isWorkoutActionLoading ? 'RECORDING...' : 'COMPLETE EXERCISE & CLAIM REWARD'}
                                        </button>
                                    )}

                                    {timerError && <p className={styles.errorText}>{timerError}</p>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* BENTO GRID LAYOUT */}
            <div className={styles.bentoGrid}>
                {/* RANK & LEVEL STATUS */}
                <section className={styles.statusSection}>
                    <div className={styles.glowDecoration} aria-hidden="true"></div>
                    <div className={styles.statusHeaderGroup}>
                        <div className={styles.iconBox}>
                            <span className="material-symbols-outlined">swords</span>
                        </div>
                        <div>
                            <h3 className={styles.monoLabel}>Current Status</h3>
                            <div className={styles.levelGroup}>
                                <span className={styles.levelTitle}>Level 1</span>
                                <span className={styles.rankBadge}>[E-Rank]</span>
                            </div>
                        </div>
                    </div>
                    {/* XP Progress Bar */}
                    <div className={styles.xpProgressContainer}>
                        <div className={styles.xpTextRow}>
                            <span>EXP Progress</span>
                            <span>{progressPercent}% ({completedMainCount} / {mainQuestItems.length} main)</span>
                        </div>
                        <div className={styles.xpTrack}>
                            <div 
                                className={styles.xpFill} 
                                style={{ width: `${progressPercent}%` }}
                            >
                                <div className={styles.xpFillGlow}></div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* DAILY QUEST: THE MAIN EVENT */}
                <section className={`${styles.questSection} ${(questData && !questData.completed) ? styles.animatePulse : ''}`}>
                    <div className={styles.gradientAccent} aria-hidden="true"></div>
                    
                    <div className={styles.questContent}>
                        <div className={styles.questHeader}>
                            <div>
                                <span className={styles.mandatoryBadge}>! Mandatory</span>
                                <h1 className={styles.questTitle}>Daily Quest</h1>
                                <p className={styles.questSubtitle}>Preparation to Become Strong</p>
                            </div>
                            <span className={`material-symbols-outlined ${styles.headerIcon}`}>fitness_center</span>
                        </div>

                        {/* Exercise Items List or Empty State */}
                        {!questData || !questData.questItems || questData.questItems.length === 0 ? (
                            <div className={styles.emptyQuestContainer}>
                                <div className={styles.emptyIconBox}>
                                    <span className="material-symbols-outlined">hourglass_empty</span>
                                </div>
                                <h3 className={styles.emptyTitle}>NO EXERCISES TODAY</h3>
                                <p className={styles.emptyDescription}>
                                    {questData?.restDay 
                                        ? "Today is a rest day. Do you want to request a new challenge anyway?"
                                        : "New Hunter! No quest has been assigned today. Do you want a challenge now?"}
                                </p>
                                
                                {actionError && <p className={styles.actionErrorText}>{actionError}</p>}
                                
                                <button 
                                    className={styles.generateQuestBtn} 
                                    onClick={handleGenerateQuest}
                                    disabled={isGenerating || !hunterId}
                                >
                                    {isGenerating ? (
                                        <>
                                            <span className={`material-symbols-outlined ${styles.spin}`}>sync</span>
                                            INITIALIZING DIRECTIVE...
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined">bolt</span>
                                            INITIALIZE TODAY'S QUEST
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div className={styles.questGroups}>
                                {[
                                    { key: 'main', title: 'Main Missions', subtitle: 'Complete these to clear today’s quest', items: mainQuestItems, bonus: false },
                                    { key: 'bonus', title: 'Bonus Challenges', subtitle: `${completedBonusCount}/${bonusQuestItems.length} complete · Optional`, items: bonusQuestItems, bonus: true },
                                ].filter(group => group.items.length > 0).map(group => (
                                    <section key={group.key} className={`${styles.questGroup} ${group.bonus ? styles.bonusGroup : ''}`}>
                                        <div className={styles.questGroupHeader}>
                                            <div>
                                                <h2 className={styles.questGroupTitle}>{group.title}</h2>
                                                <p className={styles.questGroupSubtitle}>{group.subtitle}</p>
                                            </div>
                                            <span className={group.bonus ? styles.bonusBadge : styles.mainBadge}>
                                                {group.bonus ? 'OPTIONAL' : 'REQUIRED'}
                                            </span>
                                        </div>
                                        <div className={styles.exercisesList}>
                                {group.items.map((item) => {
                                    const inProgress = !item.completed && (
                                        item.status === 'IN_PROGRESS' ||
                                        item.status === 'PAUSED' ||
                                        (item.accumulatedSeconds ?? 0) > 0 ||
                                        activeSession?.itemId === item.id
                                    );
                                    return (
                                        <div 
                                            key={item.id}
                                            className={`${styles.exerciseItem} ${
                                                item.completed ? styles.itemDone : styles.itemPending
                                            }`}
                                        >
                                            <div className={styles.exerciseLeft}>
                                                {item.completed ? (
                                                    <div className={styles.checkBoxCompleted}>
                                                        <span className="material-symbols-outlined">check</span>
                                                    </div>
                                                ) : (
                                                    <div className={styles.checkBoxPending} style={{ cursor: 'default' }}>
                                                        <div className={styles.pendingDot}></div>
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span className={`${styles.exerciseName} ${item.completed ? styles.lineThrough : ''}`}>
                                                        {item.exerciseName} ({item.targetSets} Sets × {item.targetReps} Reps)
                                                    </span>
                                                    {inProgress && (
                                                        <span className={styles.inProgressBadge}>
                                                            {item.status === 'PAUSED' ? 'PAUSED' : 'IN PROGRESS'}
                                                        </span>
                                                    )}
                                                </div>
                                                <button 
                                                    className={styles.infoBtn}
                                                    onClick={() => { playSelectConfirm(); setSelectedExerciseForModal(item); }}
                                                    title="View details"
                                                >
                                                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>info</span>
                                                </button>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                {item.completed ? (
                                                    <span className={styles.exerciseActionButtonDone}>
                                                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>verified</span>
                                                        DONE
                                                    </span>
                                                ) : (
                                                    <button 
                                                        className={inProgress ? styles.exerciseResumeButton : styles.exerciseActionButton}
                                                        onClick={() => handleOpenWorkoutModal(item)}
                                                    >
                                                        {inProgress ? 'Resume' : 'Train'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                        </div>
                                    </section>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
