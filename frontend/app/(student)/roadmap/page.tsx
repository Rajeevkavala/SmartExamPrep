"use client";

import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";

import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { api } from "@/lib/api";
import { useRoadmapStore, type RoadmapPayload, type RoadmapWeekItem } from "@/store/roadmapStore";

type DayStatus = "pending" | "in_progress" | "completed";

type CompleteRoadmapWeekResponse = {
  week: RoadmapWeekItem;
  summary: {
    requested_week_number: number;
    total_days: number;
    already_completed_days: number;
    days_updated: number[];
    completion_pct: number;
  };
};

const toDayStatus = (value: string): DayStatus => {
  if (value === "completed") {
    return "completed";
  }
  if (value === "in_progress") {
    return "in_progress";
  }
  return "pending";
};

const formatDateLabel = (rawDate: string) => {
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) {
    return rawDate;
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

export default function RoadmapPage() {
  const roadmap = useRoadmapStore((state) => state.roadmap);
  const selectedWeek = useRoadmapStore((state) => state.selectedWeek);
  const setRoadmap = useRoadmapStore((state) => state.setRoadmap);
  const setSelectedWeek = useRoadmapStore((state) => state.setSelectedWeek);
  const clearRoadmap = useRoadmapStore((state) => state.clearRoadmap);

  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMarkingWeek, setIsMarkingWeek] = useState(false);
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [weekActionSummary, setWeekActionSummary] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const fetchCurrentRoadmap = async () => {
      try {
        setLoadError(null);
        const { data } = await api.get<RoadmapPayload>("/roadmap/current");

        if (!active) {
          return;
        }

        setRoadmap(data);
      } catch (error) {
        if (!active) {
          return;
        }

        const status = (error as { response?: { status?: number } }).response?.status;
        if (status === 404) {
          clearRoadmap();
        } else {
          const message =
            (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
            "Unable to load your roadmap right now.";
          setLoadError(message);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void fetchCurrentRoadmap();

    return () => {
      active = false;
    };
  }, [clearRoadmap, setRoadmap]);

  const currentWeek = useMemo(() => {
    if (!roadmap) {
      return null;
    }

    return roadmap.weeks.find((week) => week.week_number === selectedWeek) ?? roadmap.weeks[0] ?? null;
  }, [roadmap, selectedWeek]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setLoadError(null);
    setWeekActionSummary(null);

    try {
      const { data } = await api.post<RoadmapPayload>("/roadmap/generate", {
        force_regenerate: false,
        generation_reason: "manual_generate",
      });

      setRoadmap(data);
      setSelectedWeek(1);
    } catch (error) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Unable to generate roadmap.";
      setLoadError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const updateDay = async (weekNumber: number, dayNumber: number, status: DayStatus) => {
    if (!roadmap) {
      return;
    }

    setActiveDay(`${weekNumber}-${dayNumber}`);
    setWeekActionSummary(null);

    try {
      const { data } = await api.patch<RoadmapWeekItem>(
        `/roadmap/weeks/${weekNumber}/days/${dayNumber}`,
        { status }
      );

      const nextRoadmap: RoadmapPayload = {
        ...roadmap,
        weeks: roadmap.weeks.map((week) => (week.week_number === weekNumber ? data : week)),
      };

      setRoadmap(nextRoadmap);
    } catch (error) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Unable to update day status.";
      setLoadError(message);
    } finally {
      setActiveDay(null);
    }
  };

  const markWeekComplete = async () => {
    if (!currentWeek) {
      return;
    }

    setIsMarkingWeek(true);
    setLoadError(null);
    setWeekActionSummary(null);

    try {
      const { data } = await api.post<CompleteRoadmapWeekResponse>(
        `/roadmap/weeks/${currentWeek.week_number}/complete`
      );

      const refreshed = await api.get<RoadmapPayload>("/roadmap/current");
      setRoadmap(refreshed.data);

      const updatedCount = data.summary.days_updated.length;
      setWeekActionSummary(
        `Week ${data.summary.requested_week_number} complete. Updated ${updatedCount} day(s), ${data.summary.already_completed_days} already completed.`
      );
    } catch (error) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Unable to mark week as complete.";
      setLoadError(message);
    } finally {
      setIsMarkingWeek(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading your roadmap..." />;
  }

  if (!roadmap || !currentWeek) {
    return (
      <main className="space-y-5">
        <EmptyState
          icon=">"
          title="No roadmap yet"
          description="Generate your personalized roadmap from your onboarding profile and mastery data."
        />
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="h-11 bg-[var(--fire)] px-6 font-semibold text-white disabled:opacity-60"
        >
          {isGenerating ? "Generating..." : "Generate Roadmap"}
        </button>
      </main>
    );
  }

  return (
    <main className="space-y-5">
      <header className="space-y-2">
        <h1 className="font-display text-[3rem] leading-none tracking-[0.03em] text-[var(--cream)] md:text-[3.7rem]">
          Week {currentWeek.week_number}: {currentWeek.focus_label ?? "Core Topic Mastery"}
        </h1>
        <p className="text-xl text-[rgba(194,186,176,0.72)]">
          Build conceptual depth on high-weightage topics.
        </p>
      </header>

      <section className="flex flex-wrap gap-2">
        {roadmap.weeks.map((week) => (
          <button
            key={week.week_number}
            type="button"
            onClick={() => setSelectedWeek(week.week_number)}
            className={
              week.week_number === currentWeek.week_number
                ? "h-10 border border-[rgba(232,82,10,0.45)] bg-[rgba(232,82,10,0.12)] px-4 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--cream)]"
                : "h-10 border border-[rgba(240,232,218,0.08)] bg-transparent px-4 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[rgba(194,186,176,0.66)]"
            }
          >
            Week {week.week_number}
          </button>
        ))}
      </section>

      <section className="grid gap-3 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-4">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-[rgba(194,186,176,0.58)]">
            Roadmap Control Tower
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-sm text-[rgba(194,186,176,0.58)]">Generated</p>
              <p className="mt-1 text-[var(--cream)]">
                {new Date(roadmap.summary.generated_at).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-[rgba(194,186,176,0.58)]">Generation reason</p>
              <p className="mt-1 text-[var(--cream)]">
                {roadmap.summary.generation_reason ?? "system_generated"}
              </p>
            </div>
            <div>
              <p className="text-sm text-[rgba(194,186,176,0.58)]">Weeks left</p>
              <p className="mt-1 text-[var(--cream)]">{roadmap.summary.weeks_left}</p>
            </div>
            <div>
              <p className="text-sm text-[rgba(194,186,176,0.58)]">Next expansion month</p>
              <p className="mt-1 text-[var(--cream)]">
                {roadmap.summary.next_generation_month ?? "Fully generated"}
              </p>
            </div>
          </div>
        </article>

        <article className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-4">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-[rgba(194,186,176,0.58)]">
            Week Rationale
          </p>
          <div className="mt-4 space-y-3">
            {currentWeek.topics.slice(0, 3).map((topic) => (
              <div
                key={topic.topic_id}
                className="border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[var(--cream)]">{topic.topic_name}</p>
                  <span className="rounded-full border border-[rgba(232,82,10,0.35)] bg-[rgba(232,82,10,0.1)] px-3 py-1 font-mono text-[0.56rem] uppercase tracking-[0.16em] text-[var(--fire)]">
                    {Math.round(topic.priority_score)}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-7 text-[rgba(194,186,176,0.72)]">
                  {typeof topic.rationale?.reason === "string"
                    ? topic.rationale.reason
                    : `Planned for ${topic.goal_type} with ${topic.planned_minutes} minutes this week.`}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      {loadError ? (
        <div className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] px-4 py-3 text-sm text-[rgba(194,186,176,0.76)]">
          {loadError}
        </div>
      ) : null}

      {weekActionSummary ? (
        <div className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] px-4 py-3 text-sm text-[rgba(194,186,176,0.82)]">
          {weekActionSummary}
        </div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {currentWeek.day_plan.map((day) => {
          const status = toDayStatus(day.status);
          const dayKey = `${currentWeek.week_number}-${day.day_number}`;
          const title = day.title || `Topic Practice (${day.planned_minutes}m)`;
          const revisionMinutes = Math.max(30, Math.round(day.planned_minutes * 0.55));

          return (
            <article
              key={day.day_number}
              className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-4"
            >
              <p className="text-4xl font-semibold text-[var(--cream)]">Day {day.day_number}</p>
              <p className="text-[rgba(194,186,176,0.58)]">{formatDateLabel(day.day_date)}</p>

              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  disabled={activeDay === dayKey}
                  onClick={() =>
                    updateDay(
                      currentWeek.week_number,
                      day.day_number,
                      status === "completed" ? "pending" : "completed"
                    )
                  }
                  className="flex w-full items-center gap-3 text-left"
                >
                  <span
                    className={
                      status === "completed"
                        ? "flex h-7 w-7 items-center justify-center bg-[var(--fire)] text-white"
                        : "h-7 w-7 border border-[rgba(240,232,218,0.14)]"
                    }
                  >
                    {status === "completed" ? <Check className="h-4 w-4" /> : null}
                  </span>
                  <span className={status === "completed" ? "line-through text-[rgba(194,186,176,0.42)]" : "text-[var(--cream)]"}>
                    {title}
                  </span>
                  <span className="ml-auto rounded-full border border-[rgba(240,232,218,0.1)] px-3 py-1 font-mono text-[0.56rem] uppercase tracking-[0.16em] text-[rgba(194,186,176,0.68)]">
                    Study
                  </span>
                </button>

                <div className="flex items-center gap-3 text-left">
                  <span className="h-7 w-7 border border-[rgba(240,232,218,0.14)]" />
                  <span className="text-[rgba(194,186,176,0.78)]">{title} Quick Revision ({revisionMinutes}m)</span>
                  <span className="ml-auto rounded-full border border-[rgba(0,212,255,0.35)] bg-[rgba(0,212,255,0.1)] px-3 py-1 font-mono text-[0.56rem] uppercase tracking-[0.16em] text-[var(--ice)]">
                    Revise
                  </span>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <button
        type="button"
        onClick={markWeekComplete}
        disabled={isMarkingWeek}
        className="h-11 bg-[var(--fire)] px-6 font-semibold text-white disabled:opacity-60"
      >
        {isMarkingWeek ? "Updating..." : "Mark week complete"}
      </button>
    </main>
  );
}

