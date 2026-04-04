"use client";

import { useEffect, useState } from "react";

import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import RevisionItem, {
  type RevisionPlanItem,
} from "@/components/student/RevisionItem";
import { api } from "@/lib/api";

type RevisionPlanResponse = {
  revision_items: RevisionPlanItem[];
};

export default function RevisionPage() {
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

  const handleMarkDone = async (topicId: string) => {
    setActiveTopicId(topicId);
    setActionError(null);

    try {
      await api.post("/revision/mark-done", { topic_id: topicId });
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
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <EmptyState
          icon="⚠"
          title="Revision plan unavailable"
          description={loadError}
          ctaLabel="Retry"
          ctaHref="/revision"
        />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-5 px-4 py-8">
      <header className="rounded-2xl border border-slate-800 bg-linear-to-r from-slate-900 to-emerald-950 p-6">
        <h1 className="text-2xl font-bold text-white">Revision Plan</h1>
        <p className="mt-2 text-sm text-slate-300">
          Stay consistent with spaced repetition and clear due topics daily.
        </p>
      </header>

      {items.length === 0 ? (
        <EmptyState
          icon="🎉"
          title="🎉 All caught up!"
          description="No revisions are due right now. Keep the momentum going with an adaptive quiz."
          ctaLabel="Take Adaptive Quiz"
          ctaHref="/quiz/adaptive"
        />
      ) : (
        <section className="space-y-3">
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

      {actionError ? (
        <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
          {actionError}
        </p>
      ) : null}

      {isRefreshing ? (
        <p className="text-center text-xs text-slate-400">Refreshing revision plan...</p>
      ) : null}
    </main>
  );
}
