import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { apiRequest, getAvatarUrl } from '../../services/api';
import { SystemAlert } from '../../components/SystemAlert';
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
    rankTier: string;
    currentStreak: number;
    maxStreak: number;
    shieldCount: number;
    strength: number;
    agility: number;
    vitality: number;
    avatar?: string;
};

export default function Profile() {
    const [profile, setProfile] = useState<HunterProfile | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [editMode, setEditMode] = useState<boolean>(false);
    
    // Form fields
    const [fullName, setFullName] = useState<string>('');
    const [age, setAge] = useState<number>(16);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string>('');
    
    const [saving, setSaving] = useState<boolean>(false);
    const [errorMsg, setErrorMsg] = useState<string>('');
    const [alertConfig, setAlertConfig] = useState<{
        message: string;
        type: 'success' | 'error' | 'info' | 'warning';
        title?: string;
        onClose?: () => void;
    } | null>(null);
    
    const navigate = useNavigate();

    const fetchProfile = async (): Promise<void> => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            const data = await apiRequest('/auth/me');
            const profileData = data.result ? data.result : data;

            if (profileData) {
                setProfile(profileData);
                setFullName(profileData.fullName || '');
                setAge(profileData.age || 16);
                setAvatarPreview(profileData.avatar || '');
            }
        } catch (error: any) {
            console.error("Lỗi đồng bộ dữ liệu hồ sơ từ API:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, [navigate]);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        
        if (!fullName.trim()) {
            setErrorMsg('Tên thợ săn không được để trống');
            return;
        }
        
        if (age < 16) {
            setErrorMsg('Thợ săn phải từ 16 tuổi trở lên mới được thức tỉnh');
            return;
        }

        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('fullName', fullName.trim());
            formData.append('age', age.toString());
            
            if (avatarFile) {
                formData.append('avatarFile', avatarFile);
            }

            const data = await apiRequest('/hunter/profile', {
                method: 'PUT',
                body: formData,
                useMultipart: true,
            });

            if (data && data.result) {
                setProfile(data.result);
            } else if (data) {
                // If backend returns the profile directly
                setProfile(data);
            }
            
            setEditMode(false);
            setAvatarFile(null);
            // Refresh layout or status
            await fetchProfile();
            window.dispatchEvent(new Event('profileUpdated'));
            setAlertConfig({
                title: "CẬP NHẬT THÀNH CÔNG",
                message: "Hệ thống cập nhật thông tin bản thể thành công!",
                type: "success"
            });
        } catch (err: any) {
            console.error("Lỗi khi cập nhật thông tin hồ sơ:", err);
            setErrorMsg(err.message || 'Không thể cập nhật hồ sơ, vui lòng kiểm tra lại kết nối.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className={styles.centerLoading}><h3>⚡ ĐANG ĐỒNG BỘ THÔNG TIN BẢN THỂ...</h3></div>;
    if (!profile) return <div className={styles.centerLoading}><h3>❌ KHÔNG TÌM THẤY DỮ LIỆU THỢ SĂN.</h3></div>;

    return (
        <div className={styles.profileCanvas}>
            <div className={styles.profileHeader}>
                <div className={styles.editHeaderRow}>
                    <div className={styles.titleWrapper}>
                        <span className="material-symbols-outlined">person</span>
                        <h1 className={styles.title}>Hunter Status</h1>
                    </div>
                    <button 
                        className={styles.editBtn}
                        onClick={() => {
                            setFullName(profile.fullName || '');
                            setAge(profile.age || 16);
                            setAvatarPreview(profile.avatar || '');
                            setAvatarFile(null);
                            setErrorMsg('');
                            setEditMode(true);
                        }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                        Edit Profile
                    </button>
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
                            src={getAvatarUrl(profile.avatar)}
                        />
                    </div>
                    <div className={styles.metaColumn}>
                        <h2 className={styles.hunterName}>{profile.fullName} ({profile.userName})</h2>
                        <span className={styles.titleBadge}>Active Hunter (Age: {profile.age || 'Awakened'})</span>
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

            {/* EDIT PROFILE MODAL */}
            {editMode && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={`${styles.corner} ${styles.topLeft}`}></div>
                        <div className={`${styles.corner} ${styles.topRight}`}></div>
                        <div className={`${styles.corner} ${styles.bottomLeft}`}></div>
                        <div className={`${styles.corner} ${styles.bottomRight}`}></div>
                        <div className={styles.scanline}></div>

                        <h2 className={styles.modalTitle}>
                            <span className="material-symbols-outlined">edit_square</span>
                            Modify Bản Thể Profile
                        </h2>
                        
                        <form className={styles.form} onSubmit={handleSaveProfile}>
                            <div className={styles.formField}>
                                <label>Avatar</label>
                                <div className={styles.avatarSelectRow}>
                                    <img 
                                        className={styles.previewAvatar} 
                                        src={getAvatarUrl(avatarPreview)} 
                                        alt="Avatar Preview" 
                                    />
                                    <div className={styles.fileInputWrapper}>
                                        <button type="button" className={styles.fileInputBtn}>
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>upload</span>
                                            Choose File
                                        </button>
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            className={styles.fileInput}
                                            onChange={handleAvatarChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={styles.formField}>
                                <label htmlFor="fullName">Full Name</label>
                                <input 
                                    type="text" 
                                    id="fullName"
                                    className={styles.input} 
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Enter your hunter name"
                                    required
                                />
                            </div>

                            <div className={styles.formField}>
                                <label htmlFor="age">Age</label>
                                <input 
                                    type="number" 
                                    id="age"
                                    min="16"
                                    className={styles.input} 
                                    value={age}
                                    onChange={(e) => setAge(parseInt(e.target.value) || 0)}
                                    placeholder="Minimum 16 years old"
                                    required
                                />
                            </div>

                            {errorMsg && <p className={styles.errorText}>{errorMsg}</p>}

                            <div className={styles.buttonRow}>
                                <button 
                                    type="button" 
                                    className={styles.cancelBtn}
                                    onClick={() => setEditMode(false)}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className={styles.saveBtn}
                                    disabled={saving}
                                >
                                    {saving ? 'Syncing...' : 'Save Profile'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {alertConfig && (
                <SystemAlert 
                    title={alertConfig.title}
                    message={alertConfig.message}
                    type={alertConfig.type}
                    onClose={() => {
                        const cb = alertConfig.onClose;
                        setAlertConfig(null);
                        if (cb) cb();
                    }}
                />
            )}
        </div>
    );
}

