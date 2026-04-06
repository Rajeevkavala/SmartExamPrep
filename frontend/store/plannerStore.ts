import { create } from "zustand";

export type PlannerTaskStatus = "pending" | "in_progress" | "completed" | "skipped";

export type PlannerTaskItem = {
  task_id: string;
  task_type: string;
  source_type: string;
  subject_id: string | null;
  subject_name: string | null;
  topic_id: string | null;
  topic_name: string | null;
  title: string;
  description: string | null;
  resource_hint: string | null;
  target_question_count: number | null;
  target_minutes: number | null;
  sequence_order: number;
  status: PlannerTaskStatus;
  completed_at: string | null;
  carry_forward_count: number;
  source_payload: Record<string, unknown>;
};

export type PlannerSummary = {
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  completion_pct: number;
  total_planned_minutes: number;
  total_completed_minutes: number;
};

export type DailyPlanPayload = {
  plan_id: string;
  plan_date: string;
  status: string;
  total_planned_minutes: number;
  total_completed_minutes: number;
  completion_pct: number;
  generated_at: string;
  roadmap_id: string | null;
  roadmap_week_id: string | null;
  roadmap_week_number: number | null;
  roadmap_focus_label: string | null;
  carry_forward_from_plan_id: string | null;
  has_carry_forward: boolean;
  summary: PlannerSummary;
  tasks: PlannerTaskItem[];
};

interface PlannerState {
  plan: DailyPlanPayload | null;
  isLoaded: boolean;
  setPlan: (plan: DailyPlanPayload) => void;
  clearPlan: () => void;
  updateTaskStatus: (taskId: string, status: PlannerTaskStatus) => void;
}

export const usePlannerStore = create<PlannerState>((set) => ({
  plan: null,
  isLoaded: false,
  setPlan: (plan) => set({ plan, isLoaded: true }),
  clearPlan: () => set({ plan: null, isLoaded: false }),
  updateTaskStatus: (taskId, status) =>
    set((state) => {
      if (!state.plan) {
        return state;
      }

      return {
        ...state,
        plan: {
          ...state.plan,
          tasks: state.plan.tasks.map((task) =>
            task.task_id === taskId ? { ...task, status } : task
          ),
        },
      };
    }),
}));
