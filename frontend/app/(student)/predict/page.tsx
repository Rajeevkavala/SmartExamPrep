"use client";

import { ArrowRight, Copy, Download, Minus, TrendingUp } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { api } from "@/lib/api";

type ExamCatalogItem = {
  exam_id: string;
  title: string;
};

type PredictionRow = {
  topic_id: string;
  topic_name: string;
  subject_name: string;
  probability: number;
  trend: string;
  priority: string;
  expected_questions: number;
  appearance_count: number;
  last_appeared_year?: number | null;
  reason: string;
};

type RepeatTopicItem = {
  topic_id: string;
  topic_name: string;
  subject_name: string;
  appearance_count: number;
  years_appeared: number[];
  pattern: string;
  priority: string;
};

type PredictionSnapshotResponse = {
  exam_id: string;
  exam_title: string;
  generated_at: string;
  insight: string;
  rows: PredictionRow[];
  repeat_topics: RepeatTopicItem[];
  metadata: {
    source?: string;
  };
};

const priorityToneClass: Record<string, string> = {
  Medium:
    "border-[rgba(0,212,255,0.35)] bg-[rgba(0,212,255,0.1)] text-[var(--ice)]",
  High: "border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.1)] text-amber-300",
  Critical:
    "border-[rgba(232,82,10,0.4)] bg-[rgba(232,82,10,0.12)] text-[var(--fire)]",
  Low: "border-[rgba(240,232,218,0.14)] bg-[rgba(255,255,255,0.03)] text-[rgba(194,186,176,0.72)]",
};

