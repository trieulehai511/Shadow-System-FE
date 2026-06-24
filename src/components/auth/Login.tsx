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
                <h2 className={styles.title}>LOGIN</h2>

                <div className={styles.inputGroup}>
                    <label style={{ marginBottom: '20px' }}>USERNAME</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label style={{ marginBottom: '20px' }}>PASSWORD</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />
                </div>

                <button className={styles.actionButton} onClick={handleLogin}>
                    SUBMIT
                </button>
            </div>
        </div>
    );
}
