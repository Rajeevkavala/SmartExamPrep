import { panelClass, SectionLabel, StatusBadge } from "@/components/shared/brand-ui";
import { cn } from "@/lib/utils";

type DailyPlanHeroProps = {
  planDate: string;
  completionPct: number;
  status: string;
  roadmapWeekNumber: number | null;
  roadmapFocusLabel: string | null;
};

const formatDateLabel = (planDate: string): string => {
  const parsed = new Date(planDate);
  if (Number.isNaN(parsed.getTime())) {
    return planDate;
  }

  return parsed.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function DailyPlanHero({
  planDate,
  completionPct,
  status,
  roadmapWeekNumber,
  roadmapFocusLabel,
}: DailyPlanHeroProps) {
  return (
    <header className={cn(panelClass, "p-6 sm:p-8")}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(232,82,10,0.12),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(0,212,255,0.1),transparent_28%)]" />
      <div className="relative space-y-5">
        <SectionLabel>Daily planner</SectionLabel>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="font-display text-[clamp(2.6rem,6vw,5rem)] leading-[0.9] tracking-[0.08em] text-[var(--cream)]">
              Daily Study Planner
            </h1>
            <p className="mt-3 font-serif text-xl italic text-[var(--cream)]">
              {formatDateLabel(planDate)}
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[rgba(194,186,176,0.74)]">
              Stay in execution mode with roadmap focus, due revisions, and adaptive practice.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <StatusBadge tone="fire">{completionPct.toFixed(0)}% complete</StatusBadge>
            <StatusBadge tone="ice">{status}</StatusBadge>
            {roadmapWeekNumber ? (
              <StatusBadge tone="success">Week {roadmapWeekNumber}</StatusBadge>
            ) : null}
          </div>
        </div>
        {roadmapFocusLabel ? (
          <p className="font-serif text-xl italic text-[var(--cream)]">
            Focus: {roadmapFocusLabel}
          </p>
        ) : null}
      </div>
    </header>
  );
}
