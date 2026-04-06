import RoadmapWeekCard from "@/components/student/RoadmapWeekCard";
import { panelClass, StatusBadge } from "@/components/shared/brand-ui";
import type { RoadmapWeekItem } from "@/store/roadmapStore";
import { cn } from "@/lib/utils";

type RoadmapMonthSectionProps = {
  monthNumber: number;
  weeks: RoadmapWeekItem[];
  selectedWeek: number;
  onSelectWeek: (weekNumber: number) => void;
  onUpdateDayStatus: (
    weekNumber: number,
    dayNumber: number,
    status: "pending" | "in_progress" | "completed"
  ) => void;
};

export default function RoadmapMonthSection({
  monthNumber,
  weeks,
  selectedWeek,
  onSelectWeek,
  onUpdateDayStatus,
}: RoadmapMonthSectionProps) {
  return (
    <section className={cn(panelClass, "p-5 sm:p-6")}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="font-display text-3xl tracking-[0.08em] text-[var(--cream)]">
          Month {monthNumber}
        </h2>
        <StatusBadge tone="ice">
          {weeks.length} week{weeks.length === 1 ? "" : "s"}
        </StatusBadge>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {weeks.map((week) => (
          <RoadmapWeekCard
            key={week.week_number}
            week={week}
            isSelected={week.week_number === selectedWeek}
            onSelect={onSelectWeek}
            onUpdateDayStatus={onUpdateDayStatus}
          />
        ))}
      </div>
    </section>
  );
}
