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
    { key: 'CHEST', label: 'Thân trên / Đẩy (CHEST)' },
    { key: 'CALISTHENICS', label: 'Bodyweight (CALISTHENICS)' },
    { key: 'LEGS', label: 'Thân dưới / Chân (LEGS)' },
    { key: 'LOWER', label: 'Cơ bổ trợ dưới (LOWER)' },
    { key: 'CARDIO', label: 'Tim mạch / Bền bỉ (CARDIO)' }
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
        if (!newName.trim()) {
            setAlertConfig({
                title: "THIẾU THÔNG TIN",
                message: "Tên bài tập không được để trống.",
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
                title: "TẠO THÀNH CÔNG",
                message: `Đã tạo thành công bài tập "${createdEx.name}". Bài tập này đã tự động được chọn vào danh sách tập của bạn.`,
                type: "success"
            });

            resetForm();
            setShowCreateModal(false);
        } catch (err: any) {
            console.error("Lỗi tạo bài tập mới:", err);
            setAlertConfig({
                title: "LỖI HỆ THỐNG",
                message: err.message || "Không thể tạo bài tập mới.",
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
                console.error("Lỗi tải danh sách bài tập:", err);
                setAlertConfig({
                    title: "LỖI HỆ THỐNG",
                    message: err.message || "Không thể đồng bộ danh sách bài tập từ hệ thống.",
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
        if (selectionMode === 'custom') {
            // Validate before calling API
            const invalidCats = CATEGORIES.filter(cat => (categoryCounts[cat.key] || 0) < 6);
            if (invalidCats.length > 0) {
                setAlertConfig({
                    title: "HỆ THỐNG TỪ CHỐI",
                    message: `Mỗi nhóm cơ bắt buộc phải chọn ít nhất 6 bài tập. Nhóm cơ sau chưa đủ: ${invalidCats.map(c => c.key).join(', ')}`,
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
                title: "CẬP NHẬT THÀNH CÔNG",
                message: selectionMode === 'all'
                    ? "Hệ thống đã chuyển về chế độ sử dụng tất cả bài tập."
                    : "Hệ thống đã lưu lại danh sách bài tập lựa chọn của bạn.",
                type: "success"
            });
        } catch (err: any) {
            console.error("Lỗi khi lưu lựa chọn bài tập:", err);
            setAlertConfig({
                title: "LỖI LƯU THÔNG TIN",
                message: err.message || "Không thể lưu lựa chọn bài tập vào hệ thống.",
                type: "error"
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className={styles.centerLoading}><h3>⚡ ĐANG TRUY XUẤT CƠ SỞ DỮ LIỆU BÀI TẬP...</h3></div>;
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerTitleRow}>
                    <div className={styles.titleRow}>
                        <span className="material-symbols-outlined">fitness_center</span>
                        <h1 className={styles.title}>Lựa chọn bài tập</h1>
                    </div>
                    <button 
                        className={styles.createBtn}
                        onClick={() => setShowCreateModal(true)}
                    >
                        <span className="material-symbols-outlined">add_box</span>
                        Tạo bài tập mới
                    </button>
                </div>
                <p className={styles.subtitle}>Thiết lập danh sách bài tập để Hệ thống tự động tạo Nhiệm vụ hàng ngày.</p>
            </div>

            {/* Mode Selection Panel */}
            <section className={styles.modeSelectionPanel}>
                <div className={styles.modeTitle}>CHẾ ĐỘ CHỌN BÀI TẬP:</div>
                <div className={styles.modeButtonGroup}>
                    <button 
                        className={`${styles.modeBtn} ${selectionMode === 'all' ? styles.modeBtnActive : ''}`}
                        onClick={() => setSelectionMode('all')}
                    >
                        <span className="material-symbols-outlined">select_all</span>
                        TẤT CẢ BÀI TẬP HỆ THỐNG
                    </button>
                    <button 
                        className={`${styles.modeBtn} ${selectionMode === 'custom' ? styles.modeBtnActive : ''}`}
                        onClick={() => setSelectionMode('custom')}
                    >
                        <span className="material-symbols-outlined">tune</span>
                        TỰ CHỌN BÀI TẬP
                    </button>
                </div>
            </section>

            {selectionMode === 'all' ? (
                <section className={styles.allExercisesPanel}>
                    <div className={`${styles.corner} ${styles.topLeft}`}></div>
                    <div className={`${styles.corner} ${styles.topRight}`}></div>
                    <div className={`${styles.corner} ${styles.bottomLeft}`}></div>
                    <div className={`${styles.corner} ${styles.bottomRight}`}></div>
                    <p className={styles.panelText}>
                        <span className="material-symbols-outlined">info</span>
                        Chế độ <strong>Tất cả bài tập hệ thống</strong> đang hoạt động. Hệ thống sẽ tự động luân phiên tất cả các bài tập hệ thống hiện có cho Nhiệm vụ hàng ngày của bạn mà không cần điều chỉnh thủ công.
                    </p>
                    <button 
                        className={styles.saveBtn} 
                        disabled={saving}
                        onClick={handleSave}
                    >
                        <span className="material-symbols-outlined">save</span>
                        {saving ? 'Đang lưu...' : 'Xác nhận chế độ này'}
                    </button>
                </section>
            ) : (
                <>
                    {/* Validation Dashboard */}
                    <section className={styles.validationPanel}>
                        <div className={styles.glowDecoration}></div>
                        <div className={`${styles.corner} ${styles.topLeft}`}></div>
                        <div className={`${styles.corner} ${styles.topRight}`}></div>
                        <div className={`${styles.corner} ${styles.bottomLeft}`}></div>
                        <div className={`${styles.corner} ${styles.bottomRight}`}></div>
                        
                        <h3 className={styles.panelTitle}>
                            <span className="material-symbols-outlined">verified</span>
                            Trạng thái cấu hình Hệ thống
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
                                            <span className={styles.validationCount}>{count} / 6 bài</span>
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
                                Lưu ý: Bạn bắt buộc phải chọn ít nhất 6 bài cho mỗi nhóm cơ để Hệ thống hoạt động chính xác.
                            </p>
                            <button 
                                className={styles.saveBtn} 
                                disabled={saving}
                                onClick={handleSave}
                            >
                                <span className="material-symbols-outlined">save</span>
                                {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
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
                                                    title="Chi tiết bài tập"
                                                >
                                                    <span className="material-symbols-outlined">info</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {categoryExercises.length === 0 && (
                                    <div className={styles.emptyCard}>
                                        Không có bài tập nào thuộc nhóm cơ này.
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
                        <div className={`${styles.corner} ${styles.topLeft}`}></div>
                        <div className={`${styles.corner} ${styles.topRight}`}></div>
                        <div className={`${styles.corner} ${styles.bottomLeft}`}></div>
                        <div className={`${styles.corner} ${styles.bottomRight}`}></div>
                        <div className={styles.scanline}></div>

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
                                    MÔ TẢ BÀI TẬP
                                </h3>
                                <p className={styles.sectionText}>
                                    {previewExercise.description || "Không có mô tả cho bài tập này."}
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
                                        LƯU Ý AN TOÀN
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
                                        XEM VIDEO HƯỚNG DẪN
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
                        <div className={`${styles.corner} ${styles.topLeft}`}></div>
                        <div className={`${styles.corner} ${styles.topRight}`}></div>
                        <div className={`${styles.corner} ${styles.bottomLeft}`}></div>
                        <div className={`${styles.corner} ${styles.bottomRight}`}></div>
                        <div className={styles.scanline}></div>

                        <button 
                            className={styles.closeBtn}
                            onClick={() => { if (!creating) setShowCreateModal(false); }}
                            disabled={creating}
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>

                        <h2 className={styles.modalTitle}>
                            <span className="material-symbols-outlined">add_circle</span>
                            Tạo bài tập mới
                        </h2>

                        <form className={styles.form} onSubmit={handleCreateExercise}>
                            <div className={styles.formField}>
                                <label>Hình ảnh minh họa</label>
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
                                            Chọn ảnh
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
                                <label htmlFor="exerciseName">Tên bài tập</label>
                                <input 
                                    type="text" 
                                    id="exerciseName" 
                                    className={styles.input} 
                                    placeholder="Ví dụ: Push Up, Pull Up..." 
                                    value={newName} 
                                    onChange={(e) => setNewName(e.target.value)} 
                                    required 
                                    disabled={creating}
                                />
                            </div>

                            <div className={styles.formGrid}>
                                <div className={styles.formField}>
                                    <label htmlFor="categorySelect">Nhóm cơ</label>
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
                                    <label htmlFor="statSelect">Chỉ số tác động</label>
                                    <select 
                                        id="statSelect" 
                                        className={styles.select} 
                                        value={newTargetStat} 
                                        onChange={(e) => setNewTargetStat(e.target.value)}
                                        disabled={creating}
                                    >
                                        <option value="STR">Sức mạnh (STR)</option>
                                        <option value="AGI">Khéo léo (AGI)</option>
                                        <option value="VIT">Thể lực (VIT)</option>
                                    </select>
                                </div>
                            </div>

                            <div className={styles.formGrid}>
                                <div className={styles.formField}>
                                    <label htmlFor="baseSetsInput">Số Sets mặc định</label>
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
                                    <label htmlFor="baseRepsInput">Số Reps mặc định</label>
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
                                <label htmlFor="descriptionInput">Mô tả cách thực hiện</label>
                                <textarea 
                                    id="descriptionInput" 
                                    className={styles.textarea} 
                                    placeholder="Hướng dẫn thợ săn cách tập..."
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                    disabled={creating}
                                />
                            </div>

                            <div className={styles.formField}>
                                <label htmlFor="videoInput">Link video hướng dẫn</label>
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
                                <label htmlFor="safetyTipsInput">Lưu ý an toàn</label>
                                <textarea 
                                    id="safetyTipsInput" 
                                    className={styles.textarea} 
                                    placeholder="Lưu ý quan trọng để tránh chấn thương..."
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
                                    Hủy
                                </button>
                                <button 
                                    type="submit" 
                                    className={styles.saveBtn} 
                                    disabled={creating}
                                >
                                    {creating ? 'Đang tạo...' : 'Tạo bài tập'}
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
