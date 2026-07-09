import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { apiRequest } from '../../services/api';
import styles from './QuestHistory.module.css';

type TokenPayload = {
    sub: string;
    username: string; 
};

type QuestLogItem = {
    id: string;
    hunterId: string;
    logDate: string;
    exerciseName: string;
    completedSets: number;
    completedReps: number;
    targetStat: string;
    createdAt: string;
    status: string;
};

type QuestLogApiResponse = {
    result?: {
        content: QuestLogItem[];
        totalElements: number;
        totalPages: number;
    };
};

export default function QuestHistory() {
    const [logs, setLogs] = useState<QuestLogItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchQuestLogs = async (): Promise<void> => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    navigate('/login');
                    return;
                }

                const decoded = jwtDecode<TokenPayload>(token);
                const usernameParam = decoded.sub;

                const data: QuestLogApiResponse = await apiRequest(`/quest-logs/hunter/${usernameParam}?page=0&size=20&sort=createdAt,desc`);

                if (data.result?.content) {
                    setLogs(data.result.content);
                }
            } catch (error) {
                console.error("Lỗi đồng bộ nhật ký nhiệm vụ:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchQuestLogs();
    }, [navigate]);

    if (loading) return <div className={styles.centerLoading}><h3>⚡ ĐANG TRUY XUẤT NHẬT KÝ HỆ THỐNG...</h3></div>;

    // Group logs by logDate
    const groupedLogs = logs.reduce((groups: { [key: string]: QuestLogItem[] }, log) => {
        const date = log.logDate || 'Unknown Date';
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(log);
        return groups;
    }, {});

    return (
        <div className={styles.historyCanvas}>
            <div className={styles.historyHeader}>
                <div className={styles.titleWrapper}>
                    <span className="material-symbols-outlined">history</span>
                    <h1 className={styles.title}>Quest History</h1>
                </div>
                <p className={styles.subtitle}>Records of Accepting the System's Instructions</p>
            </div>

            <div className={styles.logContainer}>
                {Object.keys(groupedLogs).length > 0 ? (
                    <div className={styles.groupedList}>
                        {Object.keys(groupedLogs).map((date) => {
                            const formattedDate = new Date(date).toLocaleDateString([], {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                weekday: 'long'
                            });

                            return (
                                <div key={date} className={styles.dateGroup}>
                                    <div className={styles.dateHeader}>
                                        <span className="material-symbols-outlined">calendar_today</span>
                                        <h2>{formattedDate}</h2>
                                    </div>
                                    
                                    <div className={styles.logList}>
                                        {groupedLogs[date].map((log) => {
                                            const timeStr = log.createdAt
                                                ? new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
                                                : '';

                                            return (
                                                <div key={log.id} className={styles.logCard}>
                                                    <div className={styles.logHeaderRow}>
                                                        <div className={styles.logMeta}>
                                                            <span className={styles.logTag}>[{timeStr || 'SYSTEM'}]</span>
                                                            <span className={styles.logStatus}>
                                                                {log.status === 'COMPLETED' ? 'SUCCESS' : log.status}
                                                            </span>
                                                        </div>
                                                        <span className={styles.statAccent}>+{log.targetStat}</span>
                                                    </div>
                                                    <div className={styles.logDetail}>
                                                        <h3 className={styles.exerciseName}>{log.exerciseName}</h3>
                                                        <p className={styles.setsInfo}>
                                                            Chấp hành hoàn thành: <strong>{log.completedSets}</strong> Sets × <strong>{log.completedReps}</strong> Reps
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className={styles.noLogsCard}>
                        <span className="material-symbols-outlined">info</span>
                        <h3>KHÔNG CÓ NHẬT KÝ CHẤP HÀNH</h3>
                        <p>Bạn chưa hoàn thành bất kỳ mục tiêu tập luyện nào được hệ thống giao phó.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
