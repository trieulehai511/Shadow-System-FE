import React, { useEffect } from 'react';
import styles from './SystemAlert.module.css';

export interface SystemAlertProps {
    title?: string;
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning';
    confirmText?: string;
    onClose: () => void;
}

export const SystemAlert: React.FC<SystemAlertProps> = ({
    title = 'SYSTEM ALERT',
    message,
    type = 'info',
    confirmText = 'CONFIRM',
    onClose
}) => {
    // Dismiss on ESC key press
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const getIcon = () => {
        switch (type) {
            case 'success':
                return 'check_circle';
            case 'error':
                return 'cancel';
            case 'warning':
                return 'warning';
            case 'info':
            default:
                return 'info';
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div 
                className={`${styles.container} ${styles[type]}`} 
                onClick={(e) => e.stopPropagation()}
            >
                <div className={styles.content}>
                    <div className={styles.header}>
                        <span className={`material-symbols-outlined ${styles.icon}`}>
                            {getIcon()}
                        </span>
                        <h3 className={styles.title}>{title}</h3>
                    </div>

                    <div className={styles.body}>
                        <p className={styles.message}>{message}</p>
                    </div>

                    <div className={styles.footer}>
                        <button className={styles.confirmBtn} onClick={onClose}>
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
