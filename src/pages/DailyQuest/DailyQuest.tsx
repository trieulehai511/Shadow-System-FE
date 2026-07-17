import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { apiRequest } from '../../services/api';
import styles from './DailyQuest.module.css';
import type { DailyQuestResponse, QuestItem } from '../../models/QuestModel';

type TokenPayload = {
    sub: string;
    username: string; 
};

type DailyQuestApiResponse = {
    result?: DailyQuestResponse;
};

interface ActiveQuestSession {
    itemId: string;
    exerciseName: string;
    pace: 'STRONG' | 'AVERAGE' | 'WEAK';
    secondsPerSet: number;
    restSeconds: number;
    totalRequiredSeconds: number;
    accumulatedSeconds: number;
    currentSet: number;
    phase: 'training' | 'rest';
    timeLeft: number;
    isPaused: boolean;
}

export default function DailyQuest() {
    const [questData, setQuestData] = useState<DailyQuestResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [selectedExerciseForModal, setSelectedExerciseForModal] = useState<QuestItem | null>(null);
    const [activeWorkoutItem, setActiveWorkoutItem] = useState<QuestItem | null>(null);
    const [activeSession, setActiveSession] = useState<ActiveQuestSession | null>(null);
    const [selectedPace, setSelectedPace] = useState<'STRONG' | 'AVERAGE' | 'WEAK'>('AVERAGE');
    const [timerError, setTimerError] = useState<string | null>(null);
    const pingTickRef = useRef<number>(0);
    const navigate = useNavigate();

    // New states for generating daily quest
    const [hunterId, setHunterId] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [actionError, setActionError] = useState<string | null>(null);
    
    // Ref to preserve the initial order of quest items
    const initialOrderRef = useRef<string[]>([]);

    // Helper: sort quest items to match initial order
    const sortByInitialOrder = useCallback((response: DailyQuestResponse): DailyQuestResponse => {
        // If we don't have an initial order yet, establish it
        if (initialOrderRef.current.length === 0) {
            initialOrderRef.current = response.questItems.map(item => item.id);
            return response;
        }
        
        // Sort items to match the initial order
        const orderMap = new Map(initialOrderRef.current.map((id, index) => [id, index]));
        const sortedItems = [...response.questItems].sort((a, b) => {
            const orderA = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
            const orderB = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
            return orderA - orderB;
        });
        
        return { ...response, questItems: sortedItems };
    }, []);

    type QuestLogItem = {
        id: string;
        logDate: string;
        message: string;
        status: string;
    };

    type QuestLogApiResponse = {
        result?: {
            content: QuestLogItem[];
        };
    };

    const [questLogs, setQuestLogs] = useState<QuestLogItem[]>([]);

    useEffect(() => {
        const fetchDailyQuest = async (): Promise<void> => {
            try {
                const token = sessionStorage.getItem('token');
                if (!token) {
                    navigate('/login');
                    return;
                }

                const decoded = jwtDecode<TokenPayload>(token);
                const usernameParam = decoded.sub;

                // Set hunterId directly from the JWT subject, which contains the hunter's UUID
                setHunterId(usernameParam);

                // 1. Fetch quest items
                try {
                    const data: DailyQuestApiResponse = await apiRequest(`/daily-quest/hunter/${usernameParam}`);
                    if (data.result) {
                        setQuestData(sortByInitialOrder(data.result));
                        window.dispatchEvent(new CustomEvent('questUpdated'));
                    } else {
                        setQuestData(null);
                    }
                } catch (questErr) {
                    console.error("Lỗi đồng bộ dữ liệu nhiệm vụ hôm nay:", questErr);
                    setQuestData(null);
                }

                // 2. Fetch Quest Logs from the new API
                try {
                    const logsData: QuestLogApiResponse = await apiRequest(`/quest-logs/hunter/${usernameParam}?page=0&size=10&sort=logDate,desc`);
                    if (logsData.result?.content) {
                        setQuestLogs(logsData.result.content);
                    }
                } catch (logsErr) {
                    console.error("Lỗi lấy nhật ký Quest Logs:", logsErr);
                }

            } catch (error) {
                console.error("Lỗi đồng bộ dữ liệu hệ thống:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDailyQuest();
    }, [navigate, sortByInitialOrder]);

    const handleGenerateQuest = async () => {
        if (!hunterId) {
            setActionError("Không tìm thấy mã số Thợ Săn của bản thể. Vui lòng tải lại trang.");
            return;
        }
        setIsGenerating(true);
        setActionError(null);
        try {
            const token = sessionStorage.getItem('token');
            const data: DailyQuestApiResponse = await apiRequest(`/daily-quest/hunter/${hunterId}/generate`, {
                method: 'POST'
            });

            if (data.result) {
                setQuestData(sortByInitialOrder(data.result));
                window.dispatchEvent(new CustomEvent('questUpdated'));
                
                // Refresh Quest Logs
                try {
                    const decoded = jwtDecode<TokenPayload>(token || '');
                    const usernameParam = decoded.sub;
                    const logsData: QuestLogApiResponse = await apiRequest(`/quest-logs/hunter/${usernameParam}?page=0&size=10&sort=logDate,desc`);
                    if (logsData.result?.content) {
                        setQuestLogs(logsData.result.content);
                    }
                } catch (logsErr) {
                    console.error("Lỗi lấy nhật ký Quest Logs sau khi khởi tạo:", logsErr);
                }
            } else {
                throw new Error("Không thể khởi tạo nhiệm vụ mới từ Hệ thống.");
            }
        } catch (err: any) {
            console.error("Lỗi khởi tạo nhiệm vụ:", err);
            setActionError(err.message || "Khởi tạo nhiệm vụ thất bại.");
        } finally {
            setIsGenerating(false);
        }
    };

    const activeSessionRef = useRef<ActiveQuestSession | null>(null);
    useEffect(() => {
        activeSessionRef.current = activeSession;
    }, [activeSession]);

    const saveSessionToStorage = (session: ActiveQuestSession) => {
        localStorage.setItem(`shadow_quest_session_${session.itemId}`, JSON.stringify(session));
    };

    // Main workout timer and ping loop
    useEffect(() => {
        if (!activeSession || activeSession.isPaused) {
            return;
        }

        const intervalId = setInterval(async () => {
            // Ticking countdown clock
            setActiveSession((prev) => {
                if (!prev || prev.isPaused) return prev;

                let nextTimeLeft = prev.timeLeft - 1;
                let nextPhase = prev.phase;
                let nextSet = prev.currentSet;

                if (nextTimeLeft <= 0) {
                    if (prev.phase === 'training') {
                        if (activeWorkoutItem && prev.currentSet >= activeWorkoutItem.targetSets) {
                            if (prev.accumulatedSeconds >= prev.totalRequiredSeconds) {
                                const updated = {
                                    ...prev,
                                    timeLeft: 0,
                                    isPaused: true,
                                };
                                saveSessionToStorage(updated);
                                return updated;
                            } else {
                                // Accumulation is not enough yet (e.g. 260s / 270s). Extend the timer to cover the difference.
                                const missingSeconds = prev.totalRequiredSeconds - prev.accumulatedSeconds;
                                nextPhase = 'training';
                                nextTimeLeft = Math.max(1, missingSeconds);
                            }
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

            // Ping progress every 10 active seconds
            const currentSession = activeSessionRef.current;
            if (currentSession && !currentSession.isPaused) {
                pingTickRef.current += 1;
                if (pingTickRef.current >= 10) {
                    pingTickRef.current = 0;
                    try {
                        const data = await apiRequest(`/daily-quest/item/${currentSession.itemId}/ping-progress`, {
                            method: 'POST'
                        });
                        if (data?.result) {
                            const serverAccumulated = data.result.accumulatedSeconds;
                            setActiveSession((prev) => {
                                if (!prev || prev.itemId !== currentSession.itemId) return prev;
                                const updated = {
                                    ...prev,
                                    accumulatedSeconds: serverAccumulated,
                                };
                                saveSessionToStorage(updated);
                                return updated;
                            });
                        }
                    } catch (err) {
                        console.error("Lỗi gửi ping-progress:", err);
                    }
                }
            }
        }, 1000);

        return () => clearInterval(intervalId);
    }, [activeSession]);

    // Handle Page exit and visibility transitions to prevent cheat timing issues
    useEffect(() => {
        const handlePauseOnExit = () => {
            const current = activeSessionRef.current;
            if (current && !current.isPaused) {
                const pausedSession = { ...current, isPaused: true };
                saveSessionToStorage(pausedSession);
                setActiveSession(pausedSession);
            }
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
    }, []);

    const handleOpenWorkoutModal = (item: QuestItem) => {
        setActiveWorkoutItem(item);
        pingTickRef.current = 0;
        const saved = localStorage.getItem(`shadow_quest_session_${item.id}`);
        const serverAccumulated = item.accumulatedSeconds ?? 0;
        const serverRequired = item.requiredSeconds ?? 0;

        if (saved) {
            try {
                const parsed = JSON.parse(saved) as ActiveQuestSession;
                // Sync local session with the latest accumulated progress from the server
                const updatedSession: ActiveQuestSession = {
                    ...parsed,
                    accumulatedSeconds: Math.max(parsed.accumulatedSeconds, serverAccumulated),
                    isPaused: true
                };
                setActiveSession(updatedSession);
                saveSessionToStorage(updatedSession);
                setSelectedPace(parsed.pace);
            } catch (e) {
                console.error("Lỗi parse session:", e);
                localStorage.removeItem(`shadow_quest_session_${item.id}`);
                setActiveSession(null);
            }
        } else if (serverRequired > 0 && serverAccumulated >= serverRequired) {
            // Already met on the server, create a pre-completed session state to allow immediate click on Complete
            const newSession: ActiveQuestSession = {
                itemId: item.id,
                exerciseName: item.exerciseName,
                pace: 'AVERAGE',
                secondsPerSet: 0,
                restSeconds: 0,
                totalRequiredSeconds: serverRequired,
                accumulatedSeconds: serverAccumulated,
                currentSet: item.targetSets,
                phase: 'training',
                timeLeft: 0,
                isPaused: true,
            };
            setActiveSession(newSession);
            saveSessionToStorage(newSession);
        } else {
            setActiveSession(null);
            setSelectedPace('AVERAGE');
        }
        setTimerError(null);
    };

    const handleStartWorkout = async (item: QuestItem) => {
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
                    isPaused: false,
                };
                saveSessionToStorage(newSession);
                setActiveSession(newSession);
            }
        } catch (err: any) {
            console.error("Lỗi khi bắt đầu bài tập:", err);
            setTimerError(err.message || "Không thể bắt đầu bài tập.");
        }
    };

    const handleCompleteWorkout = async (itemId: string) => {
        try {
            setTimerError(null);
            const token = sessionStorage.getItem('token');
            const data: DailyQuestApiResponse = await apiRequest(`/daily-quest/item/${itemId}/complete`, {
                method: 'PATCH'
            });

            if (data.result) {
                // Remove from storage
                localStorage.removeItem(`shadow_quest_session_${itemId}`);
                
                // Close modal
                setActiveWorkoutItem(null);
                setActiveSession(null);

                // Update local state
                setQuestData(sortByInitialOrder(data.result));
                window.dispatchEvent(new CustomEvent('questUpdated'));

                // Refresh Quest Logs
                const decoded = jwtDecode<TokenPayload>(token || '');
                const usernameParam = decoded.sub;
                const logsData: QuestLogApiResponse = await apiRequest(`/quest-logs/hunter/${usernameParam}?page=0&size=10&sort=logDate,desc`);
                if (logsData.result?.content) {
                    setQuestLogs(logsData.result.content);
                }
            }
        } catch (err: any) {
            console.error("Lỗi ghi nhận hoàn thành bài tập:", err);
            setTimerError(err.message || "Ghi nhận thất bại. Phát hiện cheat thời gian?");
        }
    };

    const [showLevelUp, setShowLevelUp] = useState<boolean>(false);

    useEffect(() => {
        if (questData && questData.completed) {
            setShowLevelUp(true);
        } else {
            setShowLevelUp(false);
        }
    }, [questData]);

    if (loading) return <div className={styles.centerLoading}><h3>⚡ ĐANG ĐỒNG BỘ DỮ LIỆU HỆ THỐNG...</h3></div>;

    // Calculate total completed items
    const completedCount = questData ? questData.questItems.filter(item => item.completed).length : 0;
    const totalCount = questData ? questData.questItems.length : 0;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return (
        <div className={styles.dashboardCanvas}>
            {/* LEVEL UP OVERLAY MODAL */}
            {showLevelUp && (
                <div className={styles.levelUpOverlay}>
                    <div className={styles.levelUpCard}>
                        <span className={`material-symbols-outlined ${styles.levelUpIcon}`}>military_tech</span>
                        <h2 className={styles.levelUpTitle}>QUEST CLEARED</h2>
                        <p className={styles.levelUpSubtitle}>You have completed all system instructions.</p>
                        <button 
                            className={styles.levelUpBtn} 
                            onClick={() => setShowLevelUp(false)}
                        >
                            CONFIRM 
                        </button>
                    </div>
                </div>
            )}

            {/* EXERCISE DETAIL MODAL */}
            {selectedExerciseForModal && (
                <div className={styles.modalOverlay} onClick={() => setSelectedExerciseForModal(null)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <button 
                            className={styles.closeBtn}
                            onClick={() => setSelectedExerciseForModal(null)}
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
                                    MÔ TẢ BÀI TẬP
                                </h3>
                                <p className={styles.sectionText}>
                                    {selectedExerciseForModal.description || "Không có mô tả cho bài tập này."}
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
                                        LƯU Ý AN TOÀN
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
                                        XEM VIDEO HƯỚNG DẪN
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ACTIVE WORKOUT TIMER MODAL */}
            {activeWorkoutItem && (
                <div className={styles.modalOverlay} onClick={() => {
                    if (activeSession && !activeSession.isPaused) {
                        const paused = { ...activeSession, isPaused: true };
                        saveSessionToStorage(paused);
                        setActiveSession(paused);
                    }
                    setActiveWorkoutItem(null);
                }}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <button 
                            className={styles.closeBtn}
                            onClick={() => {
                                if (activeSession && !activeSession.isPaused) {
                                    const paused = { ...activeSession, isPaused: true };
                                    saveSessionToStorage(paused);
                                    setActiveSession(paused);
                                }
                                setActiveWorkoutItem(null);
                            }}
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>

                        <div className={styles.exerciseDetailHeader}>
                            <span className={styles.categoryBadge}>{activeWorkoutItem.category}</span>
                            <h2 className={styles.detailTitle}>{activeWorkoutItem.exerciseName}</h2>
                            <p className={styles.detailTarget}>
                                Mục tiêu: <span className={styles.neonBlue}>{activeWorkoutItem.targetSets} Sets × {activeWorkoutItem.targetReps} Reps</span>
                            </p>
                        </div>

                        <div className={styles.detailBody}>
                            {!activeSession ? (
                                <div className={styles.paceSelectionContainer}>
                                    <h3 className={styles.sectionHeader}>
                                        <span className="material-symbols-outlined">speed</span>
                                        CHỌN CƯỜNG ĐỘ TẬP LUYỆN
                                    </h3>
                                    <p className={styles.paceDescription}>
                                        Chọn cường độ phù hợp để hệ thống tính kịch bản thời gian tập và nghỉ phù hợp.
                                    </p>
                                    
                                    <div className={styles.paceCardsRow}>
                                        {(['STRONG', 'AVERAGE', 'WEAK'] as const).map((p) => (
                                            <div 
                                                key={p}
                                                className={`${styles.paceCard} ${selectedPace === p ? styles.paceCardActive : ''}`}
                                                onClick={() => setSelectedPace(p)}
                                            >
                                                <span className={styles.paceName}>
                                                    {p === 'STRONG' ? '⚡ STRONG' : p === 'AVERAGE' ? '⚖️ AVERAGE' : '🌱 WEAK'}
                                                </span>
                                                <span className={styles.paceSub}>
                                                    {p === 'STRONG' ? 'Nhanh & Nặng' : p === 'AVERAGE' ? 'Trung bình' : 'Nhẹ nhàng'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    <button 
                                        className={styles.startWorkoutBtn}
                                        onClick={() => handleStartWorkout(activeWorkoutItem)}
                                    >
                                        BẮT ĐẦU TẬP
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
                                                {activeSession.phase === 'training' ? 'TẬP LUYỆN' : 'NGHỈ NGƠI'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className={styles.timerProgressSection}>
                                        <div className={styles.progressLabelRow}>
                                            <span>Tiến độ (Server ping)</span>
                                            <span>
                                                {activeSession.accumulatedSeconds}s / {activeSession.totalRequiredSeconds}s
                                            </span>
                                        </div>
                                        <div className={styles.timerProgressBarTrack}>
                                            <div 
                                                className={styles.timerProgressBarFill} 
                                                style={{ width: `${Math.min(100, (activeSession.accumulatedSeconds / activeSession.totalRequiredSeconds) * 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className={styles.controlsRow}>
                                        <button 
                                            className={`${styles.controlBtn} ${activeSession.isPaused ? styles.btnPrimary : styles.btnSecondary}`}
                                            onClick={() => {
                                                const updated = { ...activeSession, isPaused: !activeSession.isPaused };
                                                saveSessionToStorage(updated);
                                                setActiveSession(updated);
                                            }}
                                        >
                                            {activeSession.isPaused ? (
                                                <>
                                                    <span className="material-symbols-outlined">play_arrow</span>
                                                    TIẾP TỤC
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined">pause</span>
                                                    TẠM DỪNG
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {activeSession.accumulatedSeconds >= activeSession.totalRequiredSeconds && (
                                        <button 
                                            className={styles.completeExerciseBtn}
                                            onClick={() => handleCompleteWorkout(activeWorkoutItem.id)}
                                        >
                                            <span className="material-symbols-outlined">verified</span>
                                            HOÀN THÀNH BÀI TẬP & NHẬN THƯỞNG
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
                            <span>{progressPercent}% ({completedCount} / {totalCount})</span>
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
                                <h3 className={styles.emptyTitle}>HÔM NAY CHƯA CÓ BÀI TẬP</h3>
                                <p className={styles.emptyDescription}>
                                    {questData?.restDay 
                                        ? "Hôm nay là ngày nghỉ. Muốn thử thách ngày nghỉ mới luôn không?" 
                                        : "Thợ Săn mới! Hôm nay chưa có nhiệm vụ. Muốn thử thách ngay bây giờ không?"}
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
                                            ĐANG KHỞI TẠO CHỈ THỊ...
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined">bolt</span>
                                            KHỞI TẠO NHIỆM VỤ HÔM NAY
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div className={styles.exercisesList}>
                                {questData.questItems.map((item) => {
                                    const hasSavedSession = localStorage.getItem(`shadow_quest_session_${item.id}`) !== null;
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
                                                <span className={`${styles.exerciseName} ${item.completed ? styles.lineThrough : ''}`}>
                                                    {item.exerciseName} ({item.targetSets} Sets × {item.targetReps} Reps)
                                                </span>
                                                <button 
                                                    className={styles.infoBtn}
                                                    onClick={() => setSelectedExerciseForModal(item)}
                                                    title="Xem chi tiết"
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
                                                        className={styles.exerciseActionButton}
                                                        onClick={() => handleOpenWorkoutModal(item)}
                                                    >
                                                        {hasSavedSession ? 'Tiếp tục' : 'Tập luyện'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>



            </div>
        </div>
    );
}
