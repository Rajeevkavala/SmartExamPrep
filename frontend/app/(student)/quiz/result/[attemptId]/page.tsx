"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import {
  fireButtonClass,
  ghostButtonClass,
  MetricCard,
  PageHeader,
  panelClass,
  StatusBadge,
} from "@/components/shared/brand-ui";
import WeaknessBar from "@/components/student/WeaknessBar";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { TopicSummary } from "@/store/dashboardStore";
import {
  type QuizContextPayload,
  type QuizResultSnapshot,
  type TopicComparison,
  type TopicWeaknessSnapshot,
  useQuizStore,
} from "@/store/quizStore";

type AttemptResultResponse = {
  attempt_id: string;
  quiz_type: string;
  score: number;
  correct_count: number;
  total_questions: number;
  topic_scores: Record<string, number>;
  topic_comparisons?: TopicComparison[];
  readiness_before?: number | null;
  readiness_after?: number | null;
  context_payload?: QuizContextPayload | null;
  submitted_at?: string | null;
  analysis_updated_at?: string | null;
  result_metadata?: Record<string, unknown>;
};

const toTopicSummary = (
  snapshot: TopicWeaknessSnapshot,
  totalAttempts = 0
): TopicSummary => ({
  topic_id: snapshot.topic_id,
  topic_name: snapshot.topic_name,
  subject_name: snapshot.subject_name,
  weakness_score: snapshot.weakness_score,
  mastery_level: snapshot.mastery_level,
  accuracy: snapshot.accuracy,
  total_attempts: totalAttempts,
});

const createFallbackSummary = (
  comparison: TopicComparison,
  variant: "before" | "after"
): TopicSummary => ({
  topic_id: `${comparison.topic_id}-${variant}`,
  topic_name: comparison.topic_name,
  subject_name: comparison.subject_name,
  weakness_score: 50,
  mastery_level: "Moderate",
  accuracy: 0,
  total_attempts: 0,
});

const normalizeResult = (result: AttemptResultResponse): QuizResultSnapshot => ({
  attempt_id: result.attempt_id,
  quiz_type: result.quiz_type,
  score: result.score,
  correct_count: result.correct_count,
  total_questions: result.total_questions,
  topic_scores: result.topic_scores ?? {},
  topic_comparisons: result.topic_comparisons ?? [],
  readiness_before: result.readiness_before ?? null,
  readiness_after: result.readiness_after ?? null,
  context_payload: result.context_payload ?? null,
  submitted_at: result.submitted_at ?? new Date().toISOString(),
  analysis_updated_at: result.analysis_updated_at ?? null,
  result_metadata: result.result_metadata ?? {},
});

const formatDateTime = (value: string | undefined): string | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
};

