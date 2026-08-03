import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, getAvatarUrl } from '../../services/api';
import { SystemAlert } from '../../components/SystemAlert';
import {
    HunterProfileView,
    type AttributeName,
    type AttributeReward,
    type HunterProfileData,
} from '../../components/profile/HunterProfileView';
import styles from './Profile.module.css';

export default function Profile() {
    const [profile, setProfile] = useState<HunterProfileData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    
    const [alertConfig, setAlertConfig] = useState<{
        message: string;
        type: 'success' | 'error' | 'info' | 'warning';
        title?: string;
        onClose?: () => void;
    } | null>(null);
    const [attributeReward, setAttributeReward] = useState<AttributeReward | null>(null);
    
    const navigate = useNavigate();

    const fetchProfile = async (): Promise<void> => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
}
            const data = await apiRequest('/auth/me');
            const profileData = data.result ? data.result : data;

            if (profileData) {
                setProfile(profileData);

                const storedReward = sessionStorage.getItem('shadow_system_strength_reward');
                if (storedReward) {
                    try {
                        const reward = JSON.parse(storedReward) as AttributeReward;
                        const rewardMatchesProfile = (['strength', 'agility', 'vitality'] as AttributeName[]).every(
                            (attribute) => reward.attributesAfter[attribute] === undefined || profileData[attribute] === reward.attributesAfter[attribute]
                        );
                        if (rewardMatchesProfile) {
                            setAttributeReward(reward);
                            sessionStorage.removeItem('shadow_system_strength_reward');
                        }
                    } catch {
                        sessionStorage.removeItem('shadow_system_strength_reward');
                    }
                }
            }
        } catch (error: any) {
            console.error("Failed to synchronize profile data from the API:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
        
        window.addEventListener('profileUpdated', fetchProfile);
        return () => window.removeEventListener('profileUpdated', fetchProfile);
    }, [navigate]);

    if (loading) return <div className={styles.centerLoading}><h3>⚡ SYNCHRONIZING IDENTITY DATA...</h3></div>;
    if (!profile) return <div className={styles.centerLoading}><h3>❌ HUNTER DATA NOT FOUND.</h3></div>;

    return (
        <div className={styles.profileCanvas}>
            <HunterProfileView
                profile={profile}
                attributeReward={attributeReward}
            />

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
