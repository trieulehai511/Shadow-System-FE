export type ExerciseMetric = 'REPS' | 'DURATION' | 'DISTANCE';

export interface QuestItem {
    id: string;
    exerciseName: string;
    category: string;
    targetSets: number;
    targetReps: number;
    metric: ExerciseMetric;
    targetDurationSeconds: number;
    targetDistanceMeters: number;
    secondsPerRep: number;
    secondsPerKilometer: number;
    baseRestSeconds: number;
    targetStat: string;
    completed: boolean;
    type?: 'MAIN' | 'BONUS';
    status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED';
    description?: string;
    tutorialVideoUrl?: string;
    imageUrl?: string;
    safetyTips?: string;
    accumulatedSeconds?: number;
    requiredSeconds?: number;
    startedAt?: string;
    lastPingAt?: string;
}

export interface DailyQuestResponse {
    id: string;
    questDate: string;
    completed: boolean;
    restDay: boolean;
    serverTime?: string;
    questItems: QuestItem[];
}

export interface ExerciseResponse {
    id: string;
    name: string;
    category: string;
    targetStat: string;
    baseSets: number;
    baseReps: number;
    metric: ExerciseMetric;
    baseDurationSeconds: number;
    baseDistanceMeters: number;
    secondsPerRep: number;
    secondsPerKilometer: number;
    restSeconds: number;
    description?: string;
    tutorialVideoUrl?: string;
    imageUrl?: string;
    safetyTips?: string;
    isSystem: boolean;
    hunterId?: string;
}

export type TrainingPace = 'STRONG' | 'AVERAGE' | 'WEAK';

export interface ActiveQuestSession {
    itemId: string;
    exerciseName: string;
    pace: TrainingPace;
    secondsPerSet: number;
    restSeconds: number;
    totalRequiredSeconds: number;
    accumulatedSeconds: number;
    currentSet: number;
    phase: 'training' | 'rest';
    timeLeft: number;
    isPaused: boolean;
    isFinishing?: boolean;
}
