// src/models/QuestType.ts
export interface QuestItem {
    id: string;
    exerciseName: string;
    category: string;
    targetSets: number;
    targetReps: number;
    targetStat: string;
    completed: boolean;
    type?: 'MAIN' | 'BONUS';
    status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
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
    description?: string;
    tutorialVideoUrl?: string;
    imageUrl?: string;
    safetyTips?: string;
    isSystem: boolean;
    hunterId?: string;
}
