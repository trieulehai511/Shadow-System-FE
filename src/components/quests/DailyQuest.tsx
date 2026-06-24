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

                const response = await fetch(`http://localhost:8888/shadow-system/daily-quest/hunter/${usernameParam}`, {
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

    const handleCompleteItem = async (itemId: string): Promise<void> => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8888/shadow-system/daily-quest/item/${itemId}/complete`, {
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

    if (loading) return <div className={styles.centerLoading}><h3>⚡ ĐANG ĐỒNG BỘ DỮ LIỆU HỆ THỐNG...</h3></div>;
    if (!questData) return <div className={styles.centerLoading}><h3>❌ KHÔNG TÌM THẤY DỮ LIỆU NHIỆM VỤ.</h3></div>;

    return (
        <div className={styles.systemBox}>
            {/* Khung thông tin tổng quan dạng lưới rộng rãi */}
            <div className={styles.statusContainer}>
                <div className={styles.statusCard}>
                    <p>📅 Ngày nhận nhiệm vụ</p>
                    <strong>{questData.questDate}</strong>
                </div>
                <div className={styles.statusCard}>
                    <p>🏆 Trạng thái tiến độ</p>
                    <strong style={{ color: questData.completed ? '#00ff88' : '#00f3ff' }}>
                        {questData.completed ? "🌟 HOÀN THÀNH TẤT CẢ" : "⏳ ĐANG TIẾN HÀNH"}
                    </strong>
                </div>
                <div className={styles.warningText}>
                    ⚠️ CẢNH BÁO: NẾU KHÔNG HOÀN THÀNH, HÌNH PHẠT SẼ ĐƯỢC THỰC THI CHÍNH XÁC.
                </div>
            </div>

            {/* Danh sách nhiệm vụ lớn, rõ ràng */}
            <ul className={styles.exerciseList}>
                {questData.questItems.map((item) => (
                    <li 
                        key={item.id} 
                        className={`${styles.exerciseItem} ${item.completed ? styles.exerciseItemCompleted : ''}`}
                    >
                        <div className={styles.exerciseInfo}>
                            <h4>{item.exerciseName}</h4>
                            <p>Mục tiêu: <strong>{item.targetSets}</strong> Sets × <strong>{item.targetReps}</strong> Reps</p>
                            <span className={styles.statTag}>⚡ Thuộc tính tăng: {item.targetStat}</span>
                        </div>
                        <div>
                            {item.completed ? (
                                <span className={styles.completedText}>✅ HOÀN THÀNH</span>
                            ) : (
                                <button className={styles.completeBtn} onClick={() => handleCompleteItem(item.id)}>
                                    ĐÁNH DẤU CHẤP HÀNH
                                </button>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}