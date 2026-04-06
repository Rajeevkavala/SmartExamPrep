"use client";

import { History, PlayCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { api } from "@/lib/api";

type ExamCatalogItem = {
  exam_id: string;
  title: string;
  category: string;
};

type MockSessionResponse = {
  session_id: string;
};

type AttemptHistoryItem = {
  attempt_id: string;
  quiz_type: string;
  score: number;
  correct_count: number;
  total_questions: number;
  source?: string | null;
  exam_title?: string | null;
  mock_type?: string | null;
  year_filter?: number | null;
  submitted_at: string;
};

type AttemptHistoryResponse = {
  attempts: AttemptHistoryItem[];
  total: number;
};

export default function MockTestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [exams, setExams] = useState<ExamCatalogItem[]>([]);
  const [history, setHistory] = useState<AttemptHistoryItem[]>([]);
  const [examId, setExamId] = useState("");
  const [mockType, setMockType] = useState("adaptive");
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(3600);
  const [questionCount, setQuestionCount] = useState(30);
  const [yearFilter, setYearFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        setLoadError(null);
        const [{ data: examsData }, { data: historyData }] = await Promise.all([
          api.get<ExamCatalogItem[]>("/exams"),
          api.get<AttemptHistoryResponse>("/quiz/attempts", {
            params: { source: "mock_test", limit: 12 },
          }),
        ]);

        if (!active) {
          return;
        }

        const nextExams = examsData ?? [];
        setExams(nextExams);
        setHistory(historyData?.attempts ?? []);

        const requestedExamId = searchParams.get("exam_id");
        const matchedExam =
          nextExams.find((item) => item.exam_id === requestedExamId) ?? nextExams[0];
        setExamId(matchedExam?.exam_id ?? "");
      } catch (error) {
        if (!active) {
          return;
        }

        const detail =
          (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
          "Unable to load mock-test configuration right now.";
        setLoadError(detail);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      active = false;
    };
  }, [searchParams]);

  const selectedExam = useMemo(
    () => exams.find((item) => item.exam_id === examId) ?? null,
    [examId, exams]
  );

  const createSession = async (sessionMode: "quick" | "full") => {
    if (!examId) {
      return;
    }

    setIsCreating(true);

    try {
      const { data } = await api.post<MockSessionResponse>("/quiz/mock-session", {
        exam_id: examId,
        mock_type: mockType,
        session_mode: sessionMode,
        time_limit_seconds: timeLimitSeconds,
        question_count: sessionMode === "quick" ? Math.min(questionCount, 15) : questionCount,
        year_filter: yearFilter ? Number(yearFilter) : null,
      });

      router.push(`/quiz/adaptive?mock_session_id=${data.session_id}`);
    } catch (error) {
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Unable to create the mock session.";
      setLoadError(detail);
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading mock test engine..." />;
  }

  if (loadError && exams.length === 0) {
    return (
      <main>
        <EmptyState
          icon="!"
          title="Mock tests unavailable"
          description={loadError}
          ctaLabel="Back to exams"
          ctaHref="/exams"
        />
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <header className="space-y-2">
          <h1 className="font-display text-[3rem] leading-none tracking-[0.03em] text-[var(--cream)] md:text-[4rem]">
            MOCK TEST ENGINE
          </h1>
          <p className="text-xl text-[rgba(194,186,176,0.72)]">
            Create validated timed sessions and revisit real attempt history.
          </p>
        </header>

        <div className="inline-flex h-11 items-center gap-3 border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.02)] px-5 text-[var(--cream)]">
          <History className="h-4 w-4" />
          {history.length} recent attempt{history.length === 1 ? "" : "s"}
        </div>
      </section>

      <section className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-6">
        <h2 className="text-4xl font-semibold text-[var(--cream)]">Start New Mock Session</h2>
        <p className="mt-2 text-xl text-[rgba(194,186,176,0.7)]">
          Configure the exam, generator, duration, and question count server-side.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-[rgba(194,186,176,0.58)]">
              Exam
            </p>
            <select
              value={examId}
              onChange={(event) => setExamId(event.target.value)}
              className="h-11 w-full border border-[rgba(240,232,218,0.08)] bg-[var(--bg)] px-4 text-[var(--cream)]"
            >
              {exams.map((exam) => (
                <option key={exam.exam_id} value={exam.exam_id}>
                  {exam.title}
                </option>
              ))}
            </select>
            {selectedExam ? (
              <p className="mt-2 text-sm text-[rgba(194,186,176,0.58)]">
                {selectedExam.category}
              </p>
            ) : null}
          </div>

          <div>
            <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-[rgba(194,186,176,0.58)]">
              Mock Type
            </p>
            <select
              value={mockType}
              onChange={(event) => setMockType(event.target.value)}
              className="h-11 w-full border border-[rgba(240,232,218,0.08)] bg-[var(--bg)] px-4 text-[var(--cream)]"
            >
              <option value="adaptive">Adaptive</option>
              <option value="full_length">Full Length</option>
              <option value="pyq">PYQ</option>
            </select>
            <p className="mt-2 text-sm text-[rgba(194,186,176,0.58)]">
              Adaptive uses mastery-based selection. PYQ mode locks the session to previous-year questions.
            </p>
          </div>

          <div>
            <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-[rgba(194,186,176,0.58)]">
              Time Limit (Seconds)
            </p>
            <input
              type="number"
              min={300}
              max={14400}
              value={timeLimitSeconds}
              onChange={(event) => setTimeLimitSeconds(Number(event.target.value) || 300)}
              className="h-11 w-full border border-[rgba(240,232,218,0.08)] bg-transparent px-4 text-[var(--cream)]"
            />
          </div>

          <div>
            <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-[rgba(194,186,176,0.58)]">
              Question Count
            </p>
            <input
              type="number"
              min={5}
              max={60}
              value={questionCount}
              onChange={(event) => setQuestionCount(Number(event.target.value) || 5)}
              className="h-11 w-full border border-[rgba(240,232,218,0.08)] bg-transparent px-4 text-[var(--cream)]"
            />
          </div>

          <div className="md:col-span-2">
            <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-[rgba(194,186,176,0.58)]">
              Year Filter (Optional)
            </p>
            <input
              type="number"
              value={yearFilter}
              onChange={(event) => setYearFilter(event.target.value)}
              className="h-11 w-full border border-[rgba(232,82,10,0.65)] bg-transparent px-4 text-[var(--cream)]"
            />
            <p className="mt-2 text-sm text-[rgba(194,186,176,0.58)]">
              Apply this when you want the generator to focus on one PYQ year.
            </p>
          </div>
        </div>

        {loadError ? (
          <p className="mt-4 text-sm text-rose-300">{loadError}</p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              void createSession("full");
            }}
            disabled={isCreating || !examId}
            className="inline-flex h-11 items-center gap-2 bg-[var(--fire)] px-6 font-semibold text-white disabled:opacity-60"
          >
            <PlayCircle className="h-4 w-4" />
            {isCreating ? "Preparing..." : "Start Mock Test"}
          </button>
          <button
            type="button"
            onClick={() => {
              void createSession("quick");
            }}
            disabled={isCreating || !examId}
            className="h-11 border border-[rgba(240,232,218,0.08)] bg-transparent px-6 font-semibold text-[var(--cream)] disabled:opacity-60"
          >
            Quick Mock
          </button>
        </div>
      </section>

      <section className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-6">
        <h2 className="text-3xl font-semibold text-[var(--cream)]">Attempt History</h2>
        <div className="mt-4 space-y-3">
          {history.length === 0 ? (
            <p className="text-sm text-[rgba(194,186,176,0.68)]">
              No mock sessions submitted yet. Your recent attempts will appear here.
            </p>
          ) : (
            history.map((attempt) => (
              <article
                key={attempt.attempt_id}
                className="flex flex-col gap-3 border border-[rgba(240,232,218,0.08)] p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <p className="text-xl font-semibold text-[var(--cream)]">
                    {attempt.exam_title ?? "Mock Session"} · {attempt.mock_type ?? attempt.quiz_type}
                  </p>
                  <p className="mt-1 text-sm text-[rgba(194,186,176,0.6)]">
                    {new Date(attempt.submitted_at).toLocaleString()}
                    {attempt.year_filter ? ` · Year ${attempt.year_filter}` : ""}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[rgba(34,197,94,0.35)] bg-[rgba(34,197,94,0.12)] px-3 py-1 font-mono text-[0.56rem] uppercase tracking-[0.16em] text-emerald-300">
                    {Math.round(attempt.score)}%
                  </span>
                  <span className="rounded-full border border-[rgba(240,232,218,0.14)] bg-[rgba(255,255,255,0.03)] px-3 py-1 font-mono text-[0.56rem] uppercase tracking-[0.16em] text-[rgba(194,186,176,0.72)]">
                    {attempt.correct_count}/{attempt.total_questions} correct
                  </span>
                  <button
                    type="button"
                    onClick={() => router.push(`/quiz/result/${attempt.attempt_id}`)}
                    className="h-11 border border-[rgba(240,232,218,0.08)] px-4 text-[var(--cream)]"
                  >
                    View Result
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
