import { panelClass, StatusBadge } from "@/components/shared/brand-ui";
import type { TopicProgressItem } from "@/store/dashboardStore";
import { cn } from "@/lib/utils";

type TopicProgressTableProps = {
  items: TopicProgressItem[];
};

export default function TopicProgressTable({ items }: TopicProgressTableProps) {
  const rows = items.slice(0, 6);

  if (rows.length === 0) {
    return (
      <article className={cn(panelClass, "p-6")}>
        <p className="font-display text-3xl tracking-[0.08em] text-[var(--cream)]">
          Topic Progress
        </p>
        <p className="mt-4 text-sm leading-7 text-[rgba(194,186,176,0.72)]">
          Topic progress will appear after quiz attempts or planner activity.
        </p>
      </article>
    );
  }

  return (
    <article className={cn(panelClass, "p-6")}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-3xl tracking-[0.08em] text-[var(--cream)]">
          Topic Progress
        </p>
        <StatusBadge tone="ice">{rows.length} topics</StatusBadge>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-190 text-sm">
          <thead>
            <tr className="border-b border-white/8 text-left font-mono text-[0.6rem] uppercase tracking-[0.24em] text-[rgba(194,186,176,0.58)]">
              <th className="pb-3 pr-3">Topic</th>
              <th className="pb-3 pr-3">Subject</th>
              <th className="pb-3 pr-3">Mastery</th>
              <th className="pb-3 pr-3">Accuracy</th>
              <th className="pb-3 pr-3">Weakness</th>
              <th className="pb-3 pr-3">Minutes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.topic_id} className="border-b border-white/6 align-top text-[rgba(194,186,176,0.76)]">
                <td className="py-4 pr-3 font-medium text-[var(--cream)]">{item.topic_name}</td>
                <td className="py-4 pr-3">{item.subject_name}</td>
                <td className="py-4 pr-3">
                  <StatusBadge
                    tone={
                      item.mastery_level === "Strong"
                        ? "success"
                        : item.mastery_level === "Weak"
                          ? "fire"
                          : "warning"
                    }
                  >
                    {item.mastery_level}
                  </StatusBadge>
                </td>
                <td className="py-4 pr-3">{item.accuracy_pct.toFixed(0)}%</td>
                <td className="py-4 pr-3">{item.weakness_score.toFixed(1)}</td>
                <td className="py-4 pr-3">
                  {item.completed_minutes} / {item.planned_minutes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
