import { getAvatarUrl } from '../../services/api';
import styles from '../../pages/Profile/Profile.module.css';

export type HunterProfileData = {
    userName: string;
    hunterCode: string;
    fullName: string;
    age: number;
    currentRp: number;
    rankTier: string;
    currentStreak: number;
    maxStreak: number;
    shieldCount: number;
    strength: number;
    agility: number;
    vitality: number;
    avatar?: string;
};

export type AttributeName = 'strength' | 'agility' | 'vitality';
type AttributeValues = Partial<Record<AttributeName, number>>;

export type AttributeReward = {
    attributeGains: AttributeValues;
    attributesAfter: AttributeValues;
    claimedAt: number;
};

type HunterProfileViewProps = {
    profile: HunterProfileData;
    attributeReward?: AttributeReward | null;
    onEdit?: () => void;
};

const getRankClass = (tier: string = '') => {
    switch (tier.trim().toUpperCase()[0]) {
        case 'S': return styles.rankS;
        case 'A': return styles.rankA;
        case 'B': return styles.rankB;
        case 'C': return styles.rankC;
        case 'D': return styles.rankD;
        case 'E':
        default: return styles.rankE;
    }
};

export function HunterProfileView({ profile, attributeReward, onEdit }: HunterProfileViewProps) {
    const attributes = [
        { name: 'strength' as const, label: 'STR', icon: 'fitness_center' },
        { name: 'agility' as const, label: 'AGI', icon: 'directions_run' },
        { name: 'vitality' as const, label: 'VIT', icon: 'favorite' },
    ];

    return (
        <>
            <div className={styles.profileTopContainer}>
                <div className={styles.avatarSection}>
                    <img
                        className={styles.profileAvatar}
                        src={getAvatarUrl(profile.avatar)}
                        alt={`${profile.userName} avatar`}
                    />
                </div>

                <div className={styles.profileInfoSection}>
                    <div className={styles.infoRowOne}>
                        <h2 className={styles.userName}>{profile.userName}</h2>
                        {onEdit && (
                            <button className={styles.editBtn} onClick={onEdit}>
                                Edit Profile
                            </button>
                        )}
                    </div>

                    <div className={styles.infoRowTwo}>
                        <div className={styles.statItem}>
                            <span className={styles.statValue}>{profile.currentRp}</span>
                            <span className={styles.statLabel}>RP</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statValue}>{profile.currentStreak}</span>
                            <span className={styles.statLabel}>Streak</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statValue}>{profile.maxStreak}</span>
                            <span className={styles.statLabel}>Best</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={`${styles.statValue} ${styles.rankValue} ${getRankClass(profile.rankTier)}`}>
                                {profile.rankTier?.replace('_', ' ') || 'E'}
                            </span>
                            <span className={styles.statLabel}>Rank</span>
                        </div>
                    </div>

                    <div className={styles.infoRowThree}>
                        <h3 className={styles.fullName}>{profile.fullName}</h3>
                        <p className={styles.bioText}>Awakened Hunter • Age: {profile.age}</p>
                        <p className={styles.hunterCodeText}>ID: {profile.hunterCode}</p>
                    </div>
                </div>
            </div>

            <div className={styles.profileDivider}></div>

            <div className={styles.attributesSection}>
                <h3 className={styles.sectionTitle}>Combat Attributes</h3>
                <div className={styles.attributesGrid}>
                    {attributes.map(({ name, label, icon }) => {
                        const gain = attributeReward?.attributeGains[name];
                        return (
                            <div key={name} className={`${styles.attrCard} ${attributeReward ? styles.strengthBuffed : ''}`}>
                                <div className={styles.attrIconWrapper}>
                                    <span className="material-symbols-outlined">{icon}</span>
                                </div>
                                <div className={styles.attrInfo}>
                                    <span className={styles.attrValue}>{profile[name]}</span>
                                    <span className={styles.attrName}>{label}</span>
                                </div>
                                {attributeReward && (
                                    <div className={styles.strengthBuffNotice} role="status">
                                        <span className="material-symbols-outlined">arrow_upward</span>
                                        <span>{typeof gain === 'number' && gain > 0 ? `+${gain} ${label}` : 'BUFF GHI NHẬN'}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    <div className={styles.attrCard}>
                        <div className={styles.attrIconWrapper}>
                            <span className="material-symbols-outlined">shield</span>
                        </div>
                        <div className={styles.attrInfo}>
                            <span className={styles.attrValue}>{profile.shieldCount}</span>
                            <span className={styles.attrName}>Shields</span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
