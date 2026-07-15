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

export default function DailyQuest() {
    const [questData, setQuestData] = useState<DailyQuestResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [selectedExerciseForModal, setSelectedExerciseForModal] = useState<QuestItem | null>(null);
    const navigate = useNavigate();
    
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

                // 1. Fetch quest items
                const data: DailyQuestApiResponse = await apiRequest(`/daily-quest/hunter/${usernameParam}`);

                if (data.result) {
                    setQuestData(sortByInitialOrder(data.result));
                    window.dispatchEvent(new CustomEvent('questUpdated'));
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
    }, [navigate]);



    const handleCompleteItem = async (itemId: string): Promise<void> => {
        try {
            const token = sessionStorage.getItem('token');
            const data: DailyQuestApiResponse = await apiRequest(`/daily-quest/item/${itemId}/complete`, {
                method: 'PATCH'
            });

            if (data.result) {
                setQuestData(sortByInitialOrder(data.result));
                window.dispatchEvent(new CustomEvent('questUpdated'));
                // Refresh Logs after completion
                const decoded = jwtDecode<TokenPayload>(token || '');
                const usernameParam = decoded.sub;
                const logsData: QuestLogApiResponse = await apiRequest(`/quest-logs/hunter/${usernameParam}?page=0&size=10&sort=logDate,desc`);
                if (logsData.result?.content) {
                    setQuestLogs(logsData.result.content);
                }
            }
        } catch (error) {
            console.error("Lỗi ghi nhận tiến độ:", error);
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
    if (!questData) return <div className={styles.centerLoading}><h3>❌ KHÔNG TÌM THẤY DỮ LIỆU NHIỆM VỤ.</h3></div>;

    // Calculate total completed items
    const completedCount = questData.questItems.filter(item => item.completed).length;
    const progressPercent = Math.round((completedCount / questData.questItems.length) * 100) || 0;

    return (
        <div className={styles.dashboardCanvas}>
            {/* LEVEL UP OVERLAY MODAL */}
            {showLevelUp && (
                <div className={styles.levelUpOverlay}>
                    <div className={styles.levelUpCard}>
                        <span className={`material-symbols-outlined ${styles.levelUpIcon}`}>military_tech</span>
                        <h2 className={styles.levelUpTitle}>QUEST CLEARED</h2>
                        {/* <div className={styles.levelUpRank}>S-RANK</div> */}
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
                            <span>{progressPercent}% ({completedCount} / {questData.questItems.length})</span>
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
                <section className={`${styles.questSection} ${!questData.completed ? styles.animatePulse : ''}`}>
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

                        {/* Exercise Items List */}
                        <div className={styles.exercisesList}>
                            {questData.questItems.map((item) => (
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
                                            <button 
                                                className={styles.checkBoxPending}
                                                onClick={() => handleCompleteItem(item.id)}
                                                title="Mark as completed"
                                            >
                                                <div className={styles.pendingDot}></div>
                                            </button>
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
                                    <span className={styles.exerciseStat}>
                                        {item.completed ? `${item.targetReps}/${item.targetReps}` : `0/${item.targetReps}`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>



            </div>
        </div>
    );
}
