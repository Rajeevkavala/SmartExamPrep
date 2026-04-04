"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import NLPInsightCard from "@/components/student/NLPInsightCard";
import ReadinessGauge from "@/components/student/ReadinessGauge";
import WeaknessBar from "@/components/student/WeaknessBar";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { api } from "@/lib/api";
import { useDashboardStore } from "@/store/dashboardStore";

type ExplainResponse = {
  explanation?: string;
};

export default function DashboardPage() {
  const readinessScore = useDashboardStore((state) => state.readiness_score);
  const weakestTopics = useDashboardStore((state) => state.weakest_topics);
  const strongestTopics = useDashboardStore((state) => state.strongest_topics);
  const subjectsProgress = useDashboardStore((state) => state.subjects_progress);
  const nlpInsight = useDashboardStore((state) => state.nlp_insight);
  const setDashboard = useDashboardStore((state) => state.setDashboard);
  const setInsight = useDashboardStore((state) => state.setInsight);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        setLoadError(null);
        const { data } = await api.get("/analysis/dashboard");

        if (cancelled) {
          return;
        }

        setDashboard(data);

        const topWeakTopicId =
          data?.weakest_topics?.[0] && typeof data.weakest_topics[0].topic_id === "string"
            ? data.weakest_topics[0].topic_id
            : null;

        if (topWeakTopicId) {
          try {
            const explainResponse = await api.post<ExplainResponse>("/ai/explain", {
              topic_id: topWeakTopicId,
            });

            if (!cancelled && explainResponse.data.explanation) {
              setInsight(explainResponse.data.explanation);
            }
          } catch {
            // Ignore explain failures to keep dashboard usable.
          }
        }
      } catch (error) {
        const message =
          (error as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail ?? "Unable to load dashboard data right now.";

        if (!cancelled) {
          setLoadError(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [setDashboard, setInsight]);

  const topWeakTopics = useMemo(() => weakestTopics.slice(0, 3), [weakestTopics]);

  if (isLoading) {
    return <LoadingSpinner message="Loading your personalized dashboard..." />;
  }

  if (loadError) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <EmptyState
          icon="⚠"
          title="Dashboard unavailable"
          description={loadError}
          ctaLabel="Retry"
          ctaHref="/dashboard"
        />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <header className="rounded-2xl border border-slate-800 bg-linear-to-r from-slate-900 to-indigo-950 p-6">
        <h1 className="text-3xl font-bold text-white">Student Dashboard</h1>
        <p className="mt-2 text-sm text-slate-300">
          Track your current readiness and close weak areas faster.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">
            Overall Readiness
          </h2>
          <div className="mt-4 flex justify-center">
            <ReadinessGauge score={readinessScore} />
          </div>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">
            Weakest Topics
          </h2>
          <div className="mt-4 space-y-3">
            {topWeakTopics.length > 0 ? (
              topWeakTopics.map((topic) => (
                <WeaknessBar key={topic.topic_id} topic={topic} />
              ))
            ) : (
              <p className="text-sm text-slate-400">
                No weakness data yet. Take a diagnostic quiz to generate analysis.
              </p>
            )}
          </div>
        </article>
      </section>

      {nlpInsight ? <NLPInsightCard insight={nlpInsight} /> : null}

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">
            Subject Progress
          </h2>
          <div className="mt-4 space-y-4">
            {subjectsProgress.length > 0 ? (
              subjectsProgress.map((subject) => {
                const percent = Math.min(
                  Math.max(Math.round(subject.accuracy * 100), 0),
                  100
                );

                return (
                  <div key={subject.subject_name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <p className="text-slate-200">{subject.subject_name}</p>
                      <p className="text-slate-400">{percent}%</p>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-700">
                      <div
                        className="h-2 rounded-full bg-indigo-500 transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-400">No subject progress available.</p>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">
            Strongest Topics
          </h2>
          <ul className="mt-4 space-y-2">
            {strongestTopics.length > 0 ? (
              strongestTopics.slice(0, 3).map((topic) => (
                <li
                  key={topic.topic_id}
                  className="flex items-center justify-between rounded-lg border border-slate-700 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-100">{topic.topic_name}</p>
                    <p className="text-xs text-slate-400">{topic.subject_name}</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-300">
                    {(topic.accuracy * 100).toFixed(0)}%
                  </span>
                </li>
              ))
            ) : (
              <p className="text-sm text-slate-400">No strong topics identified yet.</p>
            )}
          </ul>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          href="/quiz/adaptive"
          className="rounded-xl border border-indigo-500/40 bg-indigo-500/20 px-4 py-3 text-center text-sm font-semibold text-indigo-100 transition hover:bg-indigo-500/30"
        >
          Take Adaptive Quiz
        </Link>
        <Link
          href="/revision"
          className="rounded-xl border border-sky-500/40 bg-sky-500/20 px-4 py-3 text-center text-sm font-semibold text-sky-100 transition hover:bg-sky-500/30"
        >
          Open Revision Plan
        </Link>
        <Link
          href="/quiz/diagnostic"
          className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-center text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
        >
          Retake Diagnostic
        </Link>
      </section>
    </main>
  );
}
