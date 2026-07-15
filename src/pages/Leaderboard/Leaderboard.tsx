import { useState, useEffect } from 'react';
import { apiRequest, getAvatarUrl } from '../../services/api';
import styles from './Leaderboard.module.css';

interface LeaderboardItem{
    position: number;
    hunterCode: string;
    fullName: string;
    avatar: string | null;
    currentRp: number;
    rankTier: string;
    currentStreak: number;
}

export default function Leaderboard() {


    const [leaderboardData, setLeaderboardData] = useState<LeaderboardItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                setLoading(true);
                const response = await apiRequest('/leaderboard');
                if(response && response.result){
                    setLeaderboardData(response.result);
                }else if(Array.isArray(response)){
                    setLeaderboardData(response);
                }
            } catch (err: any) {
                setError('Failed to fetch leaderboard data');
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, []);
    

if (loading) {
        return <div className={styles.loading}>Đang tải bảng xếp hạng...</div>;
    }

    if (error) {
        return <div className={styles.error}>{error}</div>;
    }





  




    return (
        <div className={styles.container}>
           
            <div className={styles.headerSection}>
                <h2 className={styles.title}>HUNTER LEADERBOARD</h2>
                <p className={styles.subtitle}>BẢNG XẾP HẠNG THỨ BẬC THỢ SĂN TOÀN CẦU</p>
            </div>

            {/* Bảng danh sách thợ săn */}
            <div className={styles.leaderboardList}>
                {leaderboardData.map((hunter) => {
                    // Tạo style highlight đặc biệt cho Top 3
                    let rankClass = styles.normalRank;
                    if (hunter.position === 1) rankClass = styles.top1;
                    if (hunter.position === 2) rankClass = styles.top2;
                    if (hunter.position === 3) rankClass = styles.top3;

                    return (
                        <div key={hunter.hunterCode} className={`${styles.hunterCard} ${rankClass}`}>
                            {/* Thứ hạng số */}
                            <div className={styles.positionWrapper}>
                                <span className={styles.positionNumber}>#{hunter.position}</span>
                            </div>

                            {/* Avatar */}
                            <div className={styles.avatarWrapper}>
                                <img 
                                    src={getAvatarUrl(hunter.avatar || undefined)} 
                                    alt={hunter.fullName} 
                                    className={styles.avatarImg}
                                />
                                <span className={styles.rankBadge}>{hunter.rankTier}</span>
                            </div>

                            {/* Thông tin chính */}
                            <div className={styles.infoWrapper}>
                                <div className={styles.fullName}>{hunter.fullName}</div>
                                <div className={styles.hunterCode}>{hunter.hunterCode}</div>
                            </div>

                            {/* Chỉ số RP và Streak */}
                            <div className={styles.statsWrapper}>
                                <div className={styles.statBox}>
                                    <span className={styles.statLabel}>RP</span>
                                    <span className={styles.statValue}>{hunter.currentRp}</span>
                                </div>
                                <div className={styles.statBox}>
                                    <span className="material-symbols-outlined" style={{ color: '#ff5722', fontSize: '18px' }}>
                                        local_fire_department
                                    </span>
                                    <span className={styles.statValue}>{hunter.currentStreak}d</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}