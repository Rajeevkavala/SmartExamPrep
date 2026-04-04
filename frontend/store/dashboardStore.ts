import { create } from "zustand";

export type TopicSummary = {
  topic_id: string;
  topic_name: string;
  subject_name: string;
  weakness_score: number;
  mastery_level: "Weak" | "Moderate" | "Strong";
  accuracy: number;
  total_attempts: number;
};

export type SubjectProgress = {
  subject_name: string;
  accuracy: number;
};

export type RecentScore = {
  score: number;
  date: string;
};

type DashboardPayload = {
  readiness_score?: number;
  weakest_topics?: TopicSummary[];
  strongest_topics?: TopicSummary[];
  subjects_progress?: SubjectProgress[];
  recent_scores?: RecentScore[];
  todays_quiz_ready?: boolean;
  nlp_insight?: string | null;
};

interface DashboardState {
  readiness_score: number;
  weakest_topics: TopicSummary[];
  strongest_topics: TopicSummary[];
  subjects_progress: SubjectProgress[];
  recent_scores: RecentScore[];
  nlp_insight: string | null;
  isLoaded: boolean;
  setDashboard: (data: DashboardPayload) => void;
  setInsight: (text: string) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  readiness_score: 0,
  weakest_topics: [],
  strongest_topics: [],
  subjects_progress: [],
  recent_scores: [],
  nlp_insight: null,
  isLoaded: false,
  setDashboard: (data) =>
    set({
      readiness_score: data.readiness_score ?? 0,
      weakest_topics: data.weakest_topics ?? [],
      strongest_topics: data.strongest_topics ?? [],
      subjects_progress: data.subjects_progress ?? [],
      recent_scores: data.recent_scores ?? [],
      nlp_insight: data.nlp_insight ?? null,
      isLoaded: true,
    }),
  setInsight: (text) =>
    set({
      nlp_insight: text,
      isLoaded: true,
    }),
}));