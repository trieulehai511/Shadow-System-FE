import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, getAvatarUrl } from '../../services/api';
import { SystemAlert } from '../../components/SystemAlert';
import {
    HunterProfileView,
    type AttributeName,
    type AttributeReward,
    type HunterProfileData,
} from '../../components/profile/HunterProfileView';
import styles from './Profile.module.css';

export default function Profile() {
    const [profile, setProfile] = useState<HunterProfileData | null>(null);
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
            console.error("Failed to synchronize profile data from the API:", error);
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
        if (saving) return;
        setErrorMsg('');
        
        if (!fullName.trim()) {
            setErrorMsg('Hunter name cannot be empty.');
            return;
        }
        
        if (age < 16) {
            setErrorMsg('A Hunter must be at least 16 years old to awaken.');
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
                title: "UPDATE SUCCESSFUL",
                message: "The System updated your profile successfully.",
                type: "success"
            });
        } catch (err: any) {
            console.error("Failed to update profile:", err);
            setErrorMsg(err.message || 'Unable to update the profile. Please check your connection.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className={styles.centerLoading}><h3>⚡ SYNCHRONIZING IDENTITY DATA...</h3></div>;
    if (!profile) return <div className={styles.centerLoading}><h3>❌ HUNTER DATA NOT FOUND.</h3></div>;

    return (
        <div className={styles.profileCanvas}>
            <HunterProfileView
                profile={profile}
                attributeReward={attributeReward}
                onEdit={() => {
                    setFullName(profile.fullName || '');
                    setAge(profile.age || 16);
                    setAvatarPreview(profile.avatar || '');
                    setAvatarFile(null);
                    setErrorMsg('');
                    setEditMode(true);
                }}
            />

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
                            Modify Hunter Profile
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
