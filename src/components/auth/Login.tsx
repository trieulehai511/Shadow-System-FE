import { useState } from 'react';
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

    const handleLogin = async (): Promise<void> => {
        try {
            const response = await fetch('http://localhost:8888/shadow-system/auth/login', {
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
            <div className={styles.loginBox}>
                <div className={styles.brandBlock}>
                    <h1 className={styles.title}>AURELIAN</h1>
                    <p className={styles.subtitle}>LOGIN TO THE SYSTEM</p>
                </div>

                <div className={styles.inputGroup}>
                    <label>HUNTER ID</label>
                    <div className={styles.inputShell}>
                        <span className={styles.inputIcon}>◎</span>
                        <input
                            type="text"
                            value={username}
                            onChange={(event) => setUsername(event.target.value)}
                            aria-label="Hunter ID"
                        />
                    </div>
                </div>

                <div className={styles.inputGroup}>
                    <label>PASSWORD</label>
                    <div className={styles.inputShell}>
                        <span className={styles.inputIcon}>▣</span>
                        <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            aria-label="Password"
                        />
                    </div>
                </div>

                <button className={styles.actionButton} onClick={handleLogin}>
                    AWAKEN <span aria-hidden="true">›</span>
                </button>

                <button className={styles.forgotButton} type="button">
                    FORGOT ACCESS CODE?
                </button>

                <div className={styles.divider}>
                    <span />
                    <small>OR</small>
                    <span />
                </div>

                <button className={styles.registerButton} type="button">
                    New hunter registration <span aria-hidden="true">↯</span>
                </button>

                <span className={styles.cornerMark} aria-hidden="true">△</span>
            </div>

            <div className={styles.statusLine}>
                <span>ENCRYPTED CONNECTION</span>
                <i />
                <span>SECURE MONOLITH ACCESS</span>
            </div>
        </div>
    );
}
