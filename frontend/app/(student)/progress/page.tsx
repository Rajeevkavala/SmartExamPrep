"use client";

import { Download } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { TopicProgressItem, TopicSummary } from "@/store/dashboardStore";

function MiniRing({ value }: { value: number }) {
  const safe = Math.max(0, Math.min(100, value));
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safe / 100) * circumference;

  return (
    <div className="relative h-16 w-16">
      <svg viewBox="0 0 80 80" className="h-16 w-16 -rotate-90">
        <circle
          cx="40"
          cy="40"
          r={radius}
          stroke="rgba(240,232,218,0.12)"
          strokeWidth="6"
          fill="none"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          stroke="var(--fire)"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-[var(--cream)]">
        {Math.round(safe)}%
      </span>
    </div>
  );
}

type ReadinessTrendPoint = {
  label: string;
  readiness_score: number;
  recorded_at: string;
};

type HeatmapCell = {
  date: string;
  minutes: number;
  questions_solved: number;
  intensity: number;
};

type MetricsPayload = {
  study_streak_days: number;
  longest_streak_days: number;
  readiness_score_current: number;
  planner_completion_pct_today: number;
  daily_goal_minutes: number;
  readiness_score_trend: ReadinessTrendPoint[];
  activity_heatmap: HeatmapCell[];
  ai_insight?: string | null;
};

type DashboardPayload = {
  topic_progress: TopicProgressItem[];
  weakest_topics: TopicSummary[];
};

const formatAccuracyPercent = (value: number) => {
  if (value <= 1) {
    return Math.round(value * 100);
  }
  return Math.round(value);
};

