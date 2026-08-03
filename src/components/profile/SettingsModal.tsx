import React, { useState, useEffect } from 'react';
import { getAvatarUrl, apiRequest } from '../../services/api';
import { getMySettings, updateMySettings, UpdateUserSettingRequest } from '../../services/settingService';
import { UserSetting, UserLanguage, UserTheme, UserRegion } from '../../models/UserSettingModel';
import { HunterProfileData } from './HunterProfileView';
import styles from './SettingsModal.module.css';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile: HunterProfileData | null;
    onProfileUpdated: () => void;
}

type MenuSection = 'profile' | 'timezone' | 'sound' | 'notifications' | 'language' | 'theme';

const LANGUAGE_OPTIONS: Array<{ value: UserLanguage; label: string; flag: string }> = [
    { value: 'VI', label: 'Tiếng Việt', flag: '🇻🇳' },
    { value: 'EN', label: 'English', flag: '🇺🇸' },
    { value: 'JA', label: '日本語', flag: '🇯🇵' },
    { value: 'KO', label: '한국어', flag: '🇰🇷' },
];

const THEME_OPTIONS: Array<{ value: UserTheme; label: string }> = [
    { value: 'SYSTEM', label: 'System Default' },
    { value: 'LIGHT', label: 'Light Mode' },
    { value: 'DARK', label: 'Dark Mode' },
];

const REGION_OPTIONS: Array<{ value: UserRegion; label: string; flag: string }> = [
    { value: 'VN', label: 'Việt Nam', flag: '🇻🇳' },
    { value: 'US', label: 'United States', flag: '🇺🇸' },
    { value: 'JP', label: 'Japan', flag: '🇯🇵' },
    { value: 'KR', label: 'South Korea', flag: '🇰🇷' },
    { value: 'SG', label: 'Singapore', flag: '🇸🇬' },
];

const TIME_ZONE_OPTIONS: string[] = [
    'UTC',
    'Asia/Ho_Chi_Minh', // VN
    'America/New_York', // US
    'Asia/Tokyo',       // JP
    'Asia/Seoul',       // KR
    'Asia/Singapore'    // SG
];

