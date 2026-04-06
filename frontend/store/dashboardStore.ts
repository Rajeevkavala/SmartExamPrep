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

export type PlannerDashboardSummary = {
  has_plan: boolean;
  plan_id?: string;
  status: string;
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  completion_pct: number;
  total_planned_minutes: number;
  total_completed_minutes: number;
  roadmap_week_number: number | null;
  roadmap_focus_label: string | null;
  has_carry_forward: boolean;
};

export type RoadmapProgressSummary = {
  has_roadmap: boolean;
  progress_pct: number;
  current_week: number | null;
  total_weeks: number;
  completed_weeks: number;
  planned_minutes_total: number;
  completed_minutes_total: number;
};

export type TopicProgressItem = {
  topic_id: string;
  topic_name: string;
  subject_name: string;
  mastery_level: string;
  weakness_score: number;
  accuracy_pct: number;
  total_attempts: number;
  planned_minutes: number;
  completed_minutes: number;
};

export type DashboardQuickActionItem = {
  label: string;
  href: string;
  description: string;
  variant: string;
};

type DashboardPayload = {
  readiness_score?: number;
  weakest_topics?: TopicSummary[];
  strongest_topics?: TopicSummary[];
  subjects_progress?: SubjectProgress[];
  recent_scores?: RecentScore[];
  todays_quiz_ready?: boolean;
  study_streak_days?: number;
  study_streak_delta_vs_last_week?: number;
  minutes_studied_today?: number;
  questions_solved_today?: number;
  questions_goal_today?: number;
  accuracy_delta_vs_yesterday?: number;
  activity_events_today?: number;
  questions_solved_total?: number;
  hours_studied_total?: number;
  status_badge_label?: string;
  roadmap_progress?: RoadmapProgressSummary | null;
  roadmap_progress_pct?: number;
  roadmap_current_week?: number | null;
  today_plan_status?: string;
  topic_progress?: TopicProgressItem[];
  quick_actions?: DashboardQuickActionItem[];
  planner_summary?: PlannerDashboardSummary | null;
  nlp_insight?: string | null;
};

interface DashboardState {
  readiness_score: number;
  weakest_topics: TopicSummary[];
  strongest_topics: TopicSummary[];
  subjects_progress: SubjectProgress[];
  recent_scores: RecentScore[];
  study_streak_days: number;
  study_streak_delta_vs_last_week: number;
  minutes_studied_today: number;
  questions_solved_today: number;
  questions_goal_today: number;
  accuracy_delta_vs_yesterday: number;
  activity_events_today: number;
  questions_solved_total: number;
  hours_studied_total: number;
  status_badge_label: string;
  roadmap_progress: RoadmapProgressSummary | null;
  roadmap_progress_pct: number;
  roadmap_current_week: number | null;
  today_plan_status: string;
  topic_progress: TopicProgressItem[];
  quick_actions: DashboardQuickActionItem[];
  planner_summary: PlannerDashboardSummary | null;
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
  study_streak_days: 0,
  study_streak_delta_vs_last_week: 0,
  minutes_studied_today: 0,
  questions_solved_today: 0,
  questions_goal_today: 0,
  accuracy_delta_vs_yesterday: 0,
  activity_events_today: 0,
  questions_solved_total: 0,
  hours_studied_total: 0,
  status_badge_label: "Build your plan",
  roadmap_progress: null,
  roadmap_progress_pct: 0,
  roadmap_current_week: null,
  today_plan_status: "missing",
  topic_progress: [],
  quick_actions: [],
  planner_summary: null,
  nlp_insight: null,
  isLoaded: false,
  setDashboard: (data) =>
    set({
      readiness_score: data.readiness_score ?? 0,
      weakest_topics: data.weakest_topics ?? [],
      strongest_topics: data.strongest_topics ?? [],
      subjects_progress: data.subjects_progress ?? [],
      recent_scores: data.recent_scores ?? [],
      study_streak_days: data.study_streak_days ?? 0,
      study_streak_delta_vs_last_week: data.study_streak_delta_vs_last_week ?? 0,
      minutes_studied_today: data.minutes_studied_today ?? 0,
      questions_solved_today: data.questions_solved_today ?? 0,
      questions_goal_today: data.questions_goal_today ?? 0,
      accuracy_delta_vs_yesterday: data.accuracy_delta_vs_yesterday ?? 0,
      activity_events_today: data.activity_events_today ?? 0,
      questions_solved_total: data.questions_solved_total ?? 0,
      hours_studied_total: data.hours_studied_total ?? 0,
      status_badge_label: data.status_badge_label ?? "Build your plan",
      roadmap_progress: data.roadmap_progress ?? null,
      roadmap_progress_pct: data.roadmap_progress_pct ?? 0,
      roadmap_current_week: data.roadmap_current_week ?? null,
      today_plan_status: data.today_plan_status ?? "missing",
      topic_progress: data.topic_progress ?? [],
      quick_actions: data.quick_actions ?? [],
      planner_summary: data.planner_summary ?? null,
      nlp_insight: data.nlp_insight ?? null,
      isLoaded: true,
    }),
  setInsight: (text) =>
    set({
      nlp_insight: text,
      isLoaded: true,
    }),
}));
