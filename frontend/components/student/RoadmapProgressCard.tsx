import {
  panelClass,
  ProgressBar,
  StatusBadge,
} from "@/components/shared/brand-ui";
import type { PlannerDashboardSummary, RoadmapProgressSummary } from "@/store/dashboardStore";
import { cn } from "@/lib/utils";

type RoadmapProgressCardProps = {
  roadmapProgress: RoadmapProgressSummary | null;
  plannerSummary: PlannerDashboardSummary | null;
};

export default function RoadmapProgressCard({
  roadmapProgress,
  plannerSummary,
}: RoadmapProgressCardProps) {
  if (!roadmapProgress?.has_roadmap) {
    return (
      <article className={cn(panelClass, "p-6")}>
        <p className="font-display text-3xl tracking-[0.08em] text-[var(--cream)]">
          Roadmap Progress
        </p>
        <p className="mt-4 text-sm leading-7 text-[rgba(194,186,176,0.72)]">
          No active roadmap yet. Generate one to unlock weekly sequencing and timeline tracking.
        </p>
      </article>
    );
  }

  const safeProgress = Math.max(0, Math.min(100, roadmapProgress.progress_pct));

  return (
    <article className={cn(panelClass, "p-6")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-3xl tracking-[0.08em] text-[var(--cream)]">
            Roadmap Progress
          </p>
          <p className="mt-2 text-sm leading-7 text-[rgba(194,186,176,0.72)]">
            {roadmapProgress.completed_weeks} of {roadmapProgress.total_weeks} weeks complete.
          </p>
        </div>
        <StatusBadge tone="ice">
          {roadmapProgress.current_week !== null
            ? `Week ${roadmapProgress.current_week}`
            : "Week unavailable"}
        </StatusBadge>
      </div>

      <div className="mt-6 space-y-4">
        <ProgressBar value={safeProgress} tone="ice" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[22px] border border-white/8 bg-white/3 p-4">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.24em] text-[rgba(194,186,176,0.6)]">
              Completion
            </p>
            <p className="mt-3 font-display text-4xl tracking-[0.08em] text-[var(--ice)]">
              {safeProgress.toFixed(1)}%
            </p>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-white/3 p-4">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.24em] text-[rgba(194,186,176,0.6)]">
              Minutes
            </p>
            <p className="mt-3 font-display text-4xl tracking-[0.08em] text-[var(--cream)]">
              {roadmapProgress.completed_minutes_total}
            </p>
            <p className="mt-2 text-xs text-[rgba(194,186,176,0.6)]">
              of {roadmapProgress.planned_minutes_total} planned
            </p>
          </div>
        </div>
        {plannerSummary?.has_plan ? (
          <p className="text-xs uppercase tracking-[0.24em] text-[rgba(194,186,176,0.58)]">
            Planner status: {plannerSummary.status}
          </p>
        ) : null}
      </div>
    </article>
  );
}
