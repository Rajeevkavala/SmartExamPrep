import { Flame } from "lucide-react";

import {
  insetPanelClass,
  MetricCard,
  StatusBadge,
} from "@/components/shared/brand-ui";
import { cn } from "@/lib/utils";

type StudyStreakCardProps = {
  streakDays: number;
  activityEventsToday: number;
};

export default function StudyStreakCard({
  streakDays,
  activityEventsToday,
}: StudyStreakCardProps) {
  const safeStreak = Math.max(0, Math.floor(streakDays));

  return (
    <MetricCard
      label="Study streak"
      value={`${safeStreak}d`}
      tone="warning"
      helper={
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <span
                key={index}
                className={cn(
                  "h-3 w-3 rounded-full border",
                  index < Math.min(safeStreak, 7)
                    ? "border-[rgba(232,82,10,0.28)] bg-[var(--fire)]"
                    : "border-white/10 bg-white/5"
                )}
              />
            ))}
          </div>
          <div className={cn(insetPanelClass, "flex items-center justify-between px-3 py-2")}>
            <span className="inline-flex items-center gap-2 text-sm text-[var(--cream)]">
              <Flame className="h-4 w-4 text-[var(--fire)]" />
              Today&apos;s activity
            </span>
            <StatusBadge tone="warning">{activityEventsToday} events</StatusBadge>
          </div>
        </div>
      }
    />
  );
}
