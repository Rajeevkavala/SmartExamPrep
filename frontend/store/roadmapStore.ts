import { create } from "zustand";

export type RoadmapResourceItem = {
  title: string;
  type: string;
  url: string;
};

export type RoadmapTopicItem = {
  topic_id: string;
  topic_name: string;
  subject_id: string;
  subject_name: string;
  sequence_order: number;
  priority_score: number;
  planned_minutes: number;
  goal_type: string;
  resources: RoadmapResourceItem[];
  rationale: Record<string, unknown>;
};

export type RoadmapDayPlanItem = {
  day_number: number;
  day_date: string;
  title: string;
  planned_minutes: number;
  status: string;
  completion_pct: number;
  focus_topic_ids: string[];
  resources: RoadmapResourceItem[];
};

export type RoadmapWeekTracking = {
  completed_days: number;
  total_days: number;
  completion_pct: number;
  completed_minutes: number;
  planned_minutes: number;
};

export type RoadmapWeekItem = {
  week_number: number;
  month_number: number;
  start_date: string;
  end_date: string;
  planned_minutes: number;
  focus_label: string | null;
  status: string;
  topics: RoadmapTopicItem[];
  day_plan: RoadmapDayPlanItem[];
  tracking: RoadmapWeekTracking;
};

export type RoadmapSummary = {
  roadmap_id: string;
  status: string;
  plan_horizon_weeks: number;
  generation_reason: string | null;
  generated_at: string;
  start_date: string;
  end_date: string;
  exam_target_date: string | null;
  total_topics: number;
  total_planned_minutes: number;
  weeks_left: number;
  generated_weeks: number;
  generated_months: number;
  total_months: number;
  has_more_months: boolean;
  next_generation_month: number | null;
};

export type RoadmapPayload = {
  summary: RoadmapSummary;
  weeks: RoadmapWeekItem[];
};

interface RoadmapState {
  roadmap: RoadmapPayload | null;
  selectedWeek: number;
  setRoadmap: (payload: RoadmapPayload) => void;
  setSelectedWeek: (weekNumber: number) => void;
  clearRoadmap: () => void;
}

export const useRoadmapStore = create<RoadmapState>((set) => ({
  roadmap: null,
  selectedWeek: 1,
  setRoadmap: (payload) =>
    set((state) => ({
      roadmap: payload,
      selectedWeek:
        state.selectedWeek > 0 &&
        payload.weeks.some((week) => week.week_number === state.selectedWeek)
          ? state.selectedWeek
          : 1,
    })),
  setSelectedWeek: (weekNumber) => set({ selectedWeek: weekNumber }),
  clearRoadmap: () => set({ roadmap: null, selectedWeek: 1 }),
}));
