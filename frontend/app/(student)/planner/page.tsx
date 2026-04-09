"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import CarryForwardBanner from "@/components/student/CarryForwardBanner";
import DailyPlanHero from "@/components/student/DailyPlanHero";
import DailyTaskCard from "@/components/student/DailyTaskCard";
import PlannerSummary from "@/components/student/PlannerSummary";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { fireButtonClass, ghostButtonClass } from "@/components/shared/brand-ui";
import { toast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import {
  type DailyPlanPayload,
  type PlannerTaskStatus,
  usePlannerStore,
} from "@/store/plannerStore";

type PlannerStatusResponse = {
  success: boolean;
  plan: DailyPlanPayload;
};

export default function PlannerPage() {
  const plan = usePlannerStore((state) => state.plan);
  const setPlan = usePlannerStore((state) => state.setPlan);
  const clearPlan = usePlannerStore((state) => state.clearPlan);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCarryingForward, setIsCarryingForward] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const orderedTasks = useMemo(() => {
    if (!plan?.tasks) {
      return [];
    }

    return [...plan.tasks].sort((first, second) => first.sequence_order - second.sequence_order);
  }, [plan?.tasks]);

  const taskSourceSummary = useMemo(() => {
    const summary = {
      carryForward: 0,
      roadmap: 0,
      revision: 0,
      adaptive: 0,
    };

    orderedTasks.forEach((task) => {
      if (task.source_type === "carry_forward") {
        summary.carryForward += 1;
      } else if (task.source_type === "roadmap") {
        summary.roadmap += 1;
      } else if (task.source_type === "revision_schedule") {
        summary.revision += 1;
      } else if (task.source_type === "adaptive_recommendation") {
        summary.adaptive += 1;
      }
    });

    return summary;
  }, [orderedTasks]);

  const loadTodayPlan = useCallback(
    async (showMainLoading = true) => {
      if (showMainLoading) {
        setIsLoading(true);
      }

      try {
        setLoadError(null);
        const { data } = await api.get<DailyPlanPayload>("/planner/today");
        setPlan(data);
      } catch (error) {
        const message =
          (error as { response?: { data?: { detail?: string } } }).response?.data
            ?.detail ?? "Unable to load today's planner.";
        setLoadError(message);
        clearPlan();
      } finally {
        setIsLoading(false);
      }
    },
    [clearPlan, setPlan]
  );

  useEffect(() => {
    void loadTodayPlan(true);
  }, [loadTodayPlan]);

  const handleRegenerate = async () => {
    setIsRefreshing(true);
    try {
      const { data } = await api.post<DailyPlanPayload>("/planner/generate-today", {
        force_regenerate: true,
        include_carry_forward: true,
      });
      setPlan(data);
      toast({
        title: "Planner regenerated",
        description: "Today's task plan has been refreshed.",
      });
    } catch (error) {
      const message =
        (error as { response?: { data?: { detail?: string } } }).response?.data
          ?.detail ?? "Unable to regenerate planner.";
      toast({
        variant: "destructive",
        title: "Planner update failed",
        description: message,
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCarryForward = async () => {
    setIsCarryingForward(true);
    try {
      const { data } = await api.post<PlannerStatusResponse>("/planner/carry-forward", {
        from_date: null,
      });
      setPlan(data.plan);
      toast({
        title: "Carry-forward complete",
        description: "Unfinished tasks were synced into today's planner.",
      });
    } catch (error) {
      const message =
        (error as { response?: { data?: { detail?: string } } }).response?.data
          ?.detail ?? "Unable to carry forward tasks.";
      toast({
        variant: "destructive",
        title: "Carry-forward failed",
        description: message,
      });
    } finally {
      setIsCarryingForward(false);
    }
  };

  const handleTaskStatusChange = async (
    taskId: string,
    nextStatus: PlannerTaskStatus
  ) => {
    setUpdatingTaskId(taskId);
    try {
      const { data } = await api.patch<PlannerStatusResponse>(`/planner/tasks/${taskId}`, {
        status: nextStatus,
      });
      setPlan(data.plan);
    } catch (error) {
      const message =
        (error as { response?: { data?: { detail?: string } } }).response?.data
          ?.detail ?? "Unable to update task status.";
      toast({
        variant: "destructive",
        title: "Task update failed",
        description: message,
      });
    } finally {
      setUpdatingTaskId(null);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading today's study planner..." />;
  }

  if (loadError) {
    return (
      <main>
        <EmptyState
          icon="!"
          title="Planner unavailable"
          description={loadError}
          ctaLabel="Retry"
          ctaHref="/planner"
        />
      </main>
    );
  }

  if (!plan) {
    return (
      <main>
        <EmptyState
          icon="*"
          title="No planner generated"
          description="Generate a daily plan from your roadmap and due revision tasks."
          ctaLabel="Open dashboard"
          ctaHref="/dashboard"
        />
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <DailyPlanHero
        planDate={plan.plan_date}
        completionPct={plan.completion_pct}
        status={plan.status}
        roadmapWeekNumber={plan.roadmap_week_number}
        roadmapFocusLabel={plan.roadmap_focus_label}
      />

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={isRefreshing}
          className={fireButtonClass}
        >
          {isRefreshing ? "Regenerating..." : "Regenerate today"}
        </button>

        <Link href="/dashboard" className={ghostButtonClass}>
          Back to dashboard
        </Link>
      </div>

      <PlannerSummary summary={plan.summary} />

      <section className="grid gap-3 lg:grid-cols-4">
        <article className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-4">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[rgba(194,186,176,0.58)]">Roadmap-synced</p>
          <p className="mt-3 text-3xl font-semibold text-[var(--cream)]">{taskSourceSummary.roadmap}</p>
        </article>
        <article className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-4">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[rgba(194,186,176,0.58)]">Revision due</p>
          <p className="mt-3 text-3xl font-semibold text-[var(--cream)]">{taskSourceSummary.revision}</p>
        </article>
        <article className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-4">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[rgba(194,186,176,0.58)]">Carry forward</p>
          <p className="mt-3 text-3xl font-semibold text-[var(--cream)]">{taskSourceSummary.carryForward}</p>
        </article>
        <article className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-4">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[rgba(194,186,176,0.58)]">Adaptive boosts</p>
          <p className="mt-3 text-3xl font-semibold text-[var(--cream)]">{taskSourceSummary.adaptive}</p>
        </article>
      </section>

      <CarryForwardBanner
        hasCarryForward={plan.has_carry_forward}
        carryForwardFromPlanId={plan.carry_forward_from_plan_id}
        isApplying={isCarryingForward}
        onApplyCarryForward={handleCarryForward}
      />

      <section className="space-y-4">
        {orderedTasks.length > 0 ? (
          orderedTasks.map((task) => (
            <DailyTaskCard
              key={task.task_id}
              task={task}
              isUpdating={updatingTaskId === task.task_id}
              onStatusChange={handleTaskStatusChange}
            />
          ))
        ) : (
          <EmptyState
            icon="-"
            title="No tasks scheduled"
            description="No tasks are scheduled yet for today."
          />
        )}
      </section>
    </main>
  );
}
