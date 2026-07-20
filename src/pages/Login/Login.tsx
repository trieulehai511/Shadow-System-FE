import { useState } from 'react';
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
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [alertConfig, setAlertConfig] = useState<{
        message: string;
        type: 'success' | 'error' | 'info' | 'warning';
        title?: string;
        onClose?: () => void;
    } | null>(null);

    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        if (isLoading) return;

        const trimmedUsername = username.trim();
        setUsername(trimmedUsername);

        if (!trimmedUsername) {
            setAlertConfig({
                title: "INVALID INFORMATION",
                message: "Username cannot be empty.",
                type: "warning"
            });
            return;
        }

        setIsLoading(true);
        try {
            const data: LoginApiResponse = await apiRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ userName: trimmedUsername, password: password })
            });

            if (data.code === 200 && data.result?.authenticated) {
                sessionStorage.setItem('token', data.result.token);
                // DailyQuest consumes this flag after the protected area has loaded.
                // Keeping it in session storage makes the system briefing appear once per login.
                sessionStorage.setItem('shadow_system_entry_pending', 'true');
                setAlertConfig({
                    title: "SYSTEM AUTHENTICATION",
                    message: "Connection complete. The System has awakened—do not disappoint it.",
                    type: "success",
                    onClose: () => {
                        navigate('/daily-quest');
                    }
                });
            } else {
                setAlertConfig({
                    title: "AUTHENTICATION FAILED",
                    message: "Identity mismatch. Please check your credentials.",
                    type: "error"
                });
            }
        } catch (error) {
            console.error("API connection error:", error);
            setAlertConfig({
                title: "SYSTEM ERROR",
                message: "Unable to connect to the system.",
                type: "error"
            });
        } finally {
            setIsLoading(false);
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
                                        disabled={isLoading}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password Input */}
                            <div className={styles.inputGroup}>
                                <div className={styles.labelRow}>
                                    <label htmlFor="password">PASSCODE</label>
                                    <button className={styles.recoverLink} type="button" disabled={isLoading}>Recover?</button>
                                </div>
                                <div className={styles.inputShell}>
                                    <span className={`material-symbols-outlined ${styles.inputIcon}`} aria-hidden="true">
                                        key
                                    </span>
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        disabled={isLoading}
                                        required
                                    />
                                    <button
                                        className={styles.passwordToggle}
                                        type="button"
                                        onClick={() => setShowPassword((isVisible) => !isVisible)}
                                        disabled={isLoading}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        aria-pressed={showPassword}
                                    >
                                        <span className="material-symbols-outlined" aria-hidden="true">
                                            {showPassword ? 'visibility_off' : 'visibility'}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className={styles.actionWrapper}>
                                <button className={styles.actionButton} type="submit" disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <span className="material-symbols-outlined animate-spin">sync</span>
                                            Connecting...
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined">login</span>
                                            Login
                                        </>
                                    )}
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
