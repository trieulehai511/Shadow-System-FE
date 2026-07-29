import React, { useState, useEffect, useMemo, useRef } from 'react';
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

type HistorySection = {
    title: string;
    data: QuestLogItem[];
};

const HISTORY_DAYS = 30;

const formatDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatTime = (createdAt?: string) => {
    if (!createdAt) return 'SYSTEM';
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return 'SYSTEM';
    return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
};

const formatStatus = (status?: string) =>
    status?.toUpperCase() === 'COMPLETED'
        ? 'SUCCESS'
        : status?.toUpperCase() || 'RECORDED';

export default function QuestHistory() {
    const [logs, setLogs] = useState<QuestLogItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [expandedDate, setExpandedDate] = useState<string>(() => formatDateKey(new Date()));
    const initializedExpandedDate = useRef<boolean>(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchQuestLogs = async (): Promise<void> => {
            try {
                const token = sessionStorage.getItem('token');
                if (!token) {
                    navigate('/login');
                    return;
                }

                const decoded = jwtDecode<TokenPayload>(token);
                const usernameParam = decoded.sub;

                const data: QuestLogApiResponse = await apiRequest(
                    `/quest-logs/hunter/${usernameParam}?page=0&size=100&sort=createdAt,desc`
                );

                if (data.result?.content) {
                    setLogs(data.result.content);
                }
            } catch (error) {
                console.error("Failed to synchronize quest history:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchQuestLogs();
    }, [navigate]);

    const sections = useMemo<HistorySection[]>(() => {
        const groupedLogs = logs.reduce<Record<string, QuestLogItem[]>>((groups, log) => {
            const date = log.logDate || 'Unknown Date';
            if (!groups[date]) groups[date] = [];
            groups[date].push(log);
            return groups;
        }, {});

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const oldestAllowedDate = new Date(today);
        oldestAllowedDate.setDate(today.getDate() - (HISTORY_DAYS - 1));

        const logDates = Object.keys(groupedLogs)
            .filter(date => date !== 'Unknown Date')
            .sort();

        const firstLogDate = logDates.length
            ? new Date(`${logDates[0]}T00:00:00`)
            : today;

        const startDate = new Date(
            Math.max(firstLogDate.getTime(), oldestAllowedDate.getTime())
        );

        const result: HistorySection[] = [];
        const currentDate = new Date(today);

        while (currentDate >= startDate) {
            const dateKey = formatDateKey(currentDate);
            result.push({
                title: dateKey,
                data: groupedLogs[dateKey] ?? [],
            });
            currentDate.setDate(currentDate.getDate() - 1);
        }

        return result;
    }, [logs]);

    const activeDays = sections.filter(s => s.data.length > 0).length;
    const missedDays = sections.length - activeDays;

    useEffect(() => {
        if (loading || initializedExpandedDate.current) return;

        const newestActiveDate = sections.find(s => s.data.length > 0)?.title ?? sections[0]?.title;
        if (newestActiveDate) {
            setExpandedDate(newestActiveDate);
        }
        initializedExpandedDate.current = true;
    }, [loading, sections]);

    const toggleExpand = (dateTitle: string) => {
        setExpandedDate(current => (current === dateTitle ? '' : dateTitle));
    };

    if (loading) return <div className={styles.centerLoading}><h3>⚡ RETRIEVING SYSTEM LOGS...</h3></div>;

    return (
        <div className={styles.historyCanvas}>
            <div className={styles.historyHeader}>
                <div className={styles.titleRow}>
                    <div>
                        <h1 className={styles.title}>Quest History</h1>
                        <p className={styles.subtitle}>
                            Last {sections.length} Days
                            <span className={styles.summarySeparator}> · </span>
                            <span className={styles.activeSummary}>{activeDays} Active Days</span>
                            <span className={styles.summarySeparator}> · </span>
                            <span className={styles.missedSummary}>{missedDays} Missed Days</span>
                        </p>
                    </div>
                    <span className={`material-symbols-outlined ${styles.headerIcon}`}>schedule</span>
                </div>
            </div>

            <div className={styles.logContainer}>
                {sections.map((section) => {
                    const didNothing = section.data.length === 0;
                    const isExpanded = expandedDate === section.title;

                    const formattedDate = new Date(`${section.title}T00:00:00`).toLocaleDateString([], {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    });

                    return (
                        <div key={section.title} className={styles.dateSection}>
                            <button
                                className={`${styles.dateHeaderBtn} ${didNothing ? styles.dateHeaderDisabled : ''}`}
                                onClick={() => !didNothing && toggleExpand(section.title)}
                                disabled={didNothing}
                            >
                                <div className={styles.dateHeaderLeft}>
                                    <div className={`${styles.timelineDot} ${didNothing ? styles.timelineDotMissed : ''}`} />
                                    <span className={styles.dateText}>{formattedDate}</span>
                                </div>

                                <div className={styles.sectionActions}>
                                    <span className={`${styles.sectionStatus} ${didNothing ? styles.missedStatus : ''}`}>
                                        {didNothing ? 'MISSED' : `${section.data.length} ${section.data.length === 1 ? 'entry' : 'entries'}`}
                                    </span>
                                    {!didNothing && (
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--color-on-surface-variant)' }}>
                                            {isExpanded ? 'expand_less' : 'expand_more'}
                                        </span>
                                    )}
                                </div>
                            </button>

                            {isExpanded && !didNothing && (
                                <div className={styles.timelineList}>
                                    {section.data.map((item) => {
                                        const successful = item.status?.toUpperCase() === 'COMPLETED';
                                        return (
                                            <div key={item.id} className={styles.timelineItem}>
                                                <div className={styles.timelineLine} />
                                                <div className={styles.logCard}>
                                                    <div className={styles.logMain}>
                                                        <span className={styles.timeText}>{formatTime(item.createdAt)}</span>
                                                        <div className={styles.logContent}>
                                                            <h3 className={styles.exerciseName}>{item.exerciseName}</h3>
                                                            <div className={styles.exerciseDetails}>
                                                                <span>{item.completedSets} Sets</span>
                                                                <span className={styles.detailSeparator}> · </span>
                                                                <span>{item.completedReps} Reps</span>
                                                                <span className={styles.detailSeparator}> · </span>
                                                                <span className={styles.statText}>{item.targetStat || 'STAT'}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <span className={`${styles.statusBadge} ${!successful ? styles.statusFailed : ''}`}>
                                                        {formatStatus(item.status)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
