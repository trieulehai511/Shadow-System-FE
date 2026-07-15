import { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { apiRequest, getAvatarUrl } from '../../services/api';
import styles from './MainLayout.module.css';

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

    // Dynamically inject Material Symbols stylesheet
    useEffect(() => {
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        return () => {
            document.head.removeChild(link);
        };
    }, []);

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
                        setHunterName(profileData.fullName || "Sung Jin-Woo");
                        setAvatar(profileData.avatar || "");
                        setRankTier(profileData.rankTier || "E RANK");
                    }
                } catch (e) {
                    console.error("Lỗi lấy profile từ /auth/me tại Layout:", e);
                }
            }
        };
        fetchProfileData();

        // Listen for profile update event to refresh layout dynamically
        window.addEventListener('profileUpdated', fetchProfileData);
        return () => window.removeEventListener('profileUpdated', fetchProfileData);
    }, []);

    const handleLogout = async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                await apiRequest('/auth/logout', {
                    method: 'POST',
                    body: JSON.stringify({ token }),
                });
            } catch (e) {
                console.error("Lỗi gọi API logout:", e);
            }
        }
        localStorage.removeItem('token');
        navigate('/login');
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
                            onClick={() => navigate('/profile')}
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
                            SHADOW SYSTEM
                        </div>

                        {/* Top Right: Notifications + Logout + Avatar */}
                        <div className={styles.headerIcons}>
                            <button className={styles.headerBtn} title="Notifications">
                                <span className="material-symbols-outlined">notifications</span>
                            </button>

                            <div
                                className={styles.headerAvatarWrapper}
                                onClick={() => navigate('/profile')}
                                title="View Profile"
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
        </div>
    );
}
