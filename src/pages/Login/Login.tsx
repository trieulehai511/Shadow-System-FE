import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../../services/api';
import { SystemAlert } from '../../components/SystemAlert';
import styles from './Login.module.css';
import loginBg from '../../assets/main_screen.png';

type LoginApiResponse = {
    code: number;
    result?: {
        authenticated: boolean;
        token: string;
    };
};

export default function Login() {
    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [alertConfig, setAlertConfig] = useState<{
        message: string;
        type: 'success' | 'error' | 'info' | 'warning';
        title?: string;
        onClose?: () => void;
    } | null>(null);

    const navigate = useNavigate();

    // Dynamically inject Material Symbols stylesheet to render the correct icons
    useEffect(() => {
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        return () => {
            document.head.removeChild(link);
        };
    }, []);

    const handleLogin = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        try {
            const data: LoginApiResponse = await apiRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ userName: username, password: password })
            });

            if (data.code === 200 && data.result?.authenticated) {
                sessionStorage.setItem('token', data.result.token);
                // DailyQuest consumes this flag after the protected area has loaded.
                // Keeping it in session storage makes the system briefing appear once per login.
                sessionStorage.setItem('shadow_system_entry_pending', 'true');
                setAlertConfig({
                    title: "HỆ THỐNG XÁC THỰC",
                    message: "Liên kết hoàn tất. Hệ Thống đã mở mắt—đừng khiến nó thất vọng.",
                    type: "success",
                    onClose: () => {
                        navigate('/daily-quest');
                    }
                });
            } else {
                setAlertConfig({
                    title: "XÁC THỰC THẤT BẠI",
                    message: "Bản thể không khớp! Vui lòng kiểm tra lại thông tin.",
                    type: "error"
                });
            }
        } catch (error) {
            console.error("Lỗi kết nối API:", error);
            setAlertConfig({
                title: "LỖI HỆ THỐNG",
                message: "Không thể kết nối đến Thần Ma Hệ Thống (Backend).",
                type: "error"
            });
        }
    };


    return (
        <div className={styles.screenContainer}>
            {/* Fullscreen Artwork Background */}
            <div className={styles.artworkBackground}>
                <div className={styles.artworkOverlay}></div>
                <img src={loginBg} alt="Shadow Gate Artwork" className={styles.artworkImage} />
            </div>

            {/* Left Panel: Login content */}
            <div className={styles.loginLeftPanel}>
                <main className={styles.loginWrapper}>
                    {/* Header Section */}
                    <div className={styles.brandBlock}>
                        <span className={`material-symbols-outlined ${styles.brandIcon}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                            sports_mma
                        </span>
                        <h1 className={styles.title}>LOGIN</h1>
                        {/* <p className={styles.subtitle}>Initiate System Link</p> */}
                    </div>

                    {/* Login Card */}
                    <div className={`${styles.loginBox} group`}>
                        {/* Subtle accent border */}
                        <div className={styles.accentBorder}></div>

                        <form className={styles.form} onSubmit={handleLogin}>
                            {/* Email Input */}
                            <div className={styles.inputGroup}>
                                <label htmlFor="email">USERNAME</label>
                                <div className={styles.inputShell}>
                                    <span className={`material-symbols-outlined ${styles.inputIcon}`} aria-hidden="true">
                                        badge
                                    </span>
                                    <input
                                        id="email"
                                        type="text"
                                        placeholder="Enter your registered ID"
                                        value={username}
                                        onChange={(event) => setUsername(event.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Password Input */}
                            <div className={styles.inputGroup}>
                                <div className={styles.labelRow}>
                                    <label htmlFor="password">PASSCODE</label>
                                    <button className={styles.recoverLink} type="button">Recover?</button>
                                </div>
                                <div className={styles.inputShell}>
                                    <span className={`material-symbols-outlined ${styles.inputIcon}`} aria-hidden="true">
                                        key
                                    </span>
                                    <input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className={styles.actionWrapper}>
                                <button className={styles.actionButton} type="submit">
                                    <span className="material-symbols-outlined">login</span>
                                    Login
                                </button>

                                <div className={styles.footerLink}>
                                    New Hunter? <Link to="/register">Sign Up</Link>
                                </div>
                            </div>
                        </form>
                    </div>
                </main>
            </div>

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
