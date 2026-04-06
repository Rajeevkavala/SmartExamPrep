import { MetricCard } from "@/components/shared/brand-ui";
import type { PlannerSummary as PlannerSummaryType } from "@/store/plannerStore";

type PlannerSummaryProps = {
  summary: PlannerSummaryType;
};

export default function PlannerSummary({ summary }: PlannerSummaryProps) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Tasks complete"
        value={summary.completed_tasks}
        helper={`of ${summary.total_tasks} tasks`}
        tone="success"
      />
      <MetricCard
        label="Pending"
        value={summary.pending_tasks}
        helper="Still open today"
        tone="warning"
      />
      <MetricCard
        label="Minutes done"
        value={summary.total_completed_minutes}
        helper={`of ${summary.total_planned_minutes} planned`}
        tone="ice"
      />
      <MetricCard
        label="Completion"
        value={`${summary.completion_pct.toFixed(0)}%`}
        helper="Today's progress"
        tone="fire"
      />
    </section>
  );
}
