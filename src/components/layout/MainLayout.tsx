import { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { apiRequest, getAvatarUrl } from '../../services/api';
import {
    enableNotifications,
    listenForForegroundMessages,
    registerCurrentDevice,
    unregisterCurrentDevice,
} from '../../services/notifications';
import { SettingsModal } from '../profile/SettingsModal';
import { getMySettings } from '../../services/settingService';
import logo from '../../assets/logo-purple-blue.png';
import styles from './MainLayout.module.css';

function getSecondsUntilMidnightInTimezone(zoneId?: string): number {
    const now = new Date();
    if (!zoneId) {
        const midnight = new Date();
        midnight.setHours(24, 0, 0, 0);
        return Math.floor((midnight.getTime() - now.getTime()) / 1000);
    }

    try {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: zoneId,
            hour12: false,
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        });
        
        const parts = formatter.formatToParts(now);
        let hour = 0, minute = 0, second = 0;
        for (const part of parts) {
            if (part.type === 'hour') hour = parseInt(part.value, 10);
            if (part.type === 'minute') minute = parseInt(part.value, 10);
            if (part.type === 'second') second = parseInt(part.value, 10);
        }
        if (hour === 24) hour = 0;
        
        const elapsedSecondsInDay = hour * 3600 + minute * 60 + second;
        return 86400 - elapsedSecondsInDay;
    } catch (e) {
        const midnight = new Date();
        midnight.setHours(24, 0, 0, 0);
        return Math.floor((midnight.getTime() - now.getTime()) / 1000);
    }
}

type TokenPayload = {
    sub: string;
    userName: string;
};

