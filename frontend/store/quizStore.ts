import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";

export type MasteryLevel = "Weak" | "Moderate" | "Strong";

export type TopicWeaknessSnapshot = {
  topic_id: string;
  topic_name: string;
  subject_name: string;
  weakness_score: number;
  mastery_level: MasteryLevel;
  accuracy: number;
};

export type TopicComparison = {
  topic_id: string;
  topic_name: string;
  subject_name: string;
  topic_score_pct: number;
  before?: TopicWeaknessSnapshot;
  after?: TopicWeaknessSnapshot;
};

export type QuizResultSnapshot = {
  attempt_id: string;
  quiz_type: string;
  score: number;
  correct_count: number;
  total_questions: number;
  topic_scores: Record<string, number>;
  topic_comparisons: TopicComparison[];
  submitted_at: string;
};

type QuizState = {
  latestResult: QuizResultSnapshot | null;
  setLatestResult: (result: QuizResultSnapshot) => void;
  clearLatestResult: () => void;
};

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

const storage = createJSONStorage<QuizState>(() =>
  typeof window !== "undefined" ? localStorage : noopStorage
);

export const useQuizStore = create<QuizState>()(
  persist(
    (set) => ({
      latestResult: null,
      setLatestResult: (result) => set({ latestResult: result }),
      clearLatestResult: () => set({ latestResult: null }),
    }),
    {
      name: "quiz-store",
      storage,
    }
  )
);
