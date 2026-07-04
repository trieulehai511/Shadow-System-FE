import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import styles from './DailyQuest.module.css';
import type { DailyQuestResponse } from '../../models/QuestModel';

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
    const [penaltyTime, setPenaltyTime] = useState<string>("11:42:09");
    const navigate = useNavigate();

    useEffect(() => {
        const fetchDailyQuest = async (): Promise<void> => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    navigate('/login');
                    return;
                }

                const decoded = jwtDecode<TokenPayload>(token);
                const usernameParam = decoded.sub;

                const response = await fetch(`https://shadow-system-1086471329115.asia-southeast1.run.app/shadow-system/daily-quest/hunter/${usernameParam}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                const data: DailyQuestApiResponse = await response.json();

                if (data.result) {
                    setQuestData(data.result);
                }
            } catch (error) {
                console.error("Lỗi đồng bộ dữ liệu hệ thống:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDailyQuest();
    }, [navigate]);

    // Simple countdown effect for the penalty clock
    useEffect(() => {
        const interval = setInterval(() => {
            setPenaltyTime(prev => {
                const parts = prev.split(':').map(Number);
                let seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
                if (seconds <= 0) return "00:00:00";
                seconds -= 1;
                const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
                const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
                const s = String(seconds % 60).padStart(2, '0');
                return `${h}:${m}:${s}`;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleCompleteItem = async (itemId: string): Promise<void> => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`https://shadow-system-1086471329115.asia-southeast1.run.app/shadow-system/daily-quest/item/${itemId}/complete`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data: DailyQuestApiResponse = await response.json();

            if (data.result) {
                setQuestData(data.result);
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
                        <div className={styles.levelUpRank}>S-RANK</div>
                        <p className={styles.levelUpSubtitle}>You have completed all system instructions.</p>
                        <button 
                            className={styles.levelUpBtn} 
                            onClick={() => setShowLevelUp(false)}
                        >
                            CONFIRM LINK
                        </button>
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
                                    </div>
                                    <span className={styles.exerciseStat}>
                                        {item.completed ? `${item.targetReps}/${item.targetReps}` : `0/${item.targetReps}`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* SIDE COLUMN: PENALTY & SYSTEM LOG */}
                <div className={styles.sideColumn}>
                    {/* Penalty Warning Card */}
                    <section className={styles.penaltyCard}>
                        <div className={styles.hazardOverlay} aria-hidden="true"></div>
                        <div className={styles.penaltyContent}>
                            <span className={`material-symbols-outlined ${styles.warningIcon}`}>warning</span>
                            <h3 className={styles.penaltyTitle}>Penalty Warning</h3>
                            <div className={styles.penaltyTimer}>
                                {penaltyTime}
                            </div>
                            <div className={styles.penaltyInfoBox}>
                                <p className={styles.infoLabel}>Failure Condition:</p>
                                <p className={styles.infoValue}>The Penalty Quest of the Great Desert</p>
                                <p className={styles.infoSubtext}>Survive for 4 hours.</p>
                            </div>
                        </div>
                    </section>

                    {/* System Log */}
                    <section className={styles.systemLogCard}>
                        <h3 className={styles.logHeader}>
                            <span className="material-symbols-outlined">terminal</span>
                            System Log
                        </h3>
                        <ul className={styles.logList}>
                            <li className={styles.logItemDim}>
                                <span className={styles.logTime}>[08:00]</span>
                                <span>Daily Quest issued.</span>
                            </li>
                            <li className={styles.logItemNormal}>
                                <span className={styles.logTime}>[09:15]</span>
                                <span>Push-ups completed. Strength +1.</span>
                            </li>
                            <li className={styles.logItemActive}>
                                <span className={styles.logTime}>[09:20]</span>
                                <span className={styles.pulseText}>Tracking Sit-ups...</span>
                            </li>
                        </ul>
                    </section>
                </div>

            </div>
        </div>
    );
}
