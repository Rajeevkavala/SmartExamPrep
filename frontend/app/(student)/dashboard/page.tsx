"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Brain,
  Clock3,
  Flame,
  ListChecks,
  Target,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useDashboardStore } from "@/store/dashboardStore";

export default function DashboardPage() {
  const readinessScore = useDashboardStore((state) => state.readiness_score);
  const topicProgress = useDashboardStore((state) => state.topic_progress);
  const quickActions = useDashboardStore((state) => state.quick_actions);
  const studyStreakDays = useDashboardStore((state) => state.study_streak_days);
  const studyStreakDelta = useDashboardStore(
    (state) => state.study_streak_delta_vs_last_week
  );
  const questionsSolvedToday = useDashboardStore((state) => state.questions_solved_today);
  const questionsGoalToday = useDashboardStore((state) => state.questions_goal_today);
  const hoursStudiedTotal = useDashboardStore((state) => state.hours_studied_total);
  const questionsSolvedTotal = useDashboardStore((state) => state.questions_solved_total);
  const accuracyDeltaVsYesterday = useDashboardStore(
    (state) => state.accuracy_delta_vs_yesterday
  );
  const statusBadgeLabel = useDashboardStore((state) => state.status_badge_label);
  const roadmapProgressPct = useDashboardStore((state) => state.roadmap_progress_pct);
  const roadmapCurrentWeek = useDashboardStore((state) => state.roadmap_current_week);
  const nlpInsight = useDashboardStore((state) => state.nlp_insight);
  const setDashboard = useDashboardStore((state) => state.setDashboard);

  const user = useAuthStore((state) => state.user);

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
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message =
          (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
          "Unable to load dashboard data right now.";
        setLoadError(message);
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
  }, [setDashboard]);

  const topTopics = useMemo(() => topicProgress.slice(0, 4), [topicProgress]);

  const actions = useMemo(() => {
    return quickActions.slice(0, 4);
  }, [quickActions]);

  if (isLoading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  if (loadError) {
    return (
      <main>
        <EmptyState
          icon="!"
          title="Dashboard unavailable"
          description={loadError}
          ctaLabel="Retry"
          ctaHref="/dashboard"
        />
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <header className="space-y-2">
          <h1 className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-[rgba(194,186,176,0.58)]">Student Dashboard</h1>
          <h2 className="font-display text-[3.2rem] leading-none tracking-[0.03em] text-[var(--cream)] md:text-[4.2rem]">
            WELCOME BACK,
            <span className="ml-2 text-[var(--fire)]">{user?.full_name?.toUpperCase() ?? "STUDENT"}</span>
          </h2>
          <p className="text-lg text-[rgba(194,186,176,0.74)] sm:text-xl">Continue your exam preparation journey</p>
        </header>

        <span className="inline-flex h-10 items-center rounded-full border border-[rgba(232,82,10,0.35)] bg-[rgba(232,82,10,0.1)] px-4 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[var(--fire)]">
          {statusBadgeLabel}
        </span>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="flex items-start justify-between gap-3 border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-5">
          <div>
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-[rgba(194,186,176,0.58)]">Study Streak</p>
            <p className="mt-3 text-[3rem] font-semibold leading-none text-[var(--cream)]">{studyStreakDays} DAYS</p>
            <p className="mt-2 text-[rgba(34,197,94,0.9)]">
              {studyStreakDelta >= 0 ? "+" : ""}
              {studyStreakDelta} from last week
            </p>
          </div>
          <span className="flex h-11 w-11 items-center justify-center bg-[rgba(232,82,10,0.14)] text-[var(--fire)]">
            <Flame className="h-5 w-5" />
          </span>
        </article>

        <article className="flex items-start justify-between gap-3 border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-5">
          <div>
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-[rgba(194,186,176,0.58)]">Questions Today</p>
            <p className="mt-3 text-[3rem] font-semibold leading-none text-[var(--cream)]">{questionsSolvedToday}</p>
            <p className="mt-2 text-[rgba(194,186,176,0.62)]">Goal: {questionsGoalToday}</p>
          </div>
          <span className="flex h-11 w-11 items-center justify-center bg-[rgba(0,212,255,0.12)] text-[var(--ice)]">
            <BookOpen className="h-5 w-5" />
          </span>
        </article>

        <article className="flex items-start justify-between gap-3 border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-5">
          <div>
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-[rgba(194,186,176,0.58)]">Accuracy</p>
            <p className="mt-3 text-[3rem] font-semibold leading-none text-[var(--cream)]">{Math.round(readinessScore)}%</p>
            <p className="mt-2 text-[rgba(34,197,94,0.9)]">
              {accuracyDeltaVsYesterday >= 0 ? "+" : ""}
              {accuracyDeltaVsYesterday.toFixed(1)}% from yesterday
            </p>
          </div>
          <span className="flex h-11 w-11 items-center justify-center bg-[rgba(34,197,94,0.11)] text-emerald-300">
            <Target className="h-5 w-5" />
          </span>
        </article>

        <article className="flex items-start justify-between gap-3 border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-5">
          <div>
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-[rgba(194,186,176,0.58)]">Questions Solved (Total)</p>
            <p className="mt-3 text-[3rem] font-semibold leading-none text-[var(--cream)]">{questionsSolvedTotal}</p>
            <p className="mt-2 text-[rgba(194,186,176,0.62)]">Hours studied: {hoursStudiedTotal.toFixed(1)}</p>
          </div>
          <span className="flex h-11 w-11 items-center justify-center bg-[rgba(245,158,11,0.11)] text-amber-300">
            <Clock3 className="h-5 w-5" />
          </span>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.5fr_0.7fr]">
        <article className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-5">
          <h2 className="inline-flex items-center gap-2 text-4xl font-semibold text-[var(--cream)]">
            <Target className="h-5 w-5 text-[var(--fire)]" />
            Topic Progress
          </h2>

          <div className="mt-5 space-y-4">
            {topTopics.map((topic) => (
              <div key={topic.topic_id} className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-lg">
                  <div>
                    <p className="text-[var(--cream)]">{topic.topic_name}</p>
                    <p className="text-xs text-[rgba(194,186,176,0.62)]">{topic.subject_name}</p>
                  </div>
                  <span className="text-[rgba(194,186,176,0.6)]">{Math.round(topic.accuracy_pct)}%</span>
                </div>
                <div className="h-2 w-full bg-[rgba(255,255,255,0.08)]">
                  <div
                    className="h-2 bg-[var(--fire)]"
                    style={{ width: `${Math.max(0, Math.min(100, topic.accuracy_pct))}%` }}
                  />
                </div>
              </div>
            ))}

            {topTopics.length === 0 ? (
              <p className="text-sm text-[rgba(194,186,176,0.62)]">
                No topic progress available yet. Complete a quiz to generate insights.
              </p>
            ) : null}
          </div>
        </article>

        <article className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-5">
          <h2 className="inline-flex items-center gap-2 text-4xl font-semibold text-[var(--cream)]">
            <Brain className="h-5 w-5 text-[var(--fire)]" />
            Quick Actions
          </h2>

          <div className="mt-5 space-y-3">
            {actions.length === 0 ? (
              <p className="text-sm text-[rgba(194,186,176,0.62)]">
                No quick actions available yet. Generate a roadmap or planner to unlock guided actions.
              </p>
            ) : (
              actions.map((action, index) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex h-12 items-center justify-between border border-[rgba(240,232,218,0.08)] px-4 text-[var(--cream)] transition hover:border-[rgba(232,82,10,0.35)] hover:bg-[rgba(255,255,255,0.02)]"
                >
                  <span className="inline-flex items-center gap-2">
                    {index === 0 ? <Brain className="h-4 w-4 text-[var(--fire)]" /> : null}
                    {index === 1 ? <ListChecks className="h-4 w-4 text-[var(--ice)]" /> : null}
                    {index === 2 ? <BookOpen className="h-4 w-4 text-[var(--ice)]" /> : null}
                    {index === 3 ? <Target className="h-4 w-4 text-[var(--fire)]" /> : null}
                    {action.label}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-[rgba(194,186,176,0.58)]" />
                </Link>
              ))
            )}
          </div>

          <div className="mt-6 space-y-2 text-sm text-[rgba(194,186,176,0.62)]">
            <p className="inline-flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[var(--ice)]" />
              Keep your loop active daily.
            </p>
            <p className="inline-flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-[var(--fire)]" />
              Complete one timed session today.
            </p>
          </div>

          <div className="mt-6 space-y-3 border-t border-[rgba(240,232,218,0.08)] pt-5">
            <div className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.02)] p-3">
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[rgba(194,186,176,0.58)]">Roadmap Progress</p>
              <p className="mt-2 text-sm text-[rgba(194,186,176,0.82)]">
                {Math.round(roadmapProgressPct)}% complete {roadmapCurrentWeek ? `· Week ${roadmapCurrentWeek}` : ""}
              </p>
            </div>
            <div className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.02)] p-3">
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[rgba(194,186,176,0.58)]">AI Insight</p>
              <p className="mt-2 text-sm text-[rgba(194,186,176,0.82)]">
                {nlpInsight ?? "Complete another adaptive quiz to unlock a fresh recommendation."}
              </p>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}