export function SettingsModal({ isOpen, onClose, profile, onProfileUpdated }: SettingsModalProps) {
    const [activeSection, setActiveSection] = useState<MenuSection | null>(window.innerWidth > 768 ? 'profile' : null);
    
    // Profile State
    const [fullName, setFullName] = useState(profile?.fullName || '');
    const [age, setAge] = useState(profile?.age || 16);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState(profile?.avatar || '');
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileError, setProfileError] = useState('');

    // Settings State
    const [settings, setSettings] = useState<UserSetting | null>(null);
    const [settingsLoading, setSettingsLoading] = useState(true);
    const [settingsSaving, setSettingsSaving] = useState(false);
    
    // Clock State
    const [clockNow, setClockNow] = useState(new Date());

    useEffect(() => {
        if (!isOpen) return;
        const interval = setInterval(() => setClockNow(new Date()), 1000);
        return () => clearInterval(interval);
    }, [isOpen]);

    const selectedZoneClock = React.useMemo(() => {
        if (!settings?.zoneId) return null;
        try {
            return {
                time: new Intl.DateTimeFormat('en-US', {
                    timeZone: settings.zoneId,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                }).format(clockNow),
                date: new Intl.DateTimeFormat('en-US', {
                    timeZone: settings.zoneId,
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                }).format(clockNow),
                utc: new Intl.DateTimeFormat('en-US', {
                    timeZone: 'UTC',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                }).format(clockNow),
            };
        } catch (e) {
            return null;
        }
    }, [clockNow, settings?.zoneId]);

    useEffect(() => {
        if (isOpen) {
            // Set initial screen based on viewport width
            if (window.innerWidth <= 768) {
                setActiveSection(null);
            } else {
                setActiveSection('profile');
            }

            // Reset profile form if reopened
            if (profile) {
                setFullName(profile.fullName || '');
                setAge(profile.age || 16);
                setAvatarPreview(profile.avatar || '');
                setAvatarFile(null);
                setProfileError('');
            }
            
            // Fetch settings
            fetchSettings();
        }
    }, [isOpen, profile]);

    const fetchSettings = async () => {
        setSettingsLoading(true);
        try {
            const data = await getMySettings();
            if (data) {
                setSettings(data);
            }
        } catch (error) {
            console.error("Failed to load settings:", error);
            // Provide a fallback if endpoint is not fully working yet
            setSettings({
                region: 'VN',
                language: 'EN',
                theme: 'DARK',
                zoneId: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
                soundEnabled: true,
                notificationsEnabled: true,
                updatedAt: null
            });
        } finally {
            setSettingsLoading(false);
        }
    };

    if (!isOpen) return null;

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
        if (profileSaving) return;
        setProfileError('');
        
        if (!fullName.trim()) {
            setProfileError('Hunter name cannot be empty.');
            return;
        }
        
        if (age < 16) {
            setProfileError('A Hunter must be at least 16 years old to awaken.');
            return;
        }

        setProfileSaving(true);
        try {
            const formData = new FormData();
            formData.append('fullName', fullName.trim());
            formData.append('age', age.toString());
            
            if (avatarFile) {
                formData.append('avatarFile', avatarFile);
            }

            await apiRequest('/hunter/profile', {
                method: 'PUT',
                body: formData,
                useMultipart: true,
            });

            onProfileUpdated();
        } catch (err: any) {
            console.error("Failed to update profile:", err);
            setProfileError(err.message || 'Unable to update the profile.');
        } finally {
            setProfileSaving(false);
        }
    };

    const changeSetting = async (field: keyof UpdateUserSettingRequest, value: any) => {
        if (!settings || settingsSaving) return;
        
        const nextSettings = { ...settings, [field]: value } as UserSetting;
        setSettings(nextSettings); // Optimistic update
        setSettingsSaving(true);

        try {
            await updateMySettings(nextSettings as UpdateUserSettingRequest);
            window.dispatchEvent(new Event('settingsUpdated'));
        } catch (error) {
            console.error(`Failed to update setting ${field}:`, error);
            // Revert on failure
            setSettings(settings);
        } finally {
            setSettingsSaving(false);
        }
    };

    return (
        <div className={styles.overlay} onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}>
            <div className={styles.modalContainer}>
                
                {/* SIDEBAR */}
                <div className={styles.sidebar}>
                    <div className={styles.sidebarHeader}>
                        <span className={`material-symbols-outlined ${styles.icon}`}>settings</span>
                        <h2 className={styles.sidebarTitle}>Settings</h2>
                    </div>
                    <div className={styles.menuList}>
                        <button 
                            className={`${styles.menuItem} ${activeSection === 'profile' ? styles.active : ''}`}
                            onClick={() => setActiveSection('profile')}
                        >
                            <span className="material-symbols-outlined">person</span>
                            Hunter Profile
                        </button>
                        <button 
                            className={`${styles.menuItem} ${activeSection === 'timezone' ? styles.active : ''}`}
                            onClick={() => setActiveSection('timezone')}
                        >
                            <span className="material-symbols-outlined">schedule</span>
                            Time Zone
                        </button>
                        <button 
                            className={`${styles.menuItem} ${activeSection === 'sound' ? styles.active : ''}`}
                            onClick={() => setActiveSection('sound')}
                        >
                            <span className="material-symbols-outlined">volume_up</span>
                            Sound & Audio
                        </button>
                        <button 
                            className={`${styles.menuItem} ${activeSection === 'notifications' ? styles.active : ''}`}
                            onClick={() => setActiveSection('notifications')}
                        >
                            <span className="material-symbols-outlined">notifications</span>
                            Notifications
                        </button>
                        <button 
                            className={`${styles.menuItem} ${activeSection === 'language' ? styles.active : ''}`}
                            onClick={() => setActiveSection('language')}
                        >
                            <span className="material-symbols-outlined">language</span>
                            Language
                        </button>
                        <button 
                            className={`${styles.menuItem} ${activeSection === 'theme' ? styles.active : ''}`}
                            onClick={() => setActiveSection('theme')}
                        >
                            <span className="material-symbols-outlined">palette</span>
                            Theme
                        </button>

                        <button 
                            className={`${styles.menuItem} ${styles.danger}`}
                            onClick={() => {
                                localStorage.removeItem('token');
                                window.location.href = '/login';
                            }}
                        >
                            <span className="material-symbols-outlined">logout</span>
                            Logout
                        </button>
                    </div>
                </div>

                {/* CONTENT AREA */}
                <div className={styles.contentArea}>
                    <div className={styles.contentHeader}>
                        {activeSection && (
                            <button 
                                type="button"
                                className={styles.mobileBackBtn} 
                                onClick={() => setActiveSection(null)}
                                title="Back to settings menu"
                            >
                                <span className="material-symbols-outlined">chevron_left</span>
                            </button>
                        )}
                        <h3 className={styles.contentTitle}>
                            {!activeSection && 'Settings'}
                            {activeSection === 'profile' && 'Modify Hunter Profile'}
                            {activeSection === 'timezone' && 'Time Zone & Region'}
                            {activeSection === 'sound' && 'Sound Settings'}
                            {activeSection === 'notifications' && 'Push Notifications'}
                            {activeSection === 'language' && 'Language Preference'}
                            {activeSection === 'theme' && 'Interface Theme'}
                        </h3>
                        <button className={styles.closeBtn} onClick={onClose}>
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <div className={styles.contentBody}>
                        {settingsLoading ? (
                            <div className={styles.loadingContainer}>
                                <span className="material-symbols-outlined animate-spin" style={{ fontSize: '32px' }}>sync</span>
                                <p>Loading settings...</p>
                            </div>
                        ) : (
                            <>
                                {/* MOBILE MAIN MENU LIST (when activeSection is null) */}
                                {!activeSection && (
                                    <div className={styles.mobileMenuList}>
                                        <div className={styles.mobileMenuItem} onClick={() => setActiveSection('profile')}>
                                            <div className={styles.mobileMenuItemLeft}>
                                                <span className="material-symbols-outlined">person</span>
                                                <span>Hunter Profile</span>
                                            </div>
                                            <span className="material-symbols-outlined">chevron_right</span>
                                        </div>
                                        <div className={styles.mobileMenuItem} onClick={() => setActiveSection('timezone')}>
                                            <div className={styles.mobileMenuItemLeft}>
                                                <span className="material-symbols-outlined">schedule</span>
                                                <span>Time Zone & Region</span>
                                            </div>
                                            <span className="material-symbols-outlined">chevron_right</span>
                                        </div>
                                        <div className={styles.mobileMenuItem} onClick={() => setActiveSection('sound')}>
                                            <div className={styles.mobileMenuItemLeft}>
                                                <span className="material-symbols-outlined">volume_up</span>
                                                <span>Sound & Audio</span>
                                            </div>
                                            <span className="material-symbols-outlined">chevron_right</span>
                                        </div>
                                        <div className={styles.mobileMenuItem} onClick={() => setActiveSection('notifications')}>
                                            <div className={styles.mobileMenuItemLeft}>
                                                <span className="material-symbols-outlined">notifications</span>
                                                <span>Notifications</span>
                                            </div>
                                            <span className="material-symbols-outlined">chevron_right</span>
                                        </div>
                                        <div className={styles.mobileMenuItem} onClick={() => setActiveSection('language')}>
                                            <div className={styles.mobileMenuItemLeft}>
                                                <span className="material-symbols-outlined">language</span>
                                                <span>Language</span>
                                            </div>
                                            <span className="material-symbols-outlined">chevron_right</span>
                                        </div>
                                        <div className={styles.mobileMenuItem} onClick={() => setActiveSection('theme')}>
                                            <div className={styles.mobileMenuItemLeft}>
                                                <span className="material-symbols-outlined">palette</span>
                                                <span>Theme</span>
                                            </div>
                                            <span className="material-symbols-outlined">chevron_right</span>
                                        </div>
                                        <div className={`${styles.mobileMenuItem} ${styles.danger}`} onClick={() => {
                                            localStorage.removeItem('token');
                                            window.location.href = '/login';
                                        }}>
                                            <div className={styles.mobileMenuItemLeft}>
                                                <span className="material-symbols-outlined">logout</span>
                                                <span>Logout</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {/* PROFILE SECTION */}
                                {activeSection === 'profile' && (
                                    <form className={styles.form} onSubmit={handleSaveProfile}>
                                        <div className={styles.formField}>
                                            <label>Avatar Identity</label>
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
                                            <label htmlFor="fullName">Hunter Name</label>
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

                                        {profileError && <p className={styles.errorText}>{profileError}</p>}

                                        <div className={styles.buttonRow}>
                                            <button 
                                                type="submit" 
                                                className={styles.saveBtn}
                                                disabled={profileSaving}
                                            >
                                                {profileSaving ? 'Syncing...' : 'Save Profile'}
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {/* LANGUAGE SECTION */}
                                {activeSection === 'language' && settings && (
                                    <div className={styles.optionsList}>
                                        {LANGUAGE_OPTIONS.map(opt => (
                                            <div 
                                                key={opt.value} 
                                                className={`${styles.optionItem} ${settings.language === opt.value ? styles.selected : ''}`}
                                                onClick={() => changeSetting('language', opt.value)}
                                            >
                                                <div className={styles.optionLabel}>
                                                    <span className={styles.optionIcon}>{opt.flag}</span>
                                                    {opt.label}
                                                </div>
                                                {settings.language === opt.value && <span className={`material-symbols-outlined ${styles.checkIcon}`}>check_circle</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* THEME SECTION */}
                                {activeSection === 'theme' && settings && (
                                    <div className={styles.optionsList}>
                                        {THEME_OPTIONS.map(opt => (
                                            <div 
                                                key={opt.value} 
                                                className={`${styles.optionItem} ${settings.theme === opt.value ? styles.selected : ''}`}
                                                onClick={() => changeSetting('theme', opt.value)}
                                            >
                                                <div className={styles.optionLabel}>
                                                    <span className="material-symbols-outlined">
                                                        {opt.value === 'LIGHT' ? 'light_mode' : opt.value === 'DARK' ? 'dark_mode' : 'settings_brightness'}
                                                    </span>
                                                    {opt.label}
                                                </div>
                                                {settings.theme === opt.value && <span className={`material-symbols-outlined ${styles.checkIcon}`}>check_circle</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* TIMEZONE SECTION */}
                                {activeSection === 'timezone' && settings && (
                                    <div className={styles.optionsList}>
                                        {/* Live Clock Card */}
                                        {selectedZoneClock && (
                                            <div className={styles.clockCard}>
                                                <h1 className={styles.clockTime}>{selectedZoneClock.time}</h1>
                                                <span className={styles.clockDate}>{selectedZoneClock.date}</span>
                                                <div className={styles.clockZoneRow}>
                                                    <span className={styles.clockZone}>
                                                        <span className="material-symbols-outlined" style={{fontSize: '16px'}}>globe</span>
                                                        {settings.zoneId}
                                                    </span>
                                                    <span className={styles.clockZone} style={{marginLeft: '12px', opacity: 0.7}}>
                                                        UTC {selectedZoneClock.utc}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Region Select */}
                                        <div className={styles.formField} style={{ marginBottom: '16px' }}>
                                            <label>Region</label>
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                {REGION_OPTIONS.map(opt => (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => changeSetting('region', opt.value)}
                                                        className={`${styles.fileInputBtn} ${settings.region === opt.value ? styles.selected : ''}`}
                                                        style={settings.region === opt.value ? { borderColor: 'var(--color-primary)', color: 'var(--color-primary)' } : {}}
                                                    >
                                                        {opt.flag} {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Searchable Timezone Input */}
                                        <div className={styles.formField}>
                                            <label>Select Time Zone</label>
                                            <div className={styles.selectWrapper}>
                                                <select 
                                                    className={styles.select}
                                                    value={settings.zoneId}
                                                    onChange={(e) => changeSetting('zoneId', e.target.value)}
                                                >
                                                    <option value="" disabled>Choose a time zone...</option>
                                                    {TIME_ZONE_OPTIONS.map(zone => (
                                                        <option key={zone} value={zone}>
                                                            {zone.replace(/_/g, ' ')}
                                                        </option>
                                                    ))}
                                                </select>
                                                <span className={`material-symbols-outlined ${styles.selectIcon}`}>expand_more</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* SOUND SECTION */}
                                {activeSection === 'sound' && settings && (
                                    <div className={styles.switchRow}>
                                        <div className={styles.switchInfo}>
                                            <span className={styles.switchTitle}>System Sounds</span>
                                            <span className={styles.switchDesc}>Enable sound effects and UI audio cues.</span>
                                        </div>
                                        <label className={styles.toggleSwitch}>
                                            <input 
                                                type="checkbox" 
                                                checked={settings.soundEnabled} 
                                                onChange={(e) => changeSetting('soundEnabled', e.target.checked)}
                                            />
                                            <span className={styles.slider}></span>
                                        </label>
                                    </div>
                                )}

                                {/* NOTIFICATIONS SECTION */}
                                {activeSection === 'notifications' && settings && (
                                    <div className={styles.switchRow}>
                                        <div className={styles.switchInfo}>
                                            <span className={styles.switchTitle}>Push Notifications</span>
                                            <span className={styles.switchDesc}>Receive alerts for daily quests, system messages and rank updates.</span>
                                        </div>
                                        <label className={styles.toggleSwitch}>
                                            <input 
                                                type="checkbox" 
                                                checked={settings.notificationsEnabled} 
                                                onChange={(e) => changeSetting('notificationsEnabled', e.target.checked)}
                                            />
                                            <span className={styles.slider}></span>
                                        </label>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
