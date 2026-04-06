import {
  MetricCard,
  panelClass,
  SectionLabel,
  StatusBadge,
} from "@/components/shared/brand-ui";
import type { RoadmapSummary } from "@/store/roadmapStore";
import { cn } from "@/lib/utils";

type RoadmapHeroProps = {
  summary: RoadmapSummary;
};

export default function RoadmapHero({ summary }: RoadmapHeroProps) {
  return (
    <section className={cn(panelClass, "p-6 sm:p-8")}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,212,255,0.12),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(232,82,10,0.1),transparent_30%)]" />
      <div className="relative space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-4">
            <SectionLabel>Roadmap</SectionLabel>
            <h2 className="font-display text-[clamp(2.8rem,7vw,5rem)] leading-[0.9] tracking-[0.08em] text-[var(--cream)]">
              YOUR STUDY TIMELINE, WEEK BY WEEK.
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-[rgba(194,186,176,0.74)]">
              A month-by-month roadmap enriched with resources, week goals, and day-level
              execution planning.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <StatusBadge tone="ice">
              {summary.generated_months}/{summary.total_months} months
            </StatusBadge>
            {summary.exam_target_date ? (
              <StatusBadge tone="fire">Exam {summary.exam_target_date}</StatusBadge>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Weeks planned"
            value={summary.generated_weeks}
            helper={`of ${summary.plan_horizon_weeks} total`}
            tone="ice"
          />
          <MetricCard
            label="Weeks left"
            value={summary.weeks_left}
            helper="Until exam window"
            tone="fire"
          />
          <MetricCard
            label="Topics planned"
            value={summary.total_topics}
            helper="Across generated months"
            tone="success"
          />
          <MetricCard
            label="Total minutes"
            value={summary.total_planned_minutes}
            helper={`${summary.start_date} to ${summary.end_date}`}
            tone="warning"
          />
        </div>
      </div>
    </section>
  );
}
