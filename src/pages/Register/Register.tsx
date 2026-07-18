import { useState, useEffect } from 'react';
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

    const handleRegister = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        if (isLoading) return;
        if (password !== confirmPassword) {
            setAlertConfig({
                title: "MẬT KHẨU KHÔNG KHỚP",
                message: "Mật khẩu xác nhận không trùng khớp. Vui lòng nhập lại.",
                type: "warning"
            });
            return;
        }

        setIsLoading(true);
        try {
            const data: RegisterResponse = await apiRequest('/hunter', {
                method: 'POST',
                body: JSON.stringify({
                    "userName": username,
                    "password": password,
                    "profile": {
                        "fullName": fullName,
                        "age": age
                    }
                })
            });

            if (data.code === 200 && data.result) {
                setAlertConfig({
                    title: "HỆ THỐNG XÁC THỰC",
                    message: "Hệ thống xác nhận bản thể thành công! Vui lòng đăng nhập để tiếp tục.",
                    type: "success",
                    onClose: () => {
                        navigate('/login');
                    }
                });
            } else {
                setAlertConfig({
                    title: "XÁC THỰC THẤT BẠI",
                    message: "Không thể tạo bản thể mới. Vui lòng kiểm tra lại thông tin.",
                    type: "error"
                });
            }
        } catch (error) {
            console.error("Lỗi kết nối API:", error);
            setAlertConfig({
                title: "LỖI HỆ THỐNG",
                message: "Không thể kết nối tới hệ thống",
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
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        disabled={isLoading}
                                        required
                                    />
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
                                        type="password"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(event) => setConfirmPassword(event.target.value)}
                                        disabled={isLoading}
                                        required
                                    />
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