export default function QuizResultPage() {
  const params = useParams<{ attemptId: string }>();
  const latestResult = useQuizStore((state) => state.latestResult);
  const setLatestResult = useQuizStore((state) => state.setLatestResult);

  const [result, setResult] = useState<QuizResultSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const attemptId = Array.isArray(params.attemptId)
    ? params.attemptId[0]
    : params.attemptId;

  useEffect(() => {
    let cancelled = false;

    const loadResult = async () => {
      if (!attemptId) {
        setResult(null);
        setIsLoading(false);
        return;
      }

      if (latestResult?.attempt_id === attemptId) {
        setResult(latestResult);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      try {
        const { data } = await api.get<AttemptResultResponse>(`/quiz/attempts/${attemptId}`);
        const normalized = normalizeResult(data);

        if (cancelled) {
          return;
        }

        setResult(normalized);
        setLatestResult(normalized);
      } catch (error) {
        const message =
          (error as { response?: { data?: { detail?: string } } }).response?.data
            ?.detail ?? "Unable to load this quiz result right now.";
        if (!cancelled) {
          setLoadError(message);
          setResult(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadResult();

    return () => {
      cancelled = true;
    };
  }, [attemptId, latestResult, setLatestResult]);

  const isPyqResult =
    result?.quiz_type === "pyq_practice" || result?.context_payload?.source === "pyq_browser";
  const isPlannerResult = result?.context_payload?.source === "daily_planner";
  const heading = isPyqResult ? "PYQ Practice Result" : "Quiz Result";
  const submittedAtLabel = formatDateTime(result?.submitted_at);
  const analysisUpdatedAtLabel = formatDateTime(result?.analysis_updated_at ?? undefined);
  const masteryRecordsUpdated = Number(result?.result_metadata?.mastery_records_updated ?? 0);

  const contextBadges = useMemo(() => {
    const filtersValue = result?.context_payload?.filters;
    if (!filtersValue || typeof filtersValue !== "object") {
      return [] as string[];
    }

    const filters = filtersValue as Record<string, unknown>;
    const badges: string[] = [];

    if (typeof filters.subject_name === "string" && filters.subject_name) {
      badges.push(`Subject: ${filters.subject_name}`);
    }
    if (typeof filters.topic_name === "string" && filters.topic_name) {
      badges.push(`Topic: ${filters.topic_name}`);
    }
    if (typeof filters.difficulty === "string" && filters.difficulty) {
      badges.push(`Difficulty: ${filters.difficulty}`);
    }
    if (typeof filters.year_from === "number") {
      badges.push(`Year from: ${filters.year_from}`);
    }
    if (typeof filters.year_to === "number") {
      badges.push(`Year to: ${filters.year_to}`);
    }

    return badges;
  }, [result?.context_payload]);

  const readinessDelta = useMemo(() => {
    if (
      typeof result?.readiness_before !== "number" ||
      typeof result?.readiness_after !== "number"
    ) {
      return null;
    }

    return result.readiness_after - result.readiness_before;
  }, [result?.readiness_after, result?.readiness_before]);

  if (isLoading) {
    return <LoadingSpinner message="Loading quiz results..." />;
  }

  if (loadError) {
    return (
      <main>
        <EmptyState
          icon="!"
          title="Result snapshot unavailable"
          description={loadError}
          ctaLabel="Take Adaptive Quiz"
          ctaHref="/quiz/adaptive"
        />
      </main>
    );
  }

  if (!result) {
    return (
      <main>
        <EmptyState
          icon="?"
          title="Result snapshot unavailable"
          description="This attempt could not be found in local or persisted quiz state."
          ctaLabel="Take Adaptive Quiz"
          ctaHref="/quiz/adaptive"
        />
      </main>
    );
  }

  const topicScores = Object.entries(result.topic_scores ?? {});
  const topicComparisons = result.topic_comparisons ?? [];

  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow={`Attempt ${result.attempt_id.slice(0, 8)}`}
        title={heading}
        description={`You scored ${result.score.toFixed(1)}% with ${result.correct_count} correct answers out of ${result.total_questions}.`}
        badge={
          <div className="flex max-w-xl flex-wrap gap-2">
            <StatusBadge tone={isPyqResult ? "ice" : "fire"}>
              {result.quiz_type.replaceAll("_", " ")}
            </StatusBadge>
            {submittedAtLabel ? <StatusBadge tone="neutral">{submittedAtLabel}</StatusBadge> : null}
            {analysisUpdatedAtLabel ? (
              <StatusBadge tone="ice">Analysis {analysisUpdatedAtLabel}</StatusBadge>
            ) : null}
            {isPlannerResult ? <StatusBadge tone="warning">Planner-linked</StatusBadge> : null}
          </div>
        }
      />

      {contextBadges.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {contextBadges.map((badge) => (
            <StatusBadge key={badge} tone="ice">
              {badge}
            </StatusBadge>
          ))}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Score"
          value={`${result.score.toFixed(1)}%`}
          helper="Attempt accuracy"
          tone={isPyqResult ? "ice" : "fire"}
        />
        <MetricCard
          label="Correct"
          value={`${result.correct_count}/${result.total_questions}`}
          helper="Questions solved correctly"
          tone="success"
        />
        <MetricCard
          label="Readiness before"
          value={
            typeof result.readiness_before === "number"
              ? `${result.readiness_before.toFixed(1)}%`
              : "--"
          }
          helper="State before this attempt"
          tone="warning"
        />
        <MetricCard
          label="Readiness after"
          value={
            typeof result.readiness_after === "number"
              ? `${result.readiness_after.toFixed(1)}%`
              : "--"
          }
          helper={
            readinessDelta === null
              ? "No delta captured"
              : readinessDelta >= 0
                ? `+${readinessDelta.toFixed(1)} pts`
                : `${readinessDelta.toFixed(1)} pts`
          }
          tone={readinessDelta !== null && readinessDelta >= 0 ? "success" : "neutral"}
        />
      </section>

      <section className={cn(panelClass, "p-6")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-4xl tracking-[0.08em] text-[var(--cream)]">
            Result Provenance
          </h2>
          <StatusBadge tone="neutral">
            {masteryRecordsUpdated} mastery record{masteryRecordsUpdated === 1 ? "" : "s"} updated
          </StatusBadge>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-[22px] border border-white/8 bg-white/4 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[rgba(194,186,176,0.56)]">
              Analysis refresh
            </p>
            <p className="mt-3 text-sm text-[var(--cream)]">
              {analysisUpdatedAtLabel ?? "Analysis timestamp unavailable"}
            </p>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-white/4 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[rgba(194,186,176,0.56)]">
              Planner sync
            </p>
            <p className="mt-3 text-sm text-[var(--cream)]">
              {result.result_metadata?.planner_task_completed ? "Planner task completed" : "No planner task linked"}
            </p>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-white/4 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[rgba(194,186,176,0.56)]">
              Mock session sync
            </p>
            <p className="mt-3 text-sm text-[var(--cream)]">
              {result.result_metadata?.mock_session_completed ? "Mock session marked complete" : "No mock session linked"}
            </p>
          </div>
        </div>
      </section>

      <section className={cn(panelClass, "p-6")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-4xl tracking-[0.08em] text-[var(--cream)]">
            Per-Topic Performance
          </h2>
          <StatusBadge tone="fire">{topicScores.length} topics</StatusBadge>
        </div>

        {topicScores.length > 0 ? (
          <div className="mt-6 space-y-3">
            {topicScores.map(([topicName, score]) => (
              <div
                key={topicName}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-white/8 bg-white/4 px-4 py-4"
              >
                <div>
                  <p className="text-base font-medium text-[var(--cream)]">{topicName}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.22em] text-[rgba(194,186,176,0.56)]">
                    Topic performance
                  </p>
                </div>
                <StatusBadge tone={score >= 70 ? "success" : score >= 50 ? "warning" : "fire"}>
                  {score.toFixed(1)}%
                </StatusBadge>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-[rgba(194,186,176,0.72)]">
            No topic score breakdown was returned for this attempt.
          </p>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-4xl tracking-[0.08em] text-[var(--cream)]">
            Weakness Change (Before vs After)
          </h2>
          {readinessDelta !== null ? (
            <StatusBadge tone={readinessDelta >= 0 ? "success" : "warning"}>
              {readinessDelta >= 0 ? "+" : ""}
              {readinessDelta.toFixed(1)} readiness pts
            </StatusBadge>
          ) : null}
        </div>

        {topicComparisons.length > 0 ? (
          topicComparisons.map((comparison) => {
            const beforeSummary = comparison.before
              ? toTopicSummary(comparison.before)
              : createFallbackSummary(comparison, "before");
            const afterSummary = comparison.after
              ? toTopicSummary(comparison.after)
              : createFallbackSummary(comparison, "after");

            const hasDelta = Boolean(comparison.before && comparison.after);
            const delta = hasDelta
              ? afterSummary.weakness_score - beforeSummary.weakness_score
              : null;

            return (
              <article
                key={`${comparison.topic_id}-${comparison.topic_name}`}
                className={cn(panelClass, "p-6")}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xl font-medium text-[var(--cream)]">
                      {comparison.topic_name}
                    </p>
                    <p className="mt-1 text-sm text-[rgba(194,186,176,0.66)]">
                      {comparison.subject_name || "General"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge tone="ice">
                      Quiz score: {comparison.topic_score_pct.toFixed(1)}%
                    </StatusBadge>
                    {delta !== null ? (
                      <StatusBadge tone={delta <= 0 ? "success" : "warning"}>
                        {delta < 0
                          ? `Improved ${Math.abs(delta).toFixed(1)}`
                          : delta > 0
                            ? `Increased ${delta.toFixed(1)}`
                            : "No change"}
                      </StatusBadge>
                    ) : null}
                  </div>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <div>
                    <p className="mb-3 text-xs uppercase tracking-[0.24em] text-[rgba(194,186,176,0.56)]">
                      Before Quiz
                    </p>
                    <WeaknessBar topic={beforeSummary} />
                  </div>
                  <div>
                    <p className="mb-3 text-xs uppercase tracking-[0.24em] text-[rgba(194,186,176,0.56)]">
                      After Quiz
                    </p>
                    <WeaknessBar topic={afterSummary} />
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className={cn(panelClass, "p-6")}>
            <p className="text-sm leading-7 text-[rgba(194,186,176,0.72)]">
              Weakness comparison data is not available yet. Take another attempt to generate a fuller before-versus-after story.
            </p>
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        {isPyqResult ? (
          <Link href="/pyq" className={ghostButtonClass}>
            Back to PYQ Browser
          </Link>
        ) : isPlannerResult ? (
          <Link href="/planner" className={ghostButtonClass}>
            Back to Planner
          </Link>
        ) : (
          <Link href="/dashboard" className={ghostButtonClass}>
            Back to Dashboard
          </Link>
        )}
        <Link href="/quiz/adaptive" className={fireButtonClass}>
          Take Another Quiz
        </Link>
      </div>
    </main>
  );
}
