import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import styles from './Profile.module.css';

type TokenPayload = {
    sub: string;
    userName: string;
    hunterCode?: string;
};

type HunterProfile = {
    userName: string;
    hunterCode: string;
    fullName: string;
    age: number;
    currentRp: number;
    rankTier: string; // matches RankTier enum from backend
    currentStreak: number;
    maxStreak: number;
    shieldCount: number;
    strength: number;
    agility: number;
    vitality: number;
};

type ProfileApiResponse = {
    code: number;
    result?: HunterProfile;
};

export default function Profile() {
    const [profile, setProfile] = useState<HunterProfile | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProfile = async (): Promise<void> => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    navigate('/login');
                    return;
                }

                const decoded = jwtDecode<TokenPayload>(token);
                const usernameParam = decoded.sub;

                // Call the hunter profile API
                const response = await fetch(`https://shadow-system-1086471329115.asia-southeast1.run.app/shadow-system/hunter/${usernameParam}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                const data = await response.json();

                // Backend API might return the DTO directly at the root, or wrapped inside data.result
                const profileData = data.result ? data.result : data;

                if (profileData && (profileData.userName || profileData.hunterCode)) {
                    setProfile(profileData);
                }
            } catch (error) {
                console.error("Lỗi đồng bộ dữ liệu hồ sơ từ API:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [navigate]);

    if (loading) return <div className={styles.centerLoading}><h3>⚡ ĐANG ĐỒNG BỘ THÔNG TIN BẢN THỂ...</h3></div>;
    if (!profile) return <div className={styles.centerLoading}><h3>❌ KHÔNG TÌM THẤY DỮ LIỆU THỢ SĂN.</h3></div>;

    return (
        <div className={styles.profileCanvas}>
            <div className={styles.profileHeader}>
                <div className={styles.titleWrapper}>
                    <span className="material-symbols-outlined">person</span>
                    <h1 className={styles.title}>Hunter Status</h1>
                </div>
                <p className={styles.subtitle}>Detailed Information of the Awakened Being</p>
            </div>

            <div className={styles.bentoGrid}>
                {/* Profile Overview Card */}
                <section className={styles.overviewCard}>
                    <div className={styles.glowDecoration}></div>
                    <div className={styles.avatarBigWrapper}>
                        <img 
                            className={styles.avatarBig} 
                            alt="Hunter Avatar" 
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDEKLlUzRvvpISR-0lZQmXWsGgz22UXc-gHzCFcQtKfGVHo7IGdf3rvsPV3VG5nrVWtkOfLglpFzBu1Nf-ZsYOutA_vy8m2hVcZ33uhYgVLcXWyD0He0f3hKqVX1pT7DwiEOzTaEFWPx01LHY5M_Nzo6qvarZbEz5KOpggoekfDdEhJ9Zpx5MlGXwZOjA8gHpjdhbNSnJ-82ZtsJa7e7hIST_UKMXTfrMHEH_0FdgiCaLKPUFpvDsYNkbmZ8l43HezLZwDRYlV_PJw"
                        />
                    </div>
                    <div className={styles.metaColumn}>
                        <h2 className={styles.hunterName}>{profile.fullName} ({profile.userName})</h2>
                        <span className={styles.titleBadge}>Active Hunter</span>
                        <div className={styles.levelGroup}>
                            <span className={styles.levelLabel}>Rank:</span>
                            <span className={styles.rankText}>{profile.rankTier?.replace('_', ' ') || 'E RANK'}</span>
                        </div>
                    </div>
                </section>

                {/* Level Progress Bento Panel */}
                <section className={styles.xpCard}>
                    <h3 className={styles.panelTitle}>Hunter Record Metrics</h3>
                    <div className={styles.currencyRow} style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>
                        <div className={styles.currencyCell}>
                            <span className="material-symbols-outlined">fingerprint</span>
                            <div>
                                <p>HUNTER CODE</p>
                                <strong>{profile.hunterCode}</strong>
                            </div>
                        </div>
                        <div className={styles.currencyCell}>
                            <span className="material-symbols-outlined">stars</span>
                            <div>
                                <p>CURRENT RP</p>
                                <strong>{profile.currentRp} RP</strong>
                            </div>
                        </div>
                        <div className={styles.currencyCell}>
                            <span className="material-symbols-outlined">local_fire_department</span>
                            <div>
                                <p>STREAK (CURRENT / MAX)</p>
                                <strong>{profile.currentStreak} Days / {profile.maxStreak} Days</strong>
                            </div>
                        </div>
                        <div className={styles.currencyCell}>
                            <span className="material-symbols-outlined">shield</span>
                            <div>
                                <p>SHIELD COUNT</p>
                                <strong>{profile.shieldCount} Active Shields</strong>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Stats Bento Card */}
                <section className={styles.statsCard}>
                    <h3 className={styles.panelTitle}>
                        <span className="material-symbols-outlined">query_stats</span>
                        Ability Attributes
                    </h3>
                    <div className={styles.statsList}>
                        <div className={styles.statRow}>
                            <div className={styles.statNameCol}>
                                <span className={styles.statLabel}>STRENGTH (STR)</span>
                            </div>
                            <div className={styles.statValCol}>
                                <span className={styles.statValue}>{profile.strength}</span>
                            </div>
                        </div>
                        <div className={styles.statRow}>
                            <div className={styles.statNameCol}>
                                <span className={styles.statLabel}>AGILITY (AGI)</span>
                            </div>
                            <div className={styles.statValCol}>
                                <span className={styles.statValue}>{profile.agility}</span>
                            </div>
                        </div>
                        <div className={styles.statRow}>
                            <div className={styles.statNameCol}>
                                <span className={styles.statLabel}>VITALITY (VIT)</span>
                            </div>
                            <div className={styles.statValCol}>
                                <span className={styles.statValue}>{profile.vitality}</span>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
