"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import WeaknessBar from "@/components/student/WeaknessBar";
import type { TopicSummary } from "@/store/dashboardStore";
import {
  type TopicComparison,
  type TopicWeaknessSnapshot,
  useQuizStore,
} from "@/store/quizStore";

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

export default function QuizResultPage() {
  const params = useParams<{ attemptId: string }>();
  const latestResult = useQuizStore((state) => state.latestResult);

  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const attemptId = Array.isArray(params.attemptId)
    ? params.attemptId[0]
    : params.attemptId;

  const result = useMemo(() => {
    if (!latestResult || !attemptId) {
      return null;
    }

    if (latestResult.attempt_id !== attemptId) {
      return null;
    }

    return latestResult;
  }, [attemptId, latestResult]);

  if (!isHydrated) {
    return <LoadingSpinner message="Loading quiz results..." />;
  }

  if (!result) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <EmptyState
          icon="📊"
          title="Result snapshot unavailable"
          description="This attempt is not in local quiz state. Take another quiz to view a complete result breakdown."
          ctaLabel="Take Adaptive Quiz"
          ctaHref="/quiz/adaptive"
        />
      </main>
    );
  }

  const topicScores = Object.entries(result.topic_scores ?? {});
  const topicComparisons = result.topic_comparisons ?? [];

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
      <header className="rounded-2xl border border-slate-800 bg-linear-to-r from-slate-900 to-indigo-950 p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
          Attempt {result.attempt_id.slice(0, 8)}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white">Quiz Result</h1>
        <p className="mt-2 text-sm text-slate-300">
          You scored {result.score.toFixed(1)}% with {result.correct_count} correct answers.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Score</p>
          <p className="mt-2 text-3xl font-bold text-indigo-300">
            {result.score.toFixed(1)}%
          </p>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Correct</p>
          <p className="mt-2 text-3xl font-bold text-emerald-300">
            {result.correct_count}
          </p>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Total Questions</p>
          <p className="mt-2 text-3xl font-bold text-slate-200">
            {result.total_questions}
          </p>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <h2 className="text-lg font-semibold text-white">Per-Topic Performance</h2>
        {topicScores.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {topicScores.map(([topicName, score]) => (
              <li
                key={topicName}
                className="flex items-center justify-between rounded-lg border border-slate-700/70 px-3 py-2"
              >
                <p className="text-sm text-slate-100">{topicName}</p>
                <span className="rounded-full bg-indigo-500/20 px-2 py-1 text-xs font-semibold text-indigo-200">
                  {score.toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-400">No topic score breakdown was returned for this attempt.</p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Weakness Change (Before vs After)</h2>

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
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold text-white">{comparison.topic_name}</p>
                    <p className="text-xs text-slate-400">{comparison.subject_name}</p>
                  </div>
                  <span className="rounded-full bg-sky-500/15 px-2.5 py-1 text-xs font-semibold text-sky-200">
                    Quiz score: {comparison.topic_score_pct.toFixed(1)}%
                  </span>
                </div>

                {delta !== null ? (
                  <p
                    className={`mb-3 text-xs font-semibold ${
                      delta < 0
                        ? "text-emerald-300"
                        : delta > 0
                          ? "text-rose-300"
                          : "text-slate-300"
                    }`}
                  >
                    {delta < 0
                      ? `Improved by ${Math.abs(delta).toFixed(1)} weakness points`
                      : delta > 0
                        ? `Weakness increased by ${delta.toFixed(1)} points`
                        : "No weakness change"}
                  </p>
                ) : (
                  <p className="mb-3 text-xs text-slate-400">
                    Before/after comparison is partial for this topic.
                  </p>
                )}

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Before Quiz
                    </p>
                    <WeaknessBar topic={beforeSummary} />
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                      After Quiz
                    </p>
                    <WeaknessBar topic={afterSummary} />
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <p className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-400">
            Weakness comparison data is not available yet. Take another quiz to generate richer progression insights.
          </p>
        )}
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/dashboard"
          className="rounded-xl border border-indigo-500/40 bg-indigo-500/15 px-4 py-3 text-center text-sm font-semibold text-indigo-100 transition hover:bg-indigo-500/25"
        >
          Go to Dashboard
        </Link>
        <Link
          href="/quiz/adaptive"
          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-center text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
        >
          Take Another Quiz
        </Link>
      </section>
    </main>
  );
}
