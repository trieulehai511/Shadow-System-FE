import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './Register.module.css';
import loginBg from '../../assets/main_screen.png';
import { apiRequest } from '../../services/api';
import { SystemAlert } from '../../components/SystemAlert';


type RegisterResponse = {
    code: number;
    result?: {
        "userName": string;
        "hunterCode": string;
        "fullName": string;
        "age": number;
        "avatar": string;
        "currentRp": number;
        "currentStreak": number;
        "maxStreak": number;
        "shieldCount":  number;
        "strength": number,
        "agility": number,
        "vitality": number
    };
};

export default function Register() {
    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
    const [fullName, setFullName] = useState<string>('');
    const [age, setAge] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [alertConfig, setAlertConfig] = useState<{
        message: string;
        type: 'success' | 'error' | 'info' | 'warning';
        title?: string;
        onClose?: () => void;
    } | null>(null);

    const navigate = useNavigate();

    const handleRegister = async (e: React.FormEvent): Promise<void> => {
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

        if (password !== confirmPassword) {
            setAlertConfig({
                title: "PASSWORDS DO NOT MATCH",
                message: "The password confirmation does not match. Please try again.",
                type: "warning"
            });
            return;
        }

        setIsLoading(true);
        try {
            const data: RegisterResponse = await apiRequest('/hunter', {
                method: 'POST',
                body: JSON.stringify({
                    "userName": trimmedUsername,
                    "password": password,
                    "profile": {
                        "fullName": fullName,
                        "age": age
                    }
                })
            });

            if (data.code === 200 && data.result) {
                setAlertConfig({
                    title: "SYSTEM AUTHENTICATION",
                    message: "Your identity has been registered successfully. Please log in to continue.",
                    type: "success",
                    onClose: () => {
                        navigate('/login');
                    }
                });
            } else {
                setAlertConfig({
                    title: "AUTHENTICATION FAILED",
                    message: "Unable to create a new identity. Please check your information.",
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

            {/* Left Panel: Register content */}
            <div className={styles.loginLeftPanel}>
                <main className={styles.loginWrapper}>
                    {/* Header Section */}
                    <div className={styles.brandBlock}>
                        <span className={`material-symbols-outlined ${styles.brandIcon}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                            sports_mma
                        </span>
                        <h1 className={styles.title}>REGISTER</h1>
                        {/* <p className={styles.subtitle}>Initiate Registration Link</p> */}
                    </div>

                    {/* Register Card */}
                    <div className={`${styles.loginBox} group`}>
                        {/* Subtle accent border */}
                        <div className={styles.accentBorder}></div>

                        <form className={styles.form} onSubmit={handleRegister}>
                            {/* Username Input */}
                            <div className={styles.inputGroup}>
                                <label htmlFor="username">Hunter Username</label>
                                <div className={styles.inputShell}>
                                    <span className={`material-symbols-outlined ${styles.inputIcon}`} aria-hidden="true">
                                        badge
                                    </span>
                                    <input
                                        id="username"
                                        type="text"
                                        placeholder="Choose a username"
                                        value={username}
                                        onChange={(event) => setUsername(event.target.value)}
                                        disabled={isLoading}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password Input */}
                            <div className={styles.inputGroup}>
                                <label htmlFor="password">Passcode</label>
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

                            {/* Confirm Password Input */}
                            <div className={styles.inputGroup}>
                                <label htmlFor="confirmPassword">Confirm Passcode</label>
                                <div className={styles.inputShell}>
                                    <span className={`material-symbols-outlined ${styles.inputIcon}`} aria-hidden="true">
                                        key
                                    </span>
                                    <input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(event) => setConfirmPassword(event.target.value)}
                                        disabled={isLoading}
                                        required
                                    />
                                    <button
                                        className={styles.passwordToggle}
                                        type="button"
                                        onClick={() => setShowConfirmPassword((isVisible) => !isVisible)}
                                        disabled={isLoading}
                                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                                        aria-pressed={showConfirmPassword}
                                    >
                                        <span className="material-symbols-outlined" aria-hidden="true">
                                            {showConfirmPassword ? 'visibility_off' : 'visibility'}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Fullname Input */}
                            <div className={styles.inputGroup}>
                                <label htmlFor="fullname">Full Name</label>
                                <div className={styles.inputShell}>
                                    <span className={`material-symbols-outlined ${styles.inputIcon}`} aria-hidden="true">
                                        person
                                    </span>
                                    <input
                                        id="fullname"
                                        type="text"
                                        placeholder="Enter your full name"
                                        value={fullName}
                                        onChange={(event) => setFullName(event.target.value)}
                                        disabled={isLoading}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Age Input */}
                            <div className={styles.inputGroup}>
                                <label htmlFor="age">Age</label>
                                <div className={styles.inputShell}>
                                    <span className={`material-symbols-outlined ${styles.inputIcon}`} aria-hidden="true">
                                        calendar_today
                                    </span>
                                    <input
                                        id="age"
                                        type="number"
                                        placeholder="Enter your age"
                                        value={age || ''}
                                        onChange={(event) => setAge(Number(event.target.value))}
                                        disabled={isLoading}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className={styles.actionWrapper}>
                                <button className={styles.actionButton} type="submit" disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <span className="material-symbols-outlined animate-spin">sync</span>
                                            Awakening...
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined">person_add</span>
                                            Awaken
                                        </>
                                    )}
                                </button>

                                <div className={styles.footerLink}>
                                    Already a Hunter? <Link to="/login">Sign In</Link>
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
