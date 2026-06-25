import { Link, Outlet, useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import styles from './MainLayout.module.css';

type TokenPayload = {
    sub: string;
    userName: string; 
};

export default function MainLayout() {


    const navigate = useNavigate();

    let hunterName = "Unknown Hunter";

    const token = localStorage.getItem('token');

    if (token) {
        try {
            const decoded = jwtDecode<TokenPayload>(token);
            if (decoded.userName) {
                hunterName = decoded.userName.toUpperCase();
            }
        } catch (e) {
            console.error("Lỗi giải mã token tại Layout:", e);
        }
    }
    const handleLogout = () =>{
        localStorage.removeItem('token');
        navigate('/login');
    }

    return (
        <div className={styles.layoutContainer}>
            {/* Top Header thanh điều hướng trên cùng */}
            <header className={styles.header}>
                <div className={styles.logoArea}>AURELIAN SYSTEM</div>
                <div className={styles.userInfo}>
                    <span>HUNTER: {hunterName}</span>
                    <button className={styles.logoutBtn} onClick={handleLogout}>EXIT</button>
                </div>
            </header>

            <div className={styles.bodyContainer}>
                {/* Sidebar bên trái */}
                <aside className={styles.sidebar}>
                    <Link to="/daily-quest" className={styles.menuItem}>Daily Quest</Link>
                    {/* <Link to="/inventory" className={styles.menuItem}>Inventory</Link> */}
                </aside>

                {/* Vùng nội dung động bên phải */}
                <main className={styles.mainContent}>
                    <Outlet />
                </main>
            </div>
        </div>
    );

}
