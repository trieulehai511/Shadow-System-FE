import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Login.module.css';

type LoginApiResponse = {
    code: number;
    result?: {
        authenticated: boolean;
        token: string;
    };
};

export default function Login() {
    const [username, setUsername] = useState<string>('trieule');
    const [password, setPassword] = useState<string>('123456');

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
            const response = await fetch('https://shadow-system-1086471329115.asia-southeast1.run.app/shadow-system/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userName: username, password: password })
            });
            const data: LoginApiResponse = await response.json();

            if (data.code === 200 && data.result?.authenticated) {
                localStorage.setItem('token', data.result.token);
                alert("Hệ thống xác nhận bản thể!");
                navigate('/daily-quest');
            } else {
                alert("Xác thực thất bại! Bản thể không khớp.");
            }
        } catch (error) {
            console.error("Lỗi kết nối API:", error);
            alert("Không thể kết nối đến Thần Ma Hệ Thống (Backend).");
        }
    };

    return (
        <div className={styles.screenContainer}>
            {/* Ambient Gate Background */}
            <div className={styles.gateBgWrapper} aria-hidden="true">
                <div className={styles.gateBg}></div>
                <div className={styles.gateRays}></div>
            </div>

            <main className={styles.loginWrapper}>
                {/* Header Section */}
                <div className={styles.brandBlock}>
                    <span className={`material-symbols-outlined ${styles.brandIcon}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                        sports_mma
                    </span>
                    <h1 className={styles.title}>Awaken Your Potential</h1>
                    <p className={styles.subtitle}>Initiate System Link</p>
                </div>

                {/* Login Card */}
                <div className={`${styles.loginBox} group`}>
                    {/* Subtle accent border */}
                    <div className={styles.accentBorder}></div>

                    <form className={styles.form} onSubmit={handleLogin}>
                        {/* Email Input */}
                        <div className={styles.inputGroup}>
                            <label htmlFor="email">Hunter ID / Email</label>
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
                                <label htmlFor="password">Passcode</label>
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

                            <div className={styles.divider}>
                                <span>OR</span>
                            </div>

                            <button className={styles.registerButton} type="button">
                                <span className="material-symbols-outlined">person_add</span>
                                Sign Up as Hunter
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}

