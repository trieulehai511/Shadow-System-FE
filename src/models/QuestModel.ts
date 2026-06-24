// src/models/QuestType.ts
export interface QuestItem {
    id: string;
    exerciseName: string;
    category: string;
    targetSets: number;
    targetReps: number;
    targetStat: string;
    completed: boolean;
}

export interface DailyQuestResponse {
    id: string;
    questDate: string;
    completed: boolean;
    restDay: boolean;
    questItems: QuestItem[];
}