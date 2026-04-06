import { insetPanelClass, ProgressBar, StatusBadge } from "@/components/shared/brand-ui";
import RoadmapTopicList from "@/components/student/RoadmapTopicList";
import type { RoadmapWeekItem } from "@/store/roadmapStore";
import { cn } from "@/lib/utils";

type RoadmapWeekCardProps = {
  week: RoadmapWeekItem;
  isSelected: boolean;
  onSelect: (weekNumber: number) => void;
  onUpdateDayStatus: (
    weekNumber: number,
    dayNumber: number,
    status: "pending" | "in_progress" | "completed"
  ) => void;
};

export default function RoadmapWeekCard({
  week,
  isSelected,
  onSelect,
  onUpdateDayStatus,
}: RoadmapWeekCardProps) {
  const progressPct = week.tracking?.completion_pct ?? 0;
  const completedDays = week.tracking?.completed_days ?? 0;
  const totalDays = week.tracking?.total_days ?? 0;

  return (
    <section
      className={cn(
        "rounded-[26px] border p-5 transition",
        isSelected
          ? "border-[rgba(232,82,10,0.22)] bg-[rgba(232,82,10,0.08)]"
          : "border-white/8 bg-white/3"
      )}
    >
      <button type="button" onClick={() => onSelect(week.week_number)} className="w-full text-left">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-display text-3xl tracking-[0.08em] text-[var(--cream)]">
              Week {week.week_number}
            </p>
            <p className="mt-2 text-sm text-[rgba(194,186,176,0.68)]">
              {week.focus_label || "Consolidation and revision"}
            </p>
          </div>
          <div className="space-y-2 text-right">
            <StatusBadge
              tone={
                week.status === "completed"
                  ? "success"
                  : week.status === "active"
                    ? "fire"
                    : "neutral"
              }
            >
              {week.status}
            </StatusBadge>
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.24em] text-[rgba(194,186,176,0.58)]">
              {week.planned_minutes} min
            </p>
          </div>
        </div>
        <p className="mt-3 font-mono text-[0.58rem] uppercase tracking-[0.24em] text-[rgba(194,186,176,0.58)]">
          {week.start_date} to {week.end_date}
        </p>
        <div className="mt-4 space-y-2">
          <ProgressBar value={progressPct} tone="fire" />
          <p className="text-xs text-[rgba(194,186,176,0.62)]">
            {completedDays}/{totalDays} days complete
          </p>
        </div>
      </button>

      {isSelected ? (
        <div className="mt-5 space-y-5 border-t border-white/8 pt-5">
          <RoadmapTopicList topics={week.topics} />

          <div className="space-y-3">
            {week.day_plan.length === 0 ? (
              <p className="rounded-[22px] border border-white/8 bg-white/3 px-4 py-4 text-sm text-[rgba(194,186,176,0.66)]">
                Day-wise breakdown will appear after month generation.
              </p>
            ) : null}

            {week.day_plan.map((day) => (
              <article key={`${week.week_number}-${day.day_number}`} className={cn(insetPanelClass, "space-y-4 p-4")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--cream)]">
                      Day {day.day_number}: {day.title}
                    </p>
                    <p className="mt-1 text-xs text-[rgba(194,186,176,0.62)]">
                      {day.day_date} · {day.planned_minutes} min
                    </p>
                  </div>
                  <StatusBadge
                    tone={
                      day.status === "completed"
                        ? "success"
                        : day.status === "in_progress"
                          ? "ice"
                          : "neutral"
                    }
                  >
                    {day.status}
                  </StatusBadge>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateDayStatus(week.week_number, day.day_number, "completed")}
                    className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 font-mono text-[0.58rem] uppercase tracking-[0.22em] text-emerald-200"
                  >
                    Mark complete
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateDayStatus(week.week_number, day.day_number, "in_progress")}
                    className="rounded-full border border-[rgba(0,212,255,0.22)] bg-[rgba(0,212,255,0.08)] px-3 py-2 font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[var(--ice)]"
                  >
                    In progress
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateDayStatus(week.week_number, day.day_number, "pending")}
                    className="rounded-full border border-white/10 bg-white/4 px-3 py-2 font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[var(--cream)]"
                  >
                    Reset
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
