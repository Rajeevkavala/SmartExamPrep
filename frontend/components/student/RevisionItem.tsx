"use client";

export type RevisionPlanItem = {
  topic_id: string;
  topic_name: string;
  subject_name: string;
  due_date: string | null;
  interval_days: number;
  last_score_pct: number;
};

type RevisionItemProps = {
  item: RevisionPlanItem;
  onMarkDone: (topicId: string) => void | Promise<void>;
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
    <article className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-white">{item.topic_name}</h3>
        <p className="text-sm text-slate-300">{item.subject_name}</p>
        <p className={`text-xs ${isOverdue ? "text-rose-300" : "text-slate-400"}`}>
          Due: {formatDueDate(item.due_date)}
        </p>
        <p className="text-xs text-slate-400">
          Last score: {Math.round(item.last_score_pct)}% • Interval: {item.interval_days} days
        </p>
      </div>

      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => onMarkDone(item.topic_id)}
        className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Updating..." : "Mark Done ✓"}
      </button>
    </article>
  );
}
