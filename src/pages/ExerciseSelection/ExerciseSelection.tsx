import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../services/api';
import { SystemAlert } from '../../components/SystemAlert';
import type { ExerciseResponse } from '../../models/QuestModel';
import styles from './ExerciseSelection.module.css';

interface AlertConfig {
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
}

const CATEGORIES = [
    { key: 'CHEST', label: 'Upper Body / Push (CHEST)' },
    { key: 'CALISTHENICS', label: 'Bodyweight (CALISTHENICS)' },
    { key: 'LEGS', label: 'Lower Body / Legs (LEGS)' },
    { key: 'LOWER', label: 'Lower Accessory Muscles (LOWER)' },
    { key: 'CARDIO', label: 'Cardio / Endurance (CARDIO)' }
];

export default function ExerciseSelection() {
    const [allExercises, setAllExercises] = useState<ExerciseResponse[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectionMode, setSelectionMode] = useState<'all' | 'custom'>('all');
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [alertConfig, setAlertConfig] = useState<AlertConfig | null>(null);
    const [previewExercise, setPreviewExercise] = useState<ExerciseResponse | null>(null);
    const navigate = useNavigate();

    // Form states for creating exercise
    const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
    const [newName, setNewName] = useState<string>('');
    const [newCategory, setNewCategory] = useState<string>('CHEST');
    const [newTargetStat, setNewTargetStat] = useState<string>('STR');
    const [newBaseSets, setNewBaseSets] = useState<number>(3);
    const [newBaseReps, setNewBaseReps] = useState<number>(10);
    const [newDescription, setNewDescription] = useState<string>('');
    const [newTutorialVideoUrl, setNewTutorialVideoUrl] = useState<string>('');
    const [newSafetyTips, setNewSafetyTips] = useState<string>('');
    const [newImageFile, setNewImageFile] = useState<File | null>(null);
    const [newImagePreview, setNewImagePreview] = useState<string>('');
    const [creating, setCreating] = useState<boolean>(false);

    const resetForm = () => {
        setNewName('');
        setNewCategory('CHEST');
        setNewTargetStat('STR');
        setNewBaseSets(3);
        setNewBaseReps(10);
        setNewDescription('');
        setNewTutorialVideoUrl('');
        setNewSafetyTips('');
        setNewImageFile(null);
        setNewImagePreview('');
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setNewImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCreateExercise = async (e: React.FormEvent) => {
        e.preventDefault();
        if (creating) return;
        if (!newName.trim()) {
            setAlertConfig({
                title: "MISSING INFORMATION",
                message: "Exercise name cannot be empty.",
                type: "warning"
            });
            return;
        }

        setCreating(true);
        try {
            const formData = new FormData();
            formData.append('name', newName.trim());
            formData.append('category', newCategory);
            formData.append('targetStat', newTargetStat);
            formData.append('baseSets', newBaseSets.toString());
            formData.append('baseReps', newBaseReps.toString());
            if (newDescription.trim()) formData.append('description', newDescription.trim());
            if (newTutorialVideoUrl.trim()) formData.append('tutorialVideoUrl', newTutorialVideoUrl.trim());
            if (newSafetyTips.trim()) formData.append('safetyTips', newSafetyTips.trim());
            if (newImageFile) {
                formData.append('image', newImageFile);
            }

            const data = await apiRequest('/exercise', {
                method: 'POST',
                body: formData,
                useMultipart: true
            });

            const createdEx: ExerciseResponse = data.result || data;

            // Update exercises list
            setAllExercises(prev => [...prev, createdEx]);
            // Auto check/select newly created exercise
            setSelectedIds(prev => {
                const next = new Set(prev);
                next.add(createdEx.id);
                return next;
            });

            // Auto switch user to custom mode since they created a custom exercise
            setSelectionMode('custom');

            setAlertConfig({
                title: "CREATED SUCCESSFULLY",
                message: `Exercise "${createdEx.name}" was created and automatically added to your selected exercises.`,
                type: "success"
            });

            resetForm();
            setShowCreateModal(false);
        } catch (err: any) {
            console.error("Failed to create a new exercise:", err);
            setAlertConfig({
                title: "SYSTEM ERROR",
                message: err.message || "Unable to create a new exercise.",
                type: "error"
            });
        } finally {
            setCreating(false);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    navigate('/login');
                    return;
                }

                // Fetch all available exercises
                const allRes = await apiRequest('/exercise');
                const exercisesList: ExerciseResponse[] = allRes.result || allRes || [];
                setAllExercises(exercisesList);

                // Fetch currently selected exercises
                const selectedRes = await apiRequest('/exercise/selected');
                const selectedList: ExerciseResponse[] = selectedRes.result || selectedRes || [];
                if (selectedList.length > 0) {
                    setSelectionMode('custom');
                    const selectedSet = new Set(selectedList.map(e => e.id));
                    setSelectedIds(selectedSet);
                } else {
                    setSelectionMode('all');
                }
            } catch (err: any) {
                console.error("Failed to load the exercise list:", err);
                setAlertConfig({
                    title: "SYSTEM ERROR",
                    message: err.message || "Unable to synchronize the exercise list with the System.",
                    type: "error"
                });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [navigate]);

    const handleToggleExercise = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Calculate count by category
    const getCategoryCounts = () => {
        const counts: Record<string, number> = {};
        CATEGORIES.forEach(cat => {
            counts[cat.key] = 0;
        });

        allExercises.forEach(ex => {
            if (selectedIds.has(ex.id)) {
                counts[ex.category] = (counts[ex.category] || 0) + 1;
            }
        });
        return counts;
    };

    const categoryCounts = getCategoryCounts();

    const handleSave = async () => {
        if (saving) return;
        if (selectionMode === 'custom') {
            // Validate before calling API
            const invalidCats = CATEGORIES.filter(cat => (categoryCounts[cat.key] || 0) < 6);
            if (invalidCats.length > 0) {
                setAlertConfig({
                    title: "SYSTEM REJECTED",
                    message: `Select at least 6 exercises for each muscle group. These groups need more exercises: ${invalidCats.map(c => c.key).join(', ')}`,
                    type: "warning"
                });
                return;
            }
        }

        setSaving(true);
        try {
            const bodyIds = selectionMode === 'all' ? [] : Array.from(selectedIds);
            await apiRequest('/exercise/select', {
                method: 'POST',
                body: JSON.stringify(bodyIds)
            });

            setAlertConfig({
                title: "UPDATE SUCCESSFUL",
                message: selectionMode === 'all'
                    ? "The System is now using all available exercises."
                    : "The System saved your selected exercise list.",
                type: "success"
            });
        } catch (err: any) {
            console.error("Failed to save exercise selections:", err);
            setAlertConfig({
                title: "SAVE FAILED",
                message: err.message || "Unable to save exercise selections to the System.",
                type: "error"
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className={styles.centerLoading}><h3>⚡ RETRIEVING EXERCISE DATABASE...</h3></div>;
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerTitleRow}>
                    <div className={styles.titleRow}>
                        <span className="material-symbols-outlined">fitness_center</span>
                        <h1 className={styles.title}>Exercise Selection</h1>
                    </div>
                    <button 
                        className={styles.createBtn}
                        onClick={() => setShowCreateModal(true)}
                    >
                        <span className="material-symbols-outlined">add_box</span>
                        Create New Exercise
                    </button>
                </div>
                <p className={styles.subtitle}>Configure the exercise list used by the System to generate Daily Quests.</p>
            </div>

            {/* Mode Selection Panel */}
            <section className={styles.modeSelectionPanel}>
                <div className={styles.modeTitle}>EXERCISE SELECTION MODE:</div>
                <div className={styles.modeButtonGroup}>
                    <button 
                        className={`${styles.modeBtn} ${selectionMode === 'all' ? styles.modeBtnActive : ''}`}
                        onClick={() => setSelectionMode('all')}
                    >
                        <span className="material-symbols-outlined">select_all</span>
                        ALL SYSTEM EXERCISES
                    </button>
                    <button 
                        className={`${styles.modeBtn} ${selectionMode === 'custom' ? styles.modeBtnActive : ''}`}
                        onClick={() => setSelectionMode('custom')}
                    >
                        <span className="material-symbols-outlined">tune</span>
                        CUSTOM EXERCISES
                    </button>
                </div>
            </section>

            {selectionMode === 'all' ? (
                <section className={styles.allExercisesPanel}>
                    <p className={styles.panelText}>
                        <span className="material-symbols-outlined">info</span>
                        <strong>All System Exercises</strong> mode is active. The System will automatically rotate every available exercise through your Daily Quests.
                    </p>
                    <button 
                        className={styles.saveBtn} 
                        disabled={saving}
                        onClick={handleSave}
                    >
                        <span className="material-symbols-outlined">save</span>
                        {saving ? 'Saving...' : 'Confirm This Mode'}
                    </button>
                </section>
            ) : (
                <>
                    {/* Validation Dashboard */}
                    <section className={styles.validationPanel}>
                        <div className={styles.glowDecoration}></div>
                        <h3 className={styles.panelTitle}>
                            <span className="material-symbols-outlined">verified</span>
                            System Configuration Status
                        </h3>
                        <div className={styles.validationGrid}>
                            {CATEGORIES.map(cat => {
                                const count = categoryCounts[cat.key] || 0;
                                const isValid = count >= 6;
                                return (
                                    <div 
                                        key={cat.key} 
                                        className={`${styles.validationCard} ${isValid ? styles.validCard : styles.invalidCard}`}
                                    >
                                        <span className={styles.validationCatName}>{cat.key}</span>
                                        <div className={styles.validationProgressRow}>
                                            <span className={styles.validationCount}>{count} / 6 exercises</span>
                                            <span className={`material-symbols-outlined ${styles.statusIcon}`}>
                                                {isValid ? 'check_circle' : 'cancel'}
                                            </span>
                                        </div>
                                        <div className={styles.miniBarTrack}>
                                            <div 
                                                className={styles.miniBarFill} 
                                                style={{ width: `${Math.min((count / 6) * 100, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className={styles.panelFooter}>
                            <p className={styles.warningHint}>
                                <span className="material-symbols-outlined">info</span>
                                Note: Select at least 6 exercises for each muscle group so the System can operate correctly.
                            </p>
                            <button 
                                className={styles.saveBtn} 
                                disabled={saving}
                                onClick={handleSave}
                            >
                                <span className="material-symbols-outlined">save</span>
                                {saving ? 'Saving...' : 'Save Configuration'}
                            </button>
                        </div>
                    </section>

            {/* Exercise Selection Grid */}
            <div className={styles.categoriesSection}>
                {CATEGORIES.map(cat => {
                    const categoryExercises = allExercises.filter(ex => ex.category === cat.key);
                    return (
                        <section key={cat.key} className={styles.categoryBlock}>
                            <h2 className={styles.categoryHeader}>
                                <span className={styles.categoryHeaderGlow}></span>
                                {cat.label}
                            </h2>

                            <div className={styles.exerciseGrid}>
                                {categoryExercises.map(ex => {
                                    const isChecked = selectedIds.has(ex.id);
                                    return (
                                        <div 
                                            key={ex.id} 
                                            className={`${styles.exerciseCard} ${isChecked ? styles.cardActive : ''}`}
                                            onClick={() => handleToggleExercise(ex.id)}
                                        >
                                            <div className={styles.cardHeader}>
                                                <div className={styles.checkboxWrapper}>
                                                    <div className={`${styles.checkbox} ${isChecked ? styles.checked : ''}`}>
                                                        {isChecked && <span className="material-symbols-outlined">check</span>}
                                                    </div>
                                                </div>
                                                <span className={styles.exerciseName}>{ex.name}</span>
                                            </div>
                                            <div className={styles.cardBody}>
                                                <span className={styles.exerciseStat}>
                                                    {ex.baseSets} Sets × {ex.baseReps} Reps ({ex.targetStat})
                                                </span>
                                                <button 
                                                    className={styles.inspectBtn}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setPreviewExercise(ex);
                                                    }}
                                                    title="Exercise details"
                                                >
                                                    <span className="material-symbols-outlined">info</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {categoryExercises.length === 0 && (
                                    <div className={styles.emptyCard}>
                                        No exercises are available for this muscle group.
                                    </div>
                                )}
                            </div>
                        </section>
                    );
                })}
            </div>
            </>
            )}

            {/* PREVIEW EXERCISE MODAL */}
            {previewExercise && (
                <div className={styles.modalOverlay} onClick={() => setPreviewExercise(null)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <button 
                            className={styles.closeBtn}
                            onClick={() => setPreviewExercise(null)}
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>

                        <div className={styles.exerciseDetailHeader}>
                            <span className={styles.categoryBadge}>{previewExercise.category}</span>
                            <h2 className={styles.detailTitle}>{previewExercise.name}</h2>
                            <p className={styles.detailTarget}>
                                Target Stat: <span className={styles.neonBlue}>{previewExercise.targetStat}</span>
                            </p>
                        </div>

                        <div className={styles.detailBody}>
                            {previewExercise.imageUrl && (
                                <div className={styles.detailImageContainer}>
                                    <img 
                                        src={previewExercise.imageUrl} 
                                        alt={previewExercise.name} 
                                        className={styles.detailImage}
                                    />
                                </div>
                            )}

                            <div className={styles.detailSection}>
                                <h3 className={styles.sectionHeader}>
                                    <span className="material-symbols-outlined">description</span>
                                    EXERCISE DESCRIPTION
                                </h3>
                                <p className={styles.sectionText}>
                                    {previewExercise.description || "No description is available for this exercise."}
                                </p>
                            </div>

                            <div className={styles.detailStatsRow}>
                                <div className={styles.detailStatCard}>
                                    <span className={styles.statLabel}>BASE SETS</span>
                                    <span className={styles.statVal}>{previewExercise.baseSets} Sets</span>
                                </div>
                                <div className={styles.detailStatCard}>
                                    <span className={styles.statLabel}>BASE REPS</span>
                                    <span className={styles.statVal}>{previewExercise.baseReps} Reps</span>
                                </div>
                            </div>

                            {previewExercise.safetyTips && (
                                <div className={styles.detailSection}>
                                    <h3 className={`${styles.sectionHeader} ${styles.warningHeader}`}>
                                        <span className="material-symbols-outlined">gpp_maybe</span>
                                        SAFETY NOTES
                                    </h3>
                                    <p className={styles.sectionText}>
                                        {previewExercise.safetyTips}
                                    </p>
                                </div>
                            )}

                            {previewExercise.tutorialVideoUrl && (
                                <div className={styles.detailSection}>
                                    <a 
                                        href={previewExercise.tutorialVideoUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className={styles.videoLinkBtn}
                                    >
                                        <span className="material-symbols-outlined">play_circle</span>
                                        WATCH TUTORIAL VIDEO
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* CREATE CUSTOM EXERCISE MODAL */}
            {showCreateModal && (
                <div className={styles.modalOverlay} onClick={() => { if (!creating) setShowCreateModal(false); }}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <button 
                            className={styles.closeBtn}
                            onClick={() => { if (!creating) setShowCreateModal(false); }}
                            disabled={creating}
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>

                        <h2 className={styles.modalTitle}>
                            <span className="material-symbols-outlined">add_circle</span>
                            Create New Exercise
                        </h2>

                        <form className={styles.form} onSubmit={handleCreateExercise}>
                            <div className={styles.formField}>
                                <label>Illustration</label>
                                <div className={styles.imageUploadRow}>
                                    {newImagePreview ? (
                                        <img 
                                            src={newImagePreview} 
                                            alt="Preview" 
                                            className={styles.uploadPreview}
                                        />
                                    ) : (
                                        <div className={styles.uploadPlaceholder}>
                                            <span className="material-symbols-outlined">image</span>
                                        </div>
                                    )}
                                    <div className={styles.fileBtnWrapper}>
                                        <button type="button" className={styles.fileBtn}>
                                            <span className="material-symbols-outlined">upload_file</span>
                                            Choose Image
                                        </button>
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            className={styles.fileInput}
                                            onChange={handleImageChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={styles.formField}>
                                <label htmlFor="exerciseName">Exercise Name</label>
                                <input 
                                    type="text" 
                                    id="exerciseName" 
                                    className={styles.input} 
                                    placeholder="For example: Push Up, Pull Up..."
                                    value={newName} 
                                    onChange={(e) => setNewName(e.target.value)} 
                                    required 
                                    disabled={creating}
                                />
                            </div>

                            <div className={styles.formGrid}>
                                <div className={styles.formField}>
                                    <label htmlFor="categorySelect">Muscle Group</label>
                                    <select 
                                        id="categorySelect" 
                                        className={styles.select} 
                                        value={newCategory} 
                                        onChange={(e) => setNewCategory(e.target.value)}
                                        disabled={creating}
                                    >
                                        {CATEGORIES.map(c => (
                                            <option key={c.key} value={c.key}>{c.key}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className={styles.formField}>
                                    <label htmlFor="statSelect">Target Attribute</label>
                                    <select 
                                        id="statSelect" 
                                        className={styles.select} 
                                        value={newTargetStat} 
                                        onChange={(e) => setNewTargetStat(e.target.value)}
                                        disabled={creating}
                                    >
                                        <option value="STR">Strength (STR)</option>
                                        <option value="AGI">Agility (AGI)</option>
                                        <option value="VIT">Vitality (VIT)</option>
                                    </select>
                                </div>
                            </div>

                            <div className={styles.formGrid}>
                                <div className={styles.formField}>
                                    <label htmlFor="baseSetsInput">Default Sets</label>
                                    <input 
                                        type="number" 
                                        id="baseSetsInput" 
                                        min="1" 
                                        className={styles.input} 
                                        value={newBaseSets} 
                                        onChange={(e) => setNewBaseSets(parseInt(e.target.value) || 3)}
                                        required
                                        disabled={creating}
                                    />
                                </div>

                                <div className={styles.formField}>
                                    <label htmlFor="baseRepsInput">Default Reps</label>
                                    <input 
                                        type="number" 
                                        id="baseRepsInput" 
                                        min="1" 
                                        className={styles.input} 
                                        value={newBaseReps} 
                                        onChange={(e) => setNewBaseReps(parseInt(e.target.value) || 10)}
                                        required
                                        disabled={creating}
                                    />
                                </div>
                            </div>

                            <div className={styles.formField}>
                                <label htmlFor="descriptionInput">Exercise Instructions</label>
                                <textarea 
                                    id="descriptionInput" 
                                    className={styles.textarea} 
                                    placeholder="Explain how the Hunter should perform the exercise..."
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                    disabled={creating}
                                />
                            </div>

                            <div className={styles.formField}>
                                <label htmlFor="videoInput">Tutorial Video Link</label>
                                <input 
                                    type="url" 
                                    id="videoInput" 
                                    className={styles.input} 
                                    placeholder="https://youtube.com/..." 
                                    value={newTutorialVideoUrl}
                                    onChange={(e) => setNewTutorialVideoUrl(e.target.value)}
                                    disabled={creating}
                                />
                            </div>

                            <div className={styles.formField}>
                                <label htmlFor="safetyTipsInput">Safety Notes</label>
                                <textarea 
                                    id="safetyTipsInput" 
                                    className={styles.textarea} 
                                    placeholder="Important guidance to prevent injuries..."
                                    value={newSafetyTips}
                                    onChange={(e) => setNewSafetyTips(e.target.value)}
                                    disabled={creating}
                                />
                            </div>

                            <div className={styles.buttonRow}>
                                <button 
                                    type="button" 
                                    className={styles.cancelBtn} 
                                    onClick={() => { resetForm(); setShowCreateModal(false); }}
                                    disabled={creating}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className={styles.saveBtn} 
                                    disabled={creating}
                                >
                                    {creating ? 'Creating...' : 'Create Exercise'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* System Alert Overlay */}
            {alertConfig && (
                <SystemAlert 
                    title={alertConfig.title}
                    message={alertConfig.message}
                    type={alertConfig.type}
                    onClose={() => setAlertConfig(null)}
                />
            )}
        </div>
    );
}
