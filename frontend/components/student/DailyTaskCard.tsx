import Link from "next/link";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";

import { insetPanelClass, StatusBadge } from "@/components/shared/brand-ui";
import type { PlannerTaskItem, PlannerTaskStatus } from "@/store/plannerStore";
import { cn } from "@/lib/utils";

type DailyTaskCardProps = {
  task: PlannerTaskItem;
  isUpdating: boolean;
  onStatusChange: (
    taskId: string,
    nextStatus: PlannerTaskStatus
  ) => void | Promise<void>;
};

const sourceLabelMap: Record<string, string> = {
  roadmap: "Roadmap",
  revision_schedule: "Revision",
  adaptive_recommendation: "Adaptive",
  carry_forward: "Carry Forward",
  planner: "Planner",
};

const buildActionHref = (task: PlannerTaskItem): string | null => {
  if (task.task_type === "practice") {
    return `/quiz/adaptive?taskId=${encodeURIComponent(task.task_id)}&source=planner`;
  }

  if (task.task_type === "revision") {
    const scheduleId =
      typeof task.source_payload.revision_schedule_id === "string"
        ? task.source_payload.revision_schedule_id
        : null;
    const topicId = task.topic_id;

    const query = new URLSearchParams();
    query.set("taskId", task.task_id);
    if (topicId) {
      query.set("topicId", topicId);
    }
    if (scheduleId) {
      query.set("scheduleId", scheduleId);
    }

    return `/revision?${query.toString()}`;
  }

  if (task.source_type === "roadmap") {
    return "/roadmap";
  }

  if (task.resource_hint && task.resource_hint.startsWith("/")) {
    return task.resource_hint;
  }

  return null;
};

export default function DailyTaskCard({
  task,
  isUpdating,
  onStatusChange,
}: DailyTaskCardProps) {
  const nextStatus: PlannerTaskStatus =
    task.status === "completed" ? "pending" : "completed";
  const actionHref = buildActionHref(task);

  const statusTone =
    task.status === "completed"
      ? "success"
      : task.status === "in_progress"
        ? "ice"
        : task.status === "pending"
          ? "fire"
          : "neutral";

  return (
    <article className={cn(insetPanelClass, "space-y-4 p-5")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.24em] text-[rgba(194,186,176,0.58)]">
            {sourceLabelMap[task.source_type] ?? task.source_type}
          </p>
          <h3 className="mt-2 text-lg font-medium text-[var(--cream)]">{task.title}</h3>
          <p className="mt-2 text-sm leading-7 text-[rgba(194,186,176,0.72)]">
            {task.description || "No description available."}
          </p>
        </div>
        <StatusBadge tone={statusTone}>{task.status.replaceAll("_", " ")}</StatusBadge>
      </div>

      <div className="flex flex-wrap gap-2">
        {task.subject_name ? <StatusBadge tone="neutral">{task.subject_name}</StatusBadge> : null}
        {task.topic_name ? <StatusBadge tone="ice">{task.topic_name}</StatusBadge> : null}
        {typeof task.target_minutes === "number" ? (
          <StatusBadge tone="warning">{task.target_minutes} min</StatusBadge>
        ) : null}
        {typeof task.target_question_count === "number" ? (
          <StatusBadge tone="fire">{task.target_question_count} questions</StatusBadge>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onStatusChange(task.task_id, nextStatus)}
          disabled={isUpdating}
          className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 font-mono text-[0.62rem] uppercase tracking-[0.24em] text-emerald-200 disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" />
          {isUpdating
            ? "Updating..."
            : task.status === "completed"
              ? "Mark Pending"
              : "Mark Complete"}
        </button>

        {actionHref ? (
          <Link
            href={actionHref}
            className="inline-flex items-center gap-2 rounded-full border border-[rgba(0,212,255,0.22)] bg-[rgba(0,212,255,0.08)] px-4 py-2 font-mono text-[0.62rem] uppercase tracking-[0.24em] text-[var(--ice)]"
          >
            {task.task_type === "practice"
              ? "Start Practice"
              : task.task_type === "revision"
                ? "Open Revision"
                : "Open Resource"}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </article>
  );
}
