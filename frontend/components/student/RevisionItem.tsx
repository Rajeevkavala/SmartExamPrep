"use client";

import { CheckCircle2 } from "lucide-react";

import { insetPanelClass, StatusBadge } from "@/components/shared/brand-ui";
import { cn } from "@/lib/utils";

export type RevisionPlanItem = {
  schedule_id?: string;
  topic_id: string;
  topic_name: string;
  subject_name: string;
  due_date: string | null;
  interval_days: number;
  last_score_pct: number;
};

type RevisionItemProps = {
  item: RevisionPlanItem;
  onMarkDone: (item: RevisionPlanItem) => void | Promise<void>;
  isSubmitting?: boolean;
};

const formatDueDate = (dueDate: string | null): string => {
  if (!dueDate) {
    return "No due date";
  }

  const parsed = new Date(dueDate);
  if (Number.isNaN(parsed.getTime())) {
    return "No due date";
  }

  return parsed.toLocaleString();
};

export default function RevisionItem({
  item,
  onMarkDone,
  isSubmitting = false,
}: RevisionItemProps) {
  const dueDate = item.due_date ? new Date(item.due_date) : null;
  const isOverdue = dueDate ? dueDate.getTime() < Date.now() : false;

  return (
    <article className={cn(insetPanelClass, "flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between")}>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-lg font-medium text-[var(--cream)]">{item.topic_name}</p>
          <StatusBadge tone={isOverdue ? "fire" : "warning"}>
            {isOverdue ? "Due now" : `Interval ${item.interval_days}d`}
          </StatusBadge>
        </div>
        <p className="text-sm text-[rgba(194,186,176,0.72)]">{item.subject_name}</p>
        <p className="text-xs text-[rgba(194,186,176,0.58)]">Due: {formatDueDate(item.due_date)}</p>
        <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[rgba(194,186,176,0.58)]">
          Last score {Math.round(item.last_score_pct)}%
        </p>
      </div>

      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => onMarkDone(item)}
        className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 font-mono text-[0.62rem] uppercase tracking-[0.24em] text-emerald-200 disabled:opacity-50"
      >
        <CheckCircle2 className="h-4 w-4" />
        {isSubmitting ? "Updating..." : "Mark Done ✓"}
      </button>
    </article>
  );
}
