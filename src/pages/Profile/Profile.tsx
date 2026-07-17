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

type AttributeName = 'strength' | 'agility' | 'vitality';
type AttributeValues = Partial<Record<AttributeName, number>>;

type AttributeReward = {
    attributeGains: AttributeValues;
    attributesAfter: AttributeValues;
    claimedAt: number;
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
    const [attributeReward, setAttributeReward] = useState<AttributeReward | null>(null);
    
    const navigate = useNavigate();

    const getRankClass = (tier: string = '') => {
        const firstLetter = tier.trim().toUpperCase()[0];
        switch (firstLetter) {
            case 'S': return styles.rankS;
            case 'A': return styles.rankA;
            case 'B': return styles.rankB;
            case 'C': return styles.rankC;
            case 'D': return styles.rankD;
            case 'E':
            default:
                return styles.rankE;
        }
    };

    const fetchProfile = async (): Promise<void> => {
        try {
            const token = sessionStorage.getItem('token');
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

                const storedReward = sessionStorage.getItem('shadow_system_strength_reward');
                if (storedReward) {
                    try {
                        const reward = JSON.parse(storedReward) as AttributeReward;
                        const rewardMatchesProfile = (['strength', 'agility', 'vitality'] as AttributeName[]).every(
                            (attribute) => reward.attributesAfter[attribute] === undefined || profileData[attribute] === reward.attributesAfter[attribute]
                        );
                        if (rewardMatchesProfile) {
                            setAttributeReward(reward);
                            sessionStorage.removeItem('shadow_system_strength_reward');
                        }
                    } catch {
                        sessionStorage.removeItem('shadow_system_strength_reward');
                    }
                }
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
            {/* TOP SECTION: INSTAGRAM STYLE HEADER */}
            <div className={styles.profileTopContainer}>
                <div className={styles.avatarSection}>
                    <img 
                        className={styles.profileAvatar} 
                        src={getAvatarUrl(profile.avatar)} 
                        alt="Hunter Avatar" 
                    />
                </div>
                
                <div className={styles.profileInfoSection}>
                    <div className={styles.infoRowOne}>
                        <h2 className={styles.userName}>{profile.userName}</h2>
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
                            Edit Profile
                        </button>
                    </div>
                    
                    <div className={styles.infoRowTwo}>
                        <div className={styles.statItem}>
                            <span className={styles.statValue}>{profile.currentRp}</span>
                            <span className={styles.statLabel}>RP</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statValue}>{profile.currentStreak}</span>
                            <span className={styles.statLabel}>Streak</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statValue}>{profile.maxStreak}</span>
                            <span className={styles.statLabel}>Best</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={`${styles.statValue} ${styles.rankValue} ${getRankClass(profile.rankTier)}`}>{profile.rankTier?.replace('_', ' ') || 'E'}</span>
                            <span className={styles.statLabel}>Rank</span>
                        </div>
                    </div>
                    
                    <div className={styles.infoRowThree}>
                        <h3 className={styles.fullName}>{profile.fullName}</h3>
                        <p className={styles.bioText}>Awakened Hunter • Age: {profile.age}</p>
                        <p className={styles.hunterCodeText}>ID: {profile.hunterCode}</p>
                    </div>
                </div>
            </div>

            <div className={styles.profileDivider}></div>

            {/* BOTTOM SECTION: ATTRIBUTES & STATS */}
            <div className={styles.attributesSection}>
                <h3 className={styles.sectionTitle}>Combat Attributes</h3>
                <div className={styles.attributesGrid}>
                    <div className={`${styles.attrCard} ${attributeReward ? styles.strengthBuffed : ''}`}>
                        <div className={styles.attrIconWrapper}>
                            <span className="material-symbols-outlined">fitness_center</span>
                        </div>
                        <div className={styles.attrInfo}>
                            <span className={styles.attrValue}>{profile.strength}</span>
                            <span className={styles.attrName}>STR</span>
                        </div>
                        {attributeReward && (
                            <div className={styles.strengthBuffNotice} role="status">
                                <span className="material-symbols-outlined">arrow_upward</span>
                                <span>
                                    {typeof attributeReward.attributeGains.strength === 'number' && attributeReward.attributeGains.strength > 0
                                        ? `+${attributeReward.attributeGains.strength} STR`
                                        : 'BUFF GHI NHẬN'}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className={`${styles.attrCard} ${attributeReward ? styles.strengthBuffed : ''}`}>
                        <div className={styles.attrIconWrapper}>
                            <span className="material-symbols-outlined">directions_run</span>
                        </div>
                        <div className={styles.attrInfo}>
                            <span className={styles.attrValue}>{profile.agility}</span>
                            <span className={styles.attrName}>AGI</span>
                        </div>
                        {attributeReward && (
                            <div className={styles.strengthBuffNotice} role="status">
                                <span className="material-symbols-outlined">arrow_upward</span>
                                <span>{typeof attributeReward.attributeGains.agility === 'number' && attributeReward.attributeGains.agility > 0 ? `+${attributeReward.attributeGains.agility} AGI` : 'BUFF GHI NHẬN'}</span>
                            </div>
                        )}
                    </div>
                    <div className={`${styles.attrCard} ${attributeReward ? styles.strengthBuffed : ''}`}>
                        <div className={styles.attrIconWrapper}>
                            <span className="material-symbols-outlined">favorite</span>
                        </div>
                        <div className={styles.attrInfo}>
                            <span className={styles.attrValue}>{profile.vitality}</span>
                            <span className={styles.attrName}>VIT</span>
                        </div>
                        {attributeReward && (
                            <div className={styles.strengthBuffNotice} role="status">
                                <span className="material-symbols-outlined">arrow_upward</span>
                                <span>{typeof attributeReward.attributeGains.vitality === 'number' && attributeReward.attributeGains.vitality > 0 ? `+${attributeReward.attributeGains.vitality} VIT` : 'BUFF GHI NHẬN'}</span>
                            </div>
                        )}
                    </div>
                    <div className={styles.attrCard}>
                        <div className={styles.attrIconWrapper}>
                            <span className="material-symbols-outlined">shield</span>
                        </div>
                        <div className={styles.attrInfo}>
                            <span className={styles.attrValue}>{profile.shieldCount}</span>
                            <span className={styles.attrName}>Shields</span>
                        </div>
                    </div>
                </div>
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