export default function MainLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuVisible, setIsMobileMenuVisible] = useState<boolean>(true);

    const [hunterName, setHunterName] = useState<string>("Sung Jin-Woo");
    const [avatar, setAvatar] = useState<string>("");
    const [rankTier, setRankTier] = useState<string>("E RANK");
    const [fullProfile, setFullProfile] = useState<any>(null);
    const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

    const [questCompleted, setQuestCompleted] = useState<boolean>(false);
    const [penaltyTime, setPenaltyTime] = useState<string>("00:00:00");
    const [showPenaltyInfo, setShowPenaltyInfo] = useState<boolean>(false);
    const [userZoneId, setUserZoneId] = useState<string>("");

    // Calculate time left until midnight based on user's timezone
    useEffect(() => {
        const updateTimer = () => {
            const diffSeconds = getSecondsUntilMidnightInTimezone(userZoneId);
            
            if (diffSeconds <= 0) {
                setPenaltyTime("00:00:00");
                return;
            }
            
            const h = String(Math.floor(diffSeconds / 3600)).padStart(2, '0');
            const m = String(Math.floor((diffSeconds % 3600) / 60)).padStart(2, '0');
            const s = String(diffSeconds % 60).padStart(2, '0');
            setPenaltyTime(`${h}:${m}:${s}`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [userZoneId]);

    const fetchQuestStatus = async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = jwtDecode<TokenPayload>(token);
                const username = decoded.sub;
                if (username) {
                    const data = await apiRequest(`/daily-quest/hunter/${username}`);
                    const questData = data.result ? data.result : data;
                    if (questData) {
                        setQuestCompleted(questData.completed || false);
                    }
                }
            } catch (e) {
                console.error("Failed to fetch quest information in the layout:", e);
            }
        }
    };

    useEffect(() => {
        fetchQuestStatus();
        window.addEventListener('questUpdated', fetchQuestStatus);
        return () => window.removeEventListener('questUpdated', fetchQuestStatus);
    }, []);

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;
        let cancelled = false;

        registerCurrentDevice().catch((error) => {
            // Notification permission may be denied; it must not block the app.
            console.error('Unable to register this device for notifications:', error);
        });

        listenForForegroundMessages((payload) => {
            if (!('Notification' in window) || Notification.permission !== 'granted') return;
            const notification = new Notification(payload.notification?.title || payload.data?.title || 'SHADOW SYSTEM', {
                body: payload.notification?.body || payload.data?.body || 'You have a new notification.',
                icon: '/logo-purple-blue.png',
                data: payload.data,
            });
            notification.onclick = () => {
                window.focus();
                if (payload.data?.screenToOpen === 'QUEST_DETAIL') {
                    navigate(`/daily-quest${payload.data.questId ? `?questId=${encodeURIComponent(payload.data.questId)}` : ''}`);
                }
                notification.close();
            };
        }).then((cleanup) => {
            if (cancelled) cleanup?.();
            else unsubscribe = cleanup;
        }).catch((error) => console.error('Unable to listen for foreground notifications:', error));

        return () => {
            cancelled = true;
            unsubscribe?.();
        };
    }, [navigate]);

    // Autohide mobile tabbar on scroll down, show on scroll up
    useEffect(() => {
        let lastScrollY = window.scrollY;
        const handleScroll = () => {
            if (window.scrollY > lastScrollY && window.scrollY > 50) {
                setIsMobileMenuVisible(false);
            } else {
                setIsMobileMenuVisible(true);
            }
            lastScrollY = window.scrollY;
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const fetchProfileData = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const data = await apiRequest('/auth/me');
                    const profileData = data.result ? data.result : data;
                    if (profileData) {
                        setFullProfile(profileData);
                        setHunterName(profileData.fullName || "Sung Jin-Woo");
                        setAvatar(profileData.avatar || "");
                        setRankTier(profileData.rankTier || "E RANK");
                    }
                } catch (e) {
                    console.error("Failed to fetch the profile from /auth/me in the layout:", e);
                }
            }
        };
        fetchProfileData();

        // Listen for profile update event to refresh layout dynamically
        window.addEventListener('profileUpdated', fetchProfileData);
        return () => window.removeEventListener('profileUpdated', fetchProfileData);
    }, []);

    // Fetch User Settings for Timezone
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const settings = await getMySettings();
                if (settings?.zoneId) {
                    setUserZoneId(settings.zoneId);
                }
            } catch (e) {
                console.error("Failed to fetch settings in layout:", e);
            }
        };

        fetchSettings();
        const handleOpenSettings = () => setSettingsOpen(true);
        window.addEventListener('openSettingsModal', handleOpenSettings);
        window.addEventListener('settingsUpdated', fetchSettings);
        window.addEventListener('profileUpdated', fetchSettings);
        return () => {
            window.removeEventListener('openSettingsModal', handleOpenSettings);
            window.removeEventListener('settingsUpdated', fetchSettings);
            window.removeEventListener('profileUpdated', fetchSettings);
        };
    }, []);

    const handleLogout = async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                await unregisterCurrentDevice();
            } catch (e) {
                console.error("Device notification token removal failed:", e);
            }
            try {
                await apiRequest('/auth/logout', {
                    method: 'POST',
                    body: JSON.stringify({ token }),
                });
            } catch (e) {
                console.error("Logout API request failed:", e);
            }
        }
        localStorage.removeItem('token');
        navigate('/login');
    };

    const handleEnableNotifications = async () => {
        try {
            const deviceToken = await enableNotifications();
            if (!deviceToken) {
                window.alert('Notifications are unavailable. On iPhone, add this app to the Home Screen first.');
            }
        } catch (error) {
            console.error('Unable to enable notifications:', error);
            window.alert('Unable to enable notifications. Please check the browser permission and try again.');
        }
    };



    return (
        <div className={styles.layoutContainer}>
            {/* Ambient Overlays - extremely subtle */}
            <div className={styles.systemGrid} aria-hidden="true"></div>

            <div className={styles.flexWrapper}>
                {/* SIDENAVBAR (Desktop Only) - Instagram Style Left Sidebar with Hover Reveal */}
                <nav className={styles.sidenavbar}>
                    {/* Header Logo */}
                    <div className={styles.navHeader}>
                        {/* <h1 className={styles.sidebarLogo}>SHADOW</h1> */}
                    </div>

                    {/* Nav Links */}
                    <ul className={styles.navLinks}>
                        <li>
                            <Link
                                to="/daily-quest"
                                className={`${styles.navItem} ${location.pathname === '/daily-quest' ? styles.activeNavItem : ''}`}
                            >
                                <span className={`material-symbols-outlined ${location.pathname === '/daily-quest' ? styles.fillIcon : ''}`}>
                                    home
                                </span>
                                <span className={styles.navText}>Dashboard</span>
                            </Link>
                        </li>
                        <li>
                            <Link
                                to="/exercises"
                                className={`${styles.navItem} ${location.pathname === '/exercises' ? styles.activeNavItem : ''}`}
                            >
                                <span className={`material-symbols-outlined ${location.pathname === '/exercises' ? styles.fillIcon : ''}`}>
                                    fitness_center
                                </span>
                                <span className={styles.navText}>Exercises</span>
                            </Link>
                        </li>
                        <li>
                            <Link
                                to="/history"
                                className={`${styles.navItem} ${location.pathname === '/history' ? styles.activeNavItem : ''}`}
                            >
                                <span className={`material-symbols-outlined ${location.pathname === '/history' ? styles.fillIcon : ''}`}>
                                    history
                                </span>
                                <span className={styles.navText}>History</span>
                            </Link>
                        </li>
                        <li>
                            <Link
                                to="/leaderboard"
                                className={`${styles.navItem} ${location.pathname === '/leaderboard' ? styles.activeNavItem : ''}`}
                            >
                                <span className={`material-symbols-outlined ${location.pathname === '/leaderboard' ? styles.fillIcon : ''}`}>
                                    trophy
                                </span>
                                <span className={styles.navText}>Leaderboard</span>
                            </Link>
                        </li>
                        <li>
                            <Link
                                to="/hunter-search"
                                className={`${styles.navItem} ${location.pathname === '/hunter-search' ? styles.activeNavItem : ''}`}
                            >
                                <span className={`material-symbols-outlined ${location.pathname === '/hunter-search' ? styles.fillIcon : ''}`}>
                                    person_search
                                </span>
                                <span className={styles.navText}>Hunter Search</span>
                            </Link>
                        </li>
                    </ul>

                    {/* Footer Settings & Logout */}
                    <div className={styles.navFooter}>
                        <button
                            className={styles.navItem}
                            onClick={() => navigate('/profile')}
                        >
                            <div className={styles.sidebarAvatarWrapper}>
                                <img
                                    className={styles.sidebarAvatarImg}
                                    alt="Hunter Avatar"
                                    src={getAvatarUrl(avatar)}
                                />
                            </div>
                            <span className={styles.navText}>
                                <Link
                                    to="/profile"
                                    className={`${styles.navItem} ${location.pathname === '/profile' ? styles.activeNavItem : ''}`}
                                >

                                    <span className={styles.navText}>Profile</span>
                                </Link>

                            </span>
                        </button>

                        <button
                            className={styles.navItem}
                            onClick={() => setSettingsOpen(true)}
                            title="Settings"
                        >
                            <span className="material-symbols-outlined">settings</span>
                            <span className={styles.navText}>Settings</span>
                        </button>
                        <button
                            className={styles.navItem}
                            onClick={handleLogout}
                            title="Log Out"
                        >
                            <span className="material-symbols-outlined">logout</span>
                            <span className={styles.navText}>Log Out</span>
                        </button>
                    </div>
                </nav>

                {/* MAIN CONTENT AREA */}
                <div className={styles.mainWrapper}>
                    {/* TOPAPPBAR (Instagram-style) */}
                    <header className={styles.topHeader}>
                        <div>   </div>
                        {/* Top Left: Settings */}
                        {/* <div className={styles.headerLeft}>
                            <button 
                                className={styles.headerBtn} 
                                title="Settings" 
                                onClick={() => navigate('/profile')}
                            >
                                <span className="material-symbols-outlined">settings</span>
                            </button>
                        </div> */}

                        {/* Top Center: Stylized Brand Name */}
                        <div className={styles.headerTitle} onClick={() => navigate('/daily-quest')}>
                            <span className={styles.headerLogoCrop} aria-hidden="true">
                                <img className={styles.headerLogo} src={logo} alt="" />
                            </span>
                            <span>SHADOW SYSTEM</span>
                        </div>

                        {/* Top Right: Notifications + Logout + Avatar */}
                        <div className={styles.headerIcons}>
                            {/* Penalty Timer Widget */}
                            <div className={`${styles.headerTimerGroup} ${questCompleted ? styles.timerSafe : styles.timerDanger}`}>
                                <div className={styles.timerWrapper}>
                                    <span className={`material-symbols-outlined ${styles.timerIcon}`}>schedule</span>
                                    <span className={styles.timerText}>{penaltyTime}</span>
                                </div>
                                
                                <div className={styles.penaltyInfoWrapper}>
                                    <button 
                                        className={styles.infoTriggerBtn} 
                                        onClick={() => setShowPenaltyInfo(!showPenaltyInfo)}
                                        title="Click to view Penalty details"
                                    >
                                        <span className="material-symbols-outlined">priority_high</span>
                                    </button>
                                    
                                    {showPenaltyInfo && (
                                        <div className={styles.penaltyTooltip}>
                                            <h4 className={styles.tooltipTitle}>Penalty Info</h4>
                                            <p className={styles.tooltipDesc}>
                                                Complete both main missions before the deadline to preserve your streak.
                                                <strong> Bonus challenges are always optional.</strong>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button className={styles.headerBtn} title="Enable notifications" onClick={handleEnableNotifications}>
                                <span className="material-symbols-outlined">notifications</span>
                            </button>

                            <button className={styles.headerBtn} title="Settings" onClick={() => setSettingsOpen(true)}>
                                <span className="material-symbols-outlined">settings</span>
                            </button>

                            <div
                                className={styles.headerAvatarWrapper}
                                onClick={() => navigate('/profile')}
                                title="View Hunter Profile"
                            >
                                <img
                                    className={styles.headerAvatarImg}
                                    alt="Avatar"
                                    src={getAvatarUrl(avatar)}
                                />
                            </div>
                        </div>
                    </header>

                    {/* Content Body */}
                    <main className={styles.mainContent}>
                        <Outlet />
                    </main>
                </div>
            </div>

            {/* BOTTOMNAVBAR (Mobile Only) - auto hides on scroll down, very sleek */}
            <nav className={`${styles.bottomNavbar} ${isMobileMenuVisible ? '' : styles.bottomNavbarHidden}`}>
                <Link to="/daily-quest" className={`${styles.mobileTab} ${location.pathname === '/daily-quest' ? styles.activeTab : ''}`}>
                    <span className="material-symbols-outlined">home</span>
                </Link>
                <Link to="/exercises" className={`${styles.mobileTab} ${location.pathname === '/exercises' ? styles.activeTab : ''}`}>
                    <span className="material-symbols-outlined">fitness_center</span>
                </Link>
                <Link to="/history" className={`${styles.mobileTab} ${location.pathname === '/history' ? styles.activeTab : ''}`}>
                    <span className="material-symbols-outlined">history</span>
                </Link>
                <Link to="/leaderboard" className={`${styles.mobileTab} ${location.pathname === '/leaderboard' ? styles.activeTab : ''}`}>
                    <span className="material-symbols-outlined">leaderboard</span>
                </Link>
                <Link to="/hunter-search" className={`${styles.mobileTab} ${location.pathname === '/hunter-search' ? styles.activeTab : ''}`}>
                    <span className="material-symbols-outlined">person_search</span>
                </Link>
                <Link to="/profile" className={`${styles.mobileTab} ${location.pathname === '/profile' ? styles.activeTab : ''}`}>
                    <div className={`${styles.mobileAvatarWrapper} ${location.pathname === '/profile' ? styles.activeMobileAvatar : ''}`}>
                        <img
                            className={styles.mobileAvatarImg}
                            alt="Avatar"
                            src={getAvatarUrl(avatar)}
                        />
                    </div>
                </Link>
            </nav>
            <SettingsModal 
                isOpen={settingsOpen} 
                onClose={() => setSettingsOpen(false)} 
                profile={fullProfile} 
                onProfileUpdated={() => {
                    window.dispatchEvent(new Event('profileUpdated'));
                }} 
            />
        </div>
    );
}
