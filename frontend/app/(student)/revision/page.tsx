"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import RevisionItem, {
  type RevisionPlanItem,
} from "@/components/student/RevisionItem";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import {
  ghostButtonClass,
  PageHeader,
  StatusBadge,
} from "@/components/shared/brand-ui";
import { api } from "@/lib/api";

type RevisionPlanResponse = {
  revision_items: RevisionPlanItem[];
};

export default function RevisionPage() {
  const searchParams = useSearchParams();

  const linkedTaskId = searchParams.get("taskId");
  const linkedTopicId = searchParams.get("topicId");
  const linkedScheduleId = searchParams.get("scheduleId");

  const [items, setItems] = useState<RevisionPlanItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadPlan = async (showLoadingSpinner: boolean) => {
    if (showLoadingSpinner) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      setLoadError(null);
      const response = await api.get<RevisionPlanResponse>("/revision/plan");
      setItems(response.data.revision_items ?? []);
    } catch (error) {
      const message =
        (error as { response?: { data?: { detail?: string } } }).response?.data
          ?.detail ?? "Unable to load your revision plan right now.";
      setLoadError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadPlan(true);
  }, []);

  const dueNowCount = useMemo(
    () =>
      items.filter((item) => item.due_date && new Date(item.due_date).getTime() < Date.now())
        .length,
    [items]
  );
  const averageInterval = useMemo(() => {
    if (!items.length) {
      return 0;
    }
    return Math.round(
      items.reduce((sum, item) => sum + Number(item.interval_days ?? 0), 0) / items.length
    );
  }, [items]);

  const handleMarkDone = async (item: RevisionPlanItem) => {
    setActiveTopicId(item.topic_id);
    setActionError(null);

    const payload: {
      topic_id?: string;
      schedule_id?: string;
      daily_task_id?: string;
    } = {};

    if (item.schedule_id) {
      payload.schedule_id = item.schedule_id;
    } else {
      payload.topic_id = item.topic_id;
    }

    const isLinkedFromPlanner =
      Boolean(linkedTaskId) &&
      ((linkedScheduleId && item.schedule_id === linkedScheduleId) ||
        (linkedTopicId && item.topic_id === linkedTopicId));

    if (isLinkedFromPlanner && linkedTaskId) {
      payload.daily_task_id = linkedTaskId;
    }

    try {
      await api.post("/revision/mark-done", payload);
      await loadPlan(false);
    } catch (error) {
      const message =
        (error as { response?: { data?: { detail?: string } } }).response?.data
          ?.detail ?? "Unable to mark this revision item as done.";
      setActionError(message);
    } finally {
      setActiveTopicId(null);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading revision plan..." />;
  }

  if (loadError) {
    return (
      <main>
        <EmptyState
          icon="!"
          title="Revision plan unavailable"
          description={loadError}
          ctaLabel="Retry"
          ctaHref="/revision"
        />
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="Revision queue"
        title="Revision Plan"
        description="Stay consistent with spaced repetition and keep retention steady across the entire syllabus."
        badge={
          <div className="flex flex-wrap gap-3">
            <StatusBadge tone="fire">{dueNowCount} due now</StatusBadge>
            <StatusBadge tone="ice">{items.length} items</StatusBadge>
          </div>
        }
        actions={
          <Link href="/planner" className={ghostButtonClass}>
            Open daily planner
          </Link>
        }
      />

      {linkedTaskId ? (
        <p className="text-sm text-[rgba(194,186,176,0.72)]">
          This revision was opened from your daily planner. Marking it done also updates the linked task.
        </p>
      ) : null}

      <section className="grid gap-3 md:grid-cols-3">
        <article className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-4">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[rgba(194,186,176,0.58)]">Due now</p>
          <p className="mt-3 text-3xl font-semibold text-[var(--cream)]">{dueNowCount}</p>
        </article>
        <article className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-4">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[rgba(194,186,176,0.58)]">Average interval</p>
          <p className="mt-3 text-3xl font-semibold text-[var(--cream)]">{averageInterval}d</p>
        </article>
        <article className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-4">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[rgba(194,186,176,0.58)]">Prioritization rule</p>
          <p className="mt-3 text-sm leading-7 text-[rgba(194,186,176,0.74)]">
            Earliest due items surface first so missed reviews and weak scores do not drift out of the loop.
          </p>
        </article>
      </section>

      {items.length === 0 ? (
        <EmptyState
          icon="*"
          title="🎉 All caught up!"
          description="No revisions are due right now. Keep momentum moving with an adaptive quiz."
          ctaLabel="Take adaptive quiz"
          ctaHref="/quiz/adaptive"
        />
      ) : (
        <section className="space-y-4">
          {items.map((item) => (
            <RevisionItem
              key={item.topic_id}
              item={item}
              isSubmitting={activeTopicId === item.topic_id}
              onMarkDone={handleMarkDone}
            />
          ))}
        </section>
      )}

      {actionError ? <p className="text-sm text-rose-200">{actionError}</p> : null}
      {isRefreshing ? (
        <p className="text-xs uppercase tracking-[0.22em] text-[rgba(194,186,176,0.58)]">
          Refreshing revision plan...
        </p>
      ) : null}
    </main>
  );
}