export default function PredictorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [exams, setExams] = useState<ExamCatalogItem[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [prediction, setPrediction] = useState<PredictionSnapshotResponse | null>(null);
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [trendFilter, setTrendFilter] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadPrediction = async (examId: string) => {
    const { data } = await api.get<PredictionSnapshotResponse>("/ai/predictions", {
      params: { exam_id: examId },
    });
    setPrediction(data);
  };

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        setLoadError(null);
        const { data } = await api.get<ExamCatalogItem[]>("/exams");
        if (!active) {
          return;
        }

        const nextExams = data ?? [];
        setExams(nextExams);
        const requestedExamId = searchParams.get("exam_id");
        const resolvedExamId =
          nextExams.find((item) => item.exam_id === requestedExamId)?.exam_id ??
          nextExams[0]?.exam_id ??
          "";
        setSelectedExamId(resolvedExamId);
      } catch (error) {
        if (!active) {
          return;
        }

        const detail =
          (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
          "Unable to load topic predictions right now.";
        setLoadError(detail);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, [searchParams]);

  useEffect(() => {
    if (!selectedExamId || isLoading) {
      return;
    }

    void loadPrediction(selectedExamId).catch((error) => {
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Unable to load topic predictions right now.";
      setLoadError(detail);
    });
  }, [isLoading, selectedExamId]);

  const filteredRows = useMemo(() => {
    const rows = prediction?.rows ?? [];
    return rows.filter((row) => {
      const matchesPriority = priorityFilter === "All" || row.priority === priorityFilter;
      const matchesTrend = trendFilter === "All" || row.trend === trendFilter;
      return matchesPriority && matchesTrend;
    });
  }, [prediction?.rows, priorityFilter, trendFilter]);

  const handleRefresh = async () => {
    if (!selectedExamId) {
      return;
    }

    setIsRefreshing(true);
    try {
      const { data } = await api.post<PredictionSnapshotResponse>("/ai/predictions/refresh", {
        exam_id: selectedExamId,
      });
      setPrediction(data);
      setLoadError(null);
    } catch (error) {
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Unable to refresh predictions.";
      setLoadError(detail);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCopyToRoadmap = async (topicIds?: string[]) => {
    if (!selectedExamId) {
      return;
    }

    setIsCopying(true);
    try {
      await api.post(`/ai/predictions/${selectedExamId}/copy-to-roadmap`, {
        topic_ids: topicIds,
        force_regenerate: true,
      });
      router.push("/roadmap");
    } catch (error) {
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Unable to copy predictions into the roadmap.";
      setLoadError(detail);
    } finally {
      setIsCopying(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading predictor..." />;
  }

  if (loadError && !prediction) {
    return (
      <main>
        <EmptyState
          icon="!"
          title="Predictor unavailable"
          description={loadError}
          ctaLabel="Back to exams"
          ctaHref="/exams"
        />
      </main>
    );
  }

  return (
    <main className="space-y-5">
      <header className="space-y-2">
        <h1 className="font-display text-[3rem] leading-none tracking-[0.03em] text-[var(--cream)] md:text-[3.6rem]">
          AI TOPIC PREDICTOR
        </h1>
        <p className="text-xl text-[rgba(194,186,176,0.72)]">
          Backend-generated topic forecasts for {prediction?.exam_title ?? "your selected exam"}
        </p>
      </header>

      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedExamId}
            onChange={(event) => {
              setSelectedExamId(event.target.value);
              router.replace(`/predict?exam_id=${event.target.value}`);
            }}
            className="h-11 min-w-[220px] border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.02)] px-4 text-sm text-[var(--cream)]"
          >
            {exams.map((exam) => (
              <option key={exam.exam_id} value={exam.exam_id}>
                {exam.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              void handleRefresh();
            }}
            disabled={isRefreshing || !selectedExamId}
            className="h-11 border border-[rgba(232,82,10,0.4)] bg-[var(--fire)] px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isRefreshing ? "Updating..." : "Update Predictions"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/exams")}
            className="h-11 border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.02)] px-4 text-sm text-[var(--cream)]"
          >
            Back to Exams
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              const blob = new Blob([JSON.stringify(prediction, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const anchor = document.createElement("a");
              anchor.href = url;
              anchor.download = "prediction-snapshot.json";
              anchor.click();
              URL.revokeObjectURL(url);
            }}
            className="inline-flex h-11 items-center gap-2 border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.02)] px-4 text-sm text-[var(--cream)]"
          >
            <Download className="h-4 w-4" />
            Download Snapshot
          </button>
          <button
            type="button"
            onClick={() => {
              void handleCopyToRoadmap(filteredRows.map((row) => row.topic_id));
            }}
            disabled={isCopying || filteredRows.length === 0}
            className="inline-flex h-11 items-center gap-2 border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.02)] px-4 text-sm text-[var(--cream)] disabled:opacity-60"
          >
            <Copy className="h-4 w-4" />
            {isCopying ? "Copying..." : "Copy to Roadmap"}
          </button>
        </div>
      </section>

      {prediction ? (
        <section className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] px-4 py-3 text-sm text-[rgba(194,186,176,0.7)]">
          Last updated: {new Date(prediction.generated_at).toLocaleString()} · source:{" "}
          {prediction.metadata?.source ?? "prediction_engine"}
        </section>
      ) : null}

      <section className="border border-[rgba(0,212,255,0.45)] bg-[rgba(0,212,255,0.04)] p-4">
        <h2 className="text-xl font-semibold text-[var(--cream)]">Exam Insight</h2>
        <p className="mt-1 text-[rgba(194,186,176,0.72)]">
          {prediction?.insight ??
            "Refresh predictions to generate a fresh topic forecast for this exam."}
        </p>
      </section>

      <section className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-4">
        <h3 className="text-xl font-semibold text-[var(--cream)]">Prediction Filters</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <p className="mb-2 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[rgba(194,186,176,0.58)]">
              Priority
            </p>
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              className="h-11 w-full border border-[rgba(240,232,218,0.08)] bg-[var(--bg)] px-3 text-sm text-[var(--cream)]"
            >
              <option>All</option>
              <option>Critical</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>
          <div>
            <p className="mb-2 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[rgba(194,186,176,0.58)]">
              Trend
            </p>
            <select
              value={trendFilter}
              onChange={(event) => setTrendFilter(event.target.value)}
              className="h-11 w-full border border-[rgba(240,232,218,0.08)] bg-[var(--bg)] px-3 text-sm text-[var(--cream)]"
            >
              <option>All</option>
              <option>Rising</option>
              <option>Stable</option>
              <option>Cooling</option>
            </select>
          </div>
        </div>
      </section>

      <section className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-4">
        <h3 className="text-xl font-semibold text-[var(--cream)]">Predictions</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm text-[rgba(194,186,176,0.74)]">
            <thead>
              <tr className="border-b border-[rgba(240,232,218,0.08)] text-left font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[rgba(194,186,176,0.58)]">
                <th className="px-2 py-2">Topic</th>
                <th className="px-2 py-2">Probability</th>
                <th className="px-2 py-2">Trend</th>
                <th className="px-2 py-2">Priority</th>
                <th className="px-2 py-2">Expected Qs</th>
                <th className="px-2 py-2">Reasoning</th>
                <th className="px-2 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.topic_id} className="border-b border-[rgba(240,232,218,0.08)]">
                  <td className="px-2 py-3 text-[var(--cream)]">
                    <div>
                      <p>{row.topic_name}</p>
                      <p className="mt-1 text-xs text-[rgba(194,186,176,0.58)]">
                        {row.subject_name}
                      </p>
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <div className="space-y-1">
                      <p className="text-[var(--cream)]">{row.probability}%</p>
                      <div className="h-1.5 w-24 bg-[rgba(255,255,255,0.08)]">
                        <div
                          className="h-1.5 bg-[var(--fire)]"
                          style={{ width: `${row.probability}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <span className="inline-flex items-center gap-1">
                      {row.trend === "Rising" ? (
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-300" />
                      ) : (
                        <Minus className="h-3.5 w-3.5 text-[rgba(194,186,176,0.58)]" />
                      )}
                      {row.trend}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <span
                      className={`rounded-full border px-2 py-1 font-mono text-[0.52rem] uppercase tracking-[0.16em] ${
                        priorityToneClass[row.priority] ?? priorityToneClass.Medium
                      }`}
                    >
                      {row.priority}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    {row.expected_questions}
                    {row.last_appeared_year ? (
                      <p className="mt-1 text-xs text-[rgba(194,186,176,0.58)]">
                        Last seen {row.last_appeared_year}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-2 py-3">{row.reason}</td>
                  <td className="px-2 py-3">
                    <button
                      type="button"
                      onClick={() => {
                        void handleCopyToRoadmap([row.topic_id]);
                      }}
                      className="text-[var(--cream)]"
                    >
                      Add to Roadmap
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-4">
        <h3 className="text-xl font-semibold text-[var(--cream)]">Recurring Topics</h3>
        <div className="mt-4">
          {(prediction?.repeat_topics ?? []).map((topic) => (
            <div
              key={topic.topic_id}
              className="flex items-center justify-between border-b border-[rgba(240,232,218,0.08)] py-3 text-sm"
            >
              <div>
                <p className="text-[var(--cream)]">{topic.topic_name}</p>
                <p className="text-[rgba(194,186,176,0.58)]">{topic.pattern}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full border border-[rgba(232,82,10,0.35)] bg-[rgba(232,82,10,0.12)] px-2 py-1 font-mono text-[0.5rem] uppercase tracking-[0.16em] text-[var(--fire)]">
                  {topic.priority}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    void handleCopyToRoadmap([topic.topic_id]);
                  }}
                  className="inline-flex items-center gap-2 text-[var(--cream)]"
                >
                  Open Topic
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
