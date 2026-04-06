import {
  insetPanelClass,
  ProgressBar,
  StatusBadge,
} from "@/components/shared/brand-ui";
import type { TopicSummary } from "@/store/dashboardStore";
import { cn } from "@/lib/utils";

type WeaknessBarProps = {
  topic: TopicSummary;
};

export default function WeaknessBar({ topic }: WeaknessBarProps) {
  const weakness = Math.min(Math.max(topic.weakness_score, 0), 100);
  const tone =
    topic.mastery_level === "Strong"
      ? "success"
      : topic.mastery_level === "Weak"
        ? "fire"
        : "warning";

  return (
    <div className={cn(insetPanelClass, "space-y-4 p-4")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[var(--cream)]">{topic.topic_name}</p>
          <p className="mt-1 text-xs text-[rgba(194,186,176,0.62)]">{topic.subject_name}</p>
        </div>
        <div className="space-y-2 text-right">
          <StatusBadge tone={tone}>{topic.mastery_level}</StatusBadge>
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.24em] text-[rgba(194,186,176,0.62)]">
            {(topic.accuracy * 100).toFixed(0)}% accuracy
          </p>
        </div>
      </div>
      <ProgressBar value={weakness} tone={tone} />
      <div className="flex justify-between text-[0.62rem] uppercase tracking-[0.22em] text-[rgba(194,186,176,0.52)]">
        <span>Strong</span>
        <span>Weakness {Math.round(weakness)}</span>
        <span>Weak</span>
      </div>
    </div>
  );
}