function TrendChart({ points }: { points: ReadinessTrendPoint[] }) {
  const normalized =
    points.length > 0
      ? points
      : [{ label: "Today", readiness_score: 0, recorded_at: new Date().toISOString() }];
  const max = Math.max(...normalized.map((point) => point.readiness_score), 100);
  const min = Math.min(...normalized.map((point) => point.readiness_score), 0);
  const span = Math.max(max - min, 1);

  const path = normalized
    .map((point, index) => {
      const x = (index / Math.max(normalized.length - 1, 1)) * 100;
      const y = 100 - ((point.readiness_score - min) / span) * 100;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" className="h-52 w-full">
      <path
        d={path}
        fill="none"
        stroke="#f15151"
        strokeWidth="1.4"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default function ProgressPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [partialWarning, setPartialWarning] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<MetricsPayload | null>(null);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        setLoadError(null);
        setPartialWarning(null);

        const [metricsResult, dashboardResult] = await Promise.allSettled([
          api.get<MetricsPayload>("/analysis/metrics"),
          api.get<DashboardPayload>("/analysis/dashboard"),
        ]);

        if (cancelled) {
          return;
        }

        if (metricsResult.status === "fulfilled") {
          setMetrics(metricsResult.value.data);
        }

        if (dashboardResult.status === "fulfilled") {
          setDashboard(dashboardResult.value.data);
        }

        if (
          metricsResult.status === "rejected" &&
          dashboardResult.status === "rejected"
        ) {
          const metricsErrorMessage =
            (metricsResult.reason as { response?: { data?: { detail?: string } } })?.response
              ?.data?.detail ?? null;
          const dashboardErrorMessage =
            (dashboardResult.reason as { response?: { data?: { detail?: string } } })?.response
              ?.data?.detail ?? null;

          setLoadError(
            metricsErrorMessage ??
              dashboardErrorMessage ??
              "Unable to load progress analytics right now."
          );
          return;
        }

        if (metricsResult.status === "rejected" || dashboardResult.status === "rejected") {
          setPartialWarning(
            "Some analytics modules could not be loaded. Partial data is shown."
          );
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message =
          (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
          "Unable to load progress analytics right now.";
        setLoadError(message);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const heatmapCells = useMemo(() => metrics?.activity_heatmap ?? [], [metrics?.activity_heatmap]);

  if (isLoading) {
    return <LoadingSpinner message="Loading progress dashboard..." />;
  }

  if (loadError) {
    return (
      <main>
        <EmptyState
          icon="!"
          title="Progress dashboard unavailable"
          description={loadError}
          ctaLabel="Return to dashboard"
          ctaHref="/dashboard"
        />
      </main>
    );
  }

  const topicProgress = dashboard?.topic_progress ?? [];
  const weakestTopics = (dashboard?.weakest_topics ?? []).slice(0, 5);
  const readiness = Math.round(metrics?.readiness_score_current ?? 0);
  const studyStreak = metrics?.study_streak_days ?? 0;
  const longestStreak = metrics?.longest_streak_days ?? 0;
  const dailyGoal = Math.round(metrics?.planner_completion_pct_today ?? 0);
  const dailyGoalMinutes = Math.max(30, metrics?.daily_goal_minutes ?? 60);
  const dailyMinutesDone = Math.round((dailyGoal / 100) * dailyGoalMinutes);

  return (
    <main className="space-y-5">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <header className="space-y-2">
          <h1 className="font-display text-[3rem] leading-none tracking-[0.03em] text-[var(--cream)] md:text-[3.8rem]">
            PROGRESS DASHBOARD
          </h1>
          <p className="text-xl text-[rgba(194,186,176,0.72)]">
            Live analytics for mastery, streaks, and performance trends.
          </p>
        </header>

        <button
          type="button"
          onClick={() => {
            const report = JSON.stringify({ metrics, dashboard }, null, 2);
            const blob = new Blob([report], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = "smartexamprep-progress-report.json";
            anchor.click();
            URL.revokeObjectURL(url);
          }}
          className="inline-flex h-11 items-center gap-2 border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.02)] px-4 text-sm text-[var(--cream)]"
        >
          <Download className="h-4 w-4" />
          Download Report
        </button>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        {partialWarning ? (
          <article className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-4 lg:col-span-3">
            <p className="text-sm text-[rgba(194,186,176,0.74)]">{partialWarning}</p>
          </article>
        ) : null}

        <article className="flex items-start justify-between border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-4">
          <div>
            <p className="text-sm text-[rgba(194,186,176,0.68)]">Mastery Ring</p>
            <p className="mt-2 text-4xl font-semibold text-[var(--cream)]">{readiness}%</p>
          </div>
          <MiniRing value={readiness} />
        </article>

        <article className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-4">
          <p className="text-sm text-[rgba(194,186,176,0.68)]">Study Streak</p>
          <p className="mt-2 text-4xl font-semibold text-[var(--fire)]">{studyStreak} DAYS</p>
          <p className="mt-1 text-sm text-[rgba(194,186,176,0.58)]">
            Longest: {longestStreak} days
          </p>
        </article>

        <article className="flex items-start justify-between border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-4">
          <div>
            <p className="text-sm text-[rgba(194,186,176,0.68)]">Daily Goal</p>
            <p className="mt-2 text-4xl font-semibold text-[var(--cream)]">
              {dailyMinutesDone}/{dailyGoalMinutes}
            </p>
            <p className="mt-1 text-sm text-[rgba(194,186,176,0.58)]">minutes today</p>
          </div>
          <MiniRing value={dailyGoal} />
        </article>
      </section>

      <section className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-4">
        <h2 className="text-3xl font-semibold text-[var(--cream)]">Topic Mastery</h2>
        <div className="mt-4 space-y-3">
          {topicProgress.slice(0, 10).map((topic) => (
            <div key={topic.topic_id} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <p className="text-[var(--cream)]">{topic.topic_name}</p>
                <span className="text-[rgba(194,186,176,0.58)]">
                  {Math.round(topic.accuracy_pct)}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-[rgba(255,255,255,0.08)]">
                <div
                  className="h-1.5 bg-[var(--fire)]"
                  style={{ width: `${Math.max(0, Math.min(100, topic.accuracy_pct))}%` }}
                />
              </div>
            </div>
          ))}

          {topicProgress.length === 0 ? (
            <p className="text-sm text-[rgba(194,186,176,0.58)]">
              No topic progress available yet.
            </p>
          ) : null}
        </div>
      </section>

      <section className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-4">
        <h2 className="text-3xl font-semibold text-[var(--cream)]">Study Streak Heatmap</h2>
        <div className="mt-4 grid grid-cols-24 gap-1">
          {heatmapCells.map((cell) => (
            <span
              key={cell.date}
              title={`${cell.date}: ${cell.minutes} min, ${cell.questions_solved} questions`}
              className={cn(
                "h-2.5 w-2.5",
                cell.intensity >= 0.75
                  ? "bg-[var(--fire)]"
                  : cell.intensity >= 0.4
                    ? "bg-[rgba(232,82,10,0.4)]"
                    : cell.intensity > 0
                      ? "bg-[rgba(232,82,10,0.2)]"
                      : "bg-[rgba(255,255,255,0.08)]"
              )}
            />
          ))}
        </div>
        <p className="mt-3 text-sm text-[rgba(194,186,176,0.58)]">
          Built from real daily study activity.
        </p>
      </section>

      <section className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-4">
        <h2 className="text-3xl font-semibold text-[var(--cream)]">
          Performance Trend (Recent Attempts)
        </h2>
        <div className="mt-4 border border-[rgba(240,232,218,0.08)] p-4">
          <TrendChart points={metrics?.readiness_score_trend ?? []} />
        </div>
        <p className="mt-2 text-sm text-[rgba(194,186,176,0.58)]">
          Trend based on persisted readiness snapshots from submitted quizzes.
        </p>
      </section>

      <section className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-4">
        <h2 className="text-3xl font-semibold text-[var(--cream)]">Weak Areas</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {weakestTopics.map((topic) => (
            <article
              key={topic.topic_id}
              className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-4"
            >
              <p className="text-xl font-semibold text-[var(--cream)]">{topic.topic_name}</p>
              <p className="mt-2 text-sm text-[rgba(194,186,176,0.62)]">
                Mastery: {topic.mastery_level} · Accuracy {formatAccuracyPercent(topic.accuracy)}%
              </p>
              <p className="mt-1 text-sm text-[rgba(194,186,176,0.58)]">
                Weakness score: {Math.round(topic.weakness_score)}
              </p>
              <Link
                href="/pyq"
                className="mt-4 inline-flex h-10 items-center border border-[rgba(240,232,218,0.08)] px-4 text-sm text-[var(--cream)]"
              >
                Practice Now
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="border border-[rgba(0,212,255,0.45)] bg-[rgba(0,212,255,0.04)] p-4">
        <h2 className="text-2xl font-semibold text-[var(--cream)]">AI Insight</h2>
        <p className="mt-2 text-[var(--ice)]">
          {metrics?.ai_insight ??
            "Complete another adaptive quiz to unlock a fresh backend-driven study insight."}
        </p>
        <p className="mt-2 text-sm text-[rgba(194,186,176,0.58)]">
          Based on your recent activity and current weak-topic pattern.
        </p>
      </section>
    </main>
  );
}
