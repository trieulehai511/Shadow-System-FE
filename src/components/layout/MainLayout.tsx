import { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import styles from './MainLayout.module.css';

type TokenPayload = {
    sub: string;
    userName: string; 
};

export default function MainLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuVisible, setIsMobileMenuVisible] = useState<boolean>(true);
    let hunterName = "Sung Jin-Woo";

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

    const token = localStorage.getItem('token');
    if (token) {
        try {
            const decoded = jwtDecode<TokenPayload>(token);
            if (decoded.userName) {
                hunterName = decoded.userName.split(' ')
                    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' ');
            }
        } catch (e) {
            console.error("Lỗi giải mã token tại Layout:", e);
        }
    }

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <div className={styles.layoutContainer}>
            {/* Ambient Overlays */}
            <div className={styles.systemGrid} aria-hidden="true"></div>
            <div className={styles.scanlines} aria-hidden="true"></div>

            <div className={styles.flexWrapper}>
                {/* SIDENAVBAR (Desktop Only) */}
                <nav className={styles.sidenavbar}>
                    {/* Header */}
                    <div className={styles.navHeader}>
                        <div className={styles.avatarWrapper}>
                            <img 
                                className={styles.avatarImg} 
                                alt="Hunter Avatar" 
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDEKLlUzRvvpISR-0lZQmXWsGgz22UXc-gHzCFcQtKfGVHo7IGdf3rvsPV3VG5nrVWtkOfLglpFzBu1Nf-ZsYOutA_vy8m2hVcZ33uhYgVLcXWyD0He0f3hKqVX1pT7DwiEOzTaEFWPx01LHY5M_Nzo6qvarZbEz5KOpggoekfDdEhJ9Zpx5MlGXwZOjA8gHpjdhbNSnJ-82ZtsJa7e7hIST_UKMXTfrMHEH_0FdgiCaLKPUFpvDsYNkbmZ8l43HezLZwDRYlV_PJw"
                            />
                        </div>
                        <h2 className={styles.navHunterName}>{hunterName}</h2>
                        <span className={styles.navHunterRank}>E-Rank Hunter</span>
                    </div>

                    {/* Nav Links */}
                    <ul className={styles.navLinks}>
                        <li>
                            <Link 
                                to="/daily-quest" 
                                className={`${styles.navItem} ${location.pathname === '/daily-quest' ? styles.activeNavItem : ''}`}
                            >
                                <span className={`material-symbols-outlined ${location.pathname === '/daily-quest' ? styles.fillIcon : ''}`}>
                                    dashboard
                                </span>
                                <span>Dashboard</span>
                            </Link>
                        </li>
                        <li>
                            <a href="#" className={styles.navItem}>
                                <span className="material-symbols-outlined">assignment</span>
                                <span>Quests</span>
                            </a>
                        </li>
                        <li>
                            <Link 
                                to="/profile" 
                                className={`${styles.navItem} ${location.pathname === '/profile' ? styles.activeNavItem : ''}`}
                            >
                                <span className={`material-symbols-outlined ${location.pathname === '/profile' ? styles.fillIcon : ''}`}>
                                    person
                                </span>
                                <span>Profile</span>
                            </Link>
                        </li>
                        <li>
                            <a href="#" className={styles.navItem}>
                                <span className="material-symbols-outlined">military_tech</span>
                                <span>Ranking</span>
                            </a>
                        </li>
                        <li>
                            <Link 
                                to="/history" 
                                className={`${styles.navItem} ${location.pathname === '/history' ? styles.activeNavItem : ''}`}
                            >
                                <span className={`material-symbols-outlined ${location.pathname === '/history' ? styles.fillIcon : ''}`}>
                                    history
                                </span>
                                <span>History</span>
                            </Link>
                        </li>
                    </ul>

                    {/* CTA & Footer */}
                    <div className={styles.navFooter}>
                        <button className={styles.levelUpBtn}>
                            Level Up
                        </button>
                        <div className={styles.navFooterLinks}>
                            <a href="#" title="Settings" onClick={(e) => { e.preventDefault(); handleLogout(); }}>
                                <span className="material-symbols-outlined">logout</span>
                            </a>
                            <a href="#" title="Support" onClick={(e) => e.preventDefault()}>
                                <span className="material-symbols-outlined">help</span>
                            </a>
                        </div>
                    </div>
                </nav>

                {/* MAIN CONTENT AREA */}
                <div className={styles.mainWrapper}>
                    {/* TOPAPPBAR */}
                    <header className={styles.topHeader}>
                        <div className={styles.headerTitle}>
                            System Interface
                        </div>
                        <div className={styles.headerIcons}>
                            <button className={styles.headerBtn} title="Notifications">
                                <span className="material-symbols-outlined">notifications</span>
                            </button>
                            <button className={styles.headerBtn} title="Exit System" onClick={handleLogout}>
                                <span className="material-symbols-outlined">logout</span>
                            </button>
                        </div>
                    </header>

                    {/* Content Body */}
                    <main className={styles.mainContent}>
                        <Outlet />
                    </main>
                </div>
            </div>

            {/* BOTTOMNAVBAR (Mobile Only) - with auto hide/show state */}
            <nav className={`${styles.bottomNavbar} ${isMobileMenuVisible ? '' : styles.bottomNavbarHidden}`}>
                <Link to="/daily-quest" className={`${styles.mobileTab} ${location.pathname === '/daily-quest' ? styles.activeTab : ''}`}>
                    <span className="material-symbols-outlined">home</span>
                    <span>Home</span>
                </Link>
                <a href="#" className={styles.mobileTab} onClick={(e) => e.preventDefault()}>
                    <span className="material-symbols-outlined">fitness_center</span>
                    <span>Quests</span>
                </a>
                <Link to="/profile" className={`${styles.mobileTab} ${location.pathname === '/profile' ? styles.activeTab : ''}`}>
                    <span className="material-symbols-outlined">bar_chart</span>
                    <span>Stats</span>
                </Link>
                <a href="#" className={styles.mobileTab} onClick={(e) => e.preventDefault()}>
                    <span className="material-symbols-outlined">workspace_premium</span>
                    <span>Rank</span>
                </a>
                <Link to="/history" className={`${styles.mobileTab} ${location.pathname === '/history' ? styles.activeTab : ''}`}>
                    <span className="material-symbols-outlined">list_alt</span>
                    <span>Logs</span>
                </Link>
                <a href="#" className={styles.mobileTab} onClick={handleLogout}>
                    <span className="material-symbols-outlined">logout</span>
                    <span>Exit</span>
                </a>
            </nav>
        </div>
    );
}
