import { useState } from 'react';
import { apiRequest } from '../../services/api';
import {
    HunterProfileView,
    type HunterProfileData,
} from '../../components/profile/HunterProfileView';
import profileStyles from '../Profile/Profile.module.css';
import styles from './HunterSearch.module.css';

type HunterProfileResponse = {
    result?: HunterProfileData;
} & Partial<HunterProfileData>;

export default function HunterSearch() {
    const [hunterCode, setHunterCode] = useState('');
    const [profile, setProfile] = useState<HunterProfileData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (loading) return;

        const trimmedHunterCode = hunterCode.trim();
        setHunterCode(trimmedHunterCode);
        setProfile(null);
        setError('');

        if (!trimmedHunterCode) {
            setError('Please enter a Hunter Code to search for a profile.');
            return;
        }

        setLoading(true);
        try {
            const data = await apiRequest<HunterProfileResponse>(
                `/hunter/hunter-code?hunterCode=${encodeURIComponent(trimmedHunterCode)}`
            );

            const profileData = data.result ? data.result : data;

            if (!profileData || (data.result === undefined && !data.hunterCode)) {
                setError('No profile was found for this Hunter.');
                return;
            }

            setProfile(profileData as HunterProfileData);
        } catch (searchError) {
            console.error('Failed to search for a profile by Hunter Code:', searchError);
            setError(
                searchError instanceof Error
                    ? searchError.message
                    : 'Unable to search for a profile. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        setHunterCode('');
        setProfile(null);
        setError('');
    };

    return (
        <div className={styles.searchPage}>
            <section className={styles.searchSection}>
                <div className={styles.headingBlock}>
                    <div className={styles.headingIcon}>
                        <span className="material-symbols-outlined">person_search</span>
                    </div>
                    <div>
                        <h1 className={styles.title}>Hunter Search</h1>
                        <p className={styles.description}>Retrieve Hunter information.</p>
                    </div>
                </div>

                <form className={styles.searchForm} onSubmit={handleSearch}>
                    <div className={styles.inputWrapper}>
                        <span className={`material-symbols-outlined ${styles.inputIcon}`} aria-hidden="true">badge</span>
                        <input
                            className={styles.input}
                            type="text"
                            value={hunterCode}
                            onChange={(event) => setHunterCode(event.target.value)}
                            placeholder="Hunter Code"
                            aria-label="Hunter Code"
                            disabled={loading}
                            required
                        />
                        {hunterCode && !loading && (
                            <button 
                                type="button" 
                                className={styles.clearBtn} 
                                onClick={handleClear}
                                title="Clear"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        )}
                    </div>
                    <button className={styles.searchButton} type="submit" disabled={loading}>
                        <span className={`material-symbols-outlined ${loading ? styles.spinning : ''}`}>
                            {loading ? 'sync' : 'search'}
                        </span>
                        {loading ? 'Searching...' : 'Search'}
                    </button>
                </form>

                {/* Loading Indicator */}
                {loading && (
                    <div className={styles.loadingState}>
                        <span className={`material-symbols-outlined ${styles.spinning}`}>sync</span>
                        <span>Retrieving data...</span>
                    </div>
                )}

                {/* Error Banner */}
                {error && (
                    <div className={styles.errorState} role="alert">
                        <span className="material-symbols-outlined">error</span>
                        <span>{error}</span>
                    </div>
                )}

                {/* Minimal Empty/Welcome State */}
                {!profile && !loading && !error && (
                    <div className={styles.welcomeState}>
                        <span className="material-symbols-outlined">fingerprint</span>
                        <p>Awaiting a Hunter Code.</p>
                    </div>
                )}
            </section>

            {/* Results Reveal Container */}
            {profile && (
                <div className={styles.resultContainer}>
                    <div className={profileStyles.profileCanvas}>
                        <HunterProfileView profile={profile} />
                    </div>
                </div>
            )}
        </div>
    );
}

