"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { api } from "@/lib/api";
import { type TopicComparison, useQuizStore } from "@/store/quizStore";

type PYQSubjectOption = {
  id: string;
  name: string;
};

type PYQTopicOption = {
  id: string;
  subject_id: string;
  name: string;
};

type PYQBrowseItem = {
  id: string;
  subject_id: string;
  subject_name: string;
  topic_id: string;
  topic_name: string;
  subtopic?: string | null;
  difficulty: string;
  year?: number | null;
  source_url?: string | null;
  question_text: string;
  options: string[];
  question_image_urls?: string[];
  correct_answer?: string | null;
  explanation?: string | null;
  marks?: number;
};

type FilterOptionsResponse = {
  years?: number[];
  subjects?: PYQSubjectOption[];
  topics?: PYQTopicOption[];
  difficulties?: string[];
};

type PYQBrowseResponse = {
  total: number;
  questions: PYQBrowseItem[];
  limit: number;
  offset: number;
  applied_filters?: Record<string, unknown>;
  pagination?: {
    page: number;
    page_size: number;
    has_more: boolean;
  };
};

type PYQPracticeQuestion = {
  id: string;
  question_text: string;
  options: string[];
  subject_name?: string;
  topic_name?: string;
};

type PYQPracticeResponse = {
  total: number;
  requested_count: number;
  questions: PYQPracticeQuestion[];
  context_payload?: {
    source?: string;
    filters?: {
      subject_id?: string;
      topic_id?: string;
      difficulty?: string;
      year_from?: number;
      subject_name?: string;
      topic_name?: string;
      };
  };
  selection_summary?: {
    total_available?: number;
    practice_mode?: string;
    applied_filters?: Record<string, unknown>;
  };
};

type QuizSubmitResponse = {
  attempt_id: string;
  quiz_type?: string;
  score?: number;
  correct_count?: number;
  total_questions?: number;
  topic_scores?: Record<string, number>;
  topic_comparisons?: TopicComparison[];
  readiness_before?: number | null;
  readiness_after?: number | null;
  context_payload?: Record<string, unknown> | null;
  analysis_updated_at?: string | null;
  result_metadata?: Record<string, unknown>;
};

type FiltersState = {
  search: string;
  subject_id: string;
  topic_id: string;
  difficulty: string;
  year: string;
};

const initialFilters: FiltersState = {
  search: "",
  subject_id: "",
  topic_id: "",
  difficulty: "",
  year: "",
};

const PYQ_FILTER_STORAGE_KEY = "smartexamprep.pyq.filters.v2";

export default function PYQPage() {
  const router = useRouter();
  const setLatestResult = useQuizStore((state) => state.setLatestResult);

  const [filters, setFilters] = useState<FiltersState>(initialFilters);
  const [filterOptions, setFilterOptions] = useState<FilterOptionsResponse>({});
  const [questions, setQuestions] = useState<PYQBrowseItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState<PYQBrowseResponse["pagination"] | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isStartingPractice, setIsStartingPractice] = useState(false);
  const [isSubmittingPractice, setIsSubmittingPractice] = useState(false);
  const [practiceQuestions, setPracticeQuestions] = useState<PYQPracticeQuestion[] | null>(null);
  const [practiceContext, setPracticeContext] = useState<PYQPracticeResponse["context_payload"] | null>(null);
  const [practiceSelectionSummary, setPracticeSelectionSummary] = useState<PYQPracticeResponse["selection_summary"] | null>(null);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<string, string>>({});

  const selectedQuestion = useMemo(() => {
    if (!selectedQuestionId) {
      return questions[0] ?? null;
    }

    return questions.find((question) => question.id === selectedQuestionId) ?? questions[0] ?? null;
  }, [questions, selectedQuestionId]);

  const visibleTopics = useMemo(() => {
    if (!filters.subject_id) {
      return filterOptions.topics ?? [];
    }

    return (filterOptions.topics ?? []).filter((topic) => topic.subject_id === filters.subject_id);
  }, [filterOptions.topics, filters.subject_id]);

  const currentPracticeQuestion = useMemo(() => {
    if (!practiceQuestions || practiceQuestions.length === 0) {
      return null;
    }

    return practiceQuestions[Math.max(0, Math.min(practiceQuestions.length - 1, practiceIndex))] ?? null;
  }, [practiceIndex, practiceQuestions]);

  const loadQuestions = async (nextFilters: FiltersState, withSpinner = true) => {
    if (withSpinner) {
      setIsLoadingQuestions(true);
    }

    try {
      setLoadError(null);
      const year = nextFilters.year.trim();

      const { data } = await api.get<PYQBrowseResponse>("/pyq/questions", {
        params: {
          subject_id: nextFilters.subject_id || undefined,
          topic_id: nextFilters.topic_id || undefined,
          difficulty: nextFilters.difficulty || undefined,
          year_from: year ? Number(year) : undefined,
          year_to: year ? Number(year) : undefined,
          search: nextFilters.search.trim() || undefined,
          limit: 80,
          offset: 0,
        },
      });

      setQuestions(data.questions ?? []);
      setTotal(Number(data.total ?? 0));
      setPagination(data.pagination ?? null);
      setSelectedQuestionId((current) => current ?? data.questions?.[0]?.id ?? null);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(PYQ_FILTER_STORAGE_KEY, JSON.stringify(nextFilters));
      }
    } catch (error) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Unable to load PYQ questions right now.";
      setLoadError(message);
      setQuestions([]);
      setTotal(0);
      setPagination(null);
      setSelectedQuestionId(null);
    } finally {
      if (withSpinner) {
        setIsLoadingQuestions(false);
      }
    }
  };

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        setLoadError(null);
        const { data } = await api.get<FilterOptionsResponse>("/pyq/filters");

        if (cancelled) {
          return;
        }

        setFilterOptions(data);
        const savedFilters =
          typeof window !== "undefined"
            ? (() => {
                try {
                  return JSON.parse(
                    window.localStorage.getItem(PYQ_FILTER_STORAGE_KEY) ?? "null"
                  ) as FiltersState | null;
                } catch {
                  return null;
                }
              })()
            : null;
        const bootFilters = savedFilters ?? initialFilters;
        setFilters(bootFilters);
        await loadQuestions(bootFilters, false);
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message =
          (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
          "Unable to load PYQ filters right now.";
        setLoadError(message);
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  if (isBootstrapping) {
    return <LoadingSpinner message="Loading PYQ browser..." />;
  }

  if (loadError && questions.length === 0) {
    return (
      <main>
        <EmptyState
          icon="!"
          title="PYQ browser unavailable"
          description={loadError}
          ctaLabel="Retry"
          ctaHref="/pyq"
        />
      </main>
    );
  }

  const startPractice = async () => {
    try {
      setIsStartingPractice(true);
      setLoadError(null);

      const year = filters.year.trim();
      const { data } = await api.post<PYQPracticeResponse>("/pyq/practice", {
        subject_id: filters.subject_id || undefined,
        topic_id: filters.topic_id || undefined,
        difficulty: filters.difficulty || undefined,
        year_from: year ? Number(year) : undefined,
      });

      const nextQuestions = data.questions ?? [];
      setPracticeQuestions(nextQuestions);
      setPracticeContext(data.context_payload ?? null);
      setPracticeSelectionSummary(data.selection_summary ?? null);
      setPracticeIndex(0);
      setPracticeAnswers({});

      if (nextQuestions.length === 0) {
        setLoadError("No practice questions available for the selected filters.");
      }
    } catch (error) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Unable to start PYQ practice right now.";
      setLoadError(message);
    } finally {
      setIsStartingPractice(false);
    }
  };

  const submitPractice = async () => {
    if (!practiceQuestions || practiceQuestions.length === 0 || isSubmittingPractice) {
      return;
    }

    try {
      setIsSubmittingPractice(true);

      const answers = practiceQuestions.map((question) => ({
        question_id: question.id,
        selected_answer: practiceAnswers[question.id] ?? "",
      }));

      const fallbackContext = {
        source: "pyq_browser",
        filters: {
          subject_id: filters.subject_id || undefined,
          topic_id: filters.topic_id || undefined,
          difficulty: filters.difficulty || undefined,
          year_from: filters.year ? Number(filters.year) : undefined,
          subject_name: selectedQuestion?.subject_name,
          topic_name: selectedQuestion?.topic_name,
        },
      };

      const { data } = await api.post<QuizSubmitResponse>("/quiz/submit", {
        quiz_type: "pyq_practice",
        answers,
        context_payload: practiceContext ?? fallbackContext,
      });

      setLatestResult({
        attempt_id: data.attempt_id,
        quiz_type: data.quiz_type ?? "pyq_practice",
        score: data.score ?? 0,
        correct_count: data.correct_count ?? 0,
        total_questions: data.total_questions ?? answers.length,
        topic_scores: data.topic_scores ?? {},
        topic_comparisons: data.topic_comparisons ?? [],
        readiness_before: data.readiness_before ?? null,
        readiness_after: data.readiness_after ?? null,
        context_payload: data.context_payload ?? null,
        submitted_at: new Date().toISOString(),
        analysis_updated_at: data.analysis_updated_at ?? null,
        result_metadata: data.result_metadata ?? {},
      });

      router.push(`/quiz/result/${data.attempt_id}`);
    } catch (error) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Unable to submit PYQ practice right now.";
      setLoadError(message);
    } finally {
      setIsSubmittingPractice(false);
    }
  };

  return (
    <main className="space-y-5">
      <header className="space-y-2">
        <h1 className="font-display text-[3rem] leading-none tracking-[0.03em] text-[var(--cream)] md:text-[3.8rem]">
          PYQ BROWSER
        </h1>
        <p className="text-xl text-[rgba(194,186,176,0.72)]">
          Filter previous year questions and inspect detailed solutions.
        </p>
      </header>

      <section className="grid gap-3 xl:grid-cols-[1fr_1.2fr_1.1fr]">
        <aside className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-4">
          <h2 className="text-4xl font-semibold text-[var(--cream)]">Filters</h2>

          <div className="mt-4 space-y-4">
            <div>
              <p className="mb-2 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[rgba(194,186,176,0.58)]">
                Search
              </p>
              <input
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                className="h-11 w-full border border-[rgba(240,232,218,0.08)] bg-transparent px-3 text-[var(--cream)]"
                placeholder="recursion, graph, dp..."
              />
            </div>

            <div>
              <label htmlFor="pyq-subject" className="mb-2 block font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[rgba(194,186,176,0.58)]">
                Subject
              </label>
              <select
                id="pyq-subject"
                value={filters.subject_id}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    subject_id: event.target.value,
                    topic_id: "",
                  }))
                }
                className="h-11 w-full border border-[rgba(240,232,218,0.08)] bg-transparent px-3 text-[var(--cream)]"
              >
                <option value="">All subjects</option>
                {(filterOptions.subjects ?? []).map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="pyq-year-from" className="mb-2 block font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[rgba(194,186,176,0.58)]">
                Year from
              </label>
              <select
                id="pyq-year-from"
                value={filters.year}
                onChange={(event) => setFilters((current) => ({ ...current, year: event.target.value }))}
                className="h-11 w-full border border-[rgba(240,232,218,0.08)] bg-transparent px-3 text-[var(--cream)]"
              >
                <option value="">All years</option>
                {(filterOptions.years ?? []).map((year) => (
                  <option key={year} value={String(year)}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="pyq-topic" className="mb-2 block font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[rgba(194,186,176,0.58)]">
                Topic
              </label>
              <select
                id="pyq-topic"
                value={filters.topic_id}
                onChange={(event) => setFilters((current) => ({ ...current, topic_id: event.target.value }))}
                className="h-11 w-full border border-[rgba(240,232,218,0.08)] bg-transparent px-3 text-[var(--cream)]"
              >
                <option value="">All topics</option>
                {visibleTopics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="pyq-difficulty" className="mb-2 block font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[rgba(194,186,176,0.58)]">
                Difficulty
              </label>
              <select
                id="pyq-difficulty"
                value={filters.difficulty}
                onChange={(event) => setFilters((current) => ({ ...current, difficulty: event.target.value }))}
                className="h-11 w-full border border-[rgba(240,232,218,0.08)] bg-transparent px-3 text-[var(--cream)]"
              >
                <option value="">All</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="mb-2 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[rgba(194,186,176,0.58)]">
                  Marks Min
                </p>
                <input
                  type="number"
                  value={1}
                  readOnly
                  className="h-11 w-full border border-[rgba(240,232,218,0.08)] bg-transparent px-3 text-[var(--cream)]"
                />
              </div>
              <div>
                <p className="mb-2 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[rgba(194,186,176,0.58)]">
                  Marks Max
                </p>
                <input
                  type="number"
                  value={5}
                  readOnly
                  className="h-11 w-full border border-[rgba(240,232,218,0.08)] bg-transparent px-3 text-[var(--cream)]"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedQuestionId(null);
                void loadQuestions(filters, true);
              }}
              className="h-11 w-full bg-[var(--fire)] font-semibold text-white"
            >
              Apply Filters
            </button>
            <button
              type="button"
              onClick={() => {
                setFilters(initialFilters);
                setSelectedQuestionId(null);
                void loadQuestions(initialFilters, true);
                if (typeof window !== "undefined") {
                  window.localStorage.removeItem(PYQ_FILTER_STORAGE_KEY);
                }
              }}
              className="h-11 w-full border border-[rgba(240,232,218,0.08)] text-[rgba(194,186,176,0.76)]"
            >
              Reset
            </button>
            <p className="text-xs text-[rgba(194,186,176,0.54)]">
              Your latest filter state is remembered for the next PYQ session.
            </p>
          </div>
        </aside>

        <section className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-4">
          <h2 className="text-4xl font-semibold text-[var(--cream)]">Question List</h2>
          <p className="mt-1 text-xl text-[rgba(194,186,176,0.68)]">
            {total} questions · page {pagination?.page ?? 1}
            {pagination?.has_more ? " · more available" : " · current slice fully loaded"}
          </p>

          {isLoadingQuestions ? (
            <p className="mt-4 text-sm text-[rgba(194,186,176,0.62)]">Refreshing questions...</p>
          ) : null}

          <div className="mt-4 space-y-2">
            {questions.map((question) => {
              const active = question.id === selectedQuestion?.id;
              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => {
                    setSelectedQuestionId(question.id);
                    setShowAnswer(false);
                  }}
                  className={
                    active
                      ? "w-full border border-[rgba(232,82,10,0.58)] bg-[rgba(232,82,10,0.22)] p-3 text-left"
                      : "w-full border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-3 text-left"
                  }
                >
                  <p className="line-clamp-2 text-lg font-semibold leading-tight text-[var(--cream)]">
                    {question.question_text.length > 40
                      ? `${question.question_text.slice(0, 40)}...`
                      : question.question_text}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[rgba(194,186,176,0.68)]">
                    <span className="rounded-full border border-[rgba(0,212,255,0.35)] bg-[rgba(0,212,255,0.12)] px-3 py-0.5 font-mono text-[0.56rem] uppercase tracking-[0.16em] text-[var(--ice)]">
                      {question.topic_name}
                    </span>
                    <span className="rounded-full border border-[rgba(240,232,218,0.14)] px-3 py-0.5 font-mono text-[0.56rem] uppercase tracking-[0.16em] text-[rgba(194,186,176,0.7)]">
                      {question.year ?? "--"}
                    </span>
                    <span className="rounded-full border border-[rgba(34,197,94,0.35)] bg-[rgba(34,197,94,0.12)] px-3 py-0.5 font-mono text-[0.56rem] uppercase tracking-[0.16em] text-emerald-300">
                      {question.difficulty}
                    </span>
                    <span>{question.marks ?? 1} marks</span>
                  </div>
                  <p className="mt-1 text-sm text-[rgba(194,186,176,0.62)]">
                    {question.subject_name}
                    {question.subtopic ? ` · ${question.subtopic}` : ""}
                  </p>
                </button>
              );
            })}

            {questions.length === 0 ? (
              <p className="text-sm text-[rgba(194,186,176,0.62)]">No questions matched your current filters.</p>
            ) : null}
          </div>
        </section>

        <section className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-4">
          <h2 className="text-4xl font-semibold text-[var(--cream)]">Question Detail</h2>
          {practiceQuestions && currentPracticeQuestion ? (
            <div className="mt-4 space-y-4">
              <h3 className="text-2xl font-semibold text-[var(--cream)]">PYQ Practice Session</h3>
              <p className="text-sm text-[rgba(194,186,176,0.72)]">
                Subject: {practiceContext?.filters?.subject_name ?? selectedQuestion?.subject_name ?? "--"}
              </p>
              <p className="text-sm text-[rgba(194,186,176,0.72)]">
                Topic: {practiceContext?.filters?.topic_name ?? selectedQuestion?.topic_name ?? "--"}
              </p>
              <p className="text-sm text-[rgba(194,186,176,0.72)]">
                Session size: {practiceQuestions.length} selected
                {practiceSelectionSummary?.total_available
                  ? ` from ${practiceSelectionSummary.total_available} matching questions`
                  : ""}
              </p>

              <p className="text-xl font-semibold text-[var(--cream)]">{currentPracticeQuestion.question_text}</p>

              <div className="space-y-2">
                {currentPracticeQuestion.options.map((option) => {
                  const selected = practiceAnswers[currentPracticeQuestion.id] === option.charAt(0);

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setPracticeAnswers((current) => ({
                          ...current,
                          [currentPracticeQuestion.id]: option.charAt(0),
                        }));
                      }}
                      className={
                        selected
                          ? "flex w-full items-center border border-[rgba(232,82,10,0.58)] bg-[rgba(232,82,10,0.16)] px-3 py-2 text-left text-[var(--cream)]"
                          : "flex w-full items-center border border-[rgba(240,232,218,0.08)] px-3 py-2 text-left text-[rgba(194,186,176,0.82)]"
                      }
                    >
                      {option}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-2">
                {practiceIndex < practiceQuestions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPracticeIndex((current) => Math.min(practiceQuestions.length - 1, current + 1));
                    }}
                    className="h-11 border border-[rgba(240,232,218,0.08)] px-5 text-[var(--cream)]"
                  >
                    Next
                  </button>
                ) : null}

                {practiceIndex >= practiceQuestions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      void submitPractice();
                    }}
                    disabled={isSubmittingPractice}
                    className="h-11 bg-[var(--fire)] px-5 font-semibold text-white disabled:opacity-60"
                  >
                    {isSubmittingPractice ? "Submitting..." : "Submit PYQ Practice"}
                  </button>
                ) : null}
              </div>
            </div>
          ) : selectedQuestion ? (
            <>
              <p className="mt-3 text-[1.9rem] font-semibold leading-tight text-[var(--cream)]">
                {selectedQuestion.question_text}
              </p>

              <div className="mt-4 space-y-2">
                {selectedQuestion.options.map((option) => {
                  const answerKey = selectedQuestion.correct_answer?.trim().toUpperCase();
                  const isCorrect = answerKey
                    ? option.trim().toUpperCase().startsWith(answerKey)
                    : false;
                  return (
                    <div
                      key={option}
                      className={
                        isCorrect
                          ? "border border-[rgba(34,197,94,0.65)] bg-[rgba(34,197,94,0.12)] px-3 py-2 text-emerald-300"
                          : "border border-[rgba(240,232,218,0.08)] px-3 py-2 text-[rgba(194,186,176,0.82)]"
                      }
                    >
                      {option}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowAnswer((current) => !current)}
                  className="inline-flex h-11 items-center gap-2 border border-[rgba(240,232,218,0.08)] px-4 text-[var(--cream)]"
                >
                  <Eye className="h-4 w-4" />
                  {showAnswer ? "Hide Answer" : "Show Answer"}
                </button>
                {selectedQuestion.source_url ? (
                  <Link
                    href={selectedQuestion.source_url}
                    target="_blank"
                    className="inline-flex h-11 items-center gap-2 border border-[rgba(240,232,218,0.08)] px-4 text-[var(--cream)]"
                  >
                    <Sparkles className="h-4 w-4" />
                    View Source
                  </Link>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/mock-tests"
                  className="inline-flex h-11 items-center bg-[var(--fire)] px-5 font-semibold text-white"
                >
                  Add to Mock
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    void startPractice();
                  }}
                  disabled={isStartingPractice}
                  className="inline-flex h-11 items-center border border-[rgba(240,232,218,0.08)] px-5 text-[var(--cream)] disabled:opacity-60"
                >
                  {isStartingPractice ? "Starting..." : "Start PYQ Practice"}
                </button>
              </div>

              {showAnswer ? (
                <div className="mt-4 border border-[rgba(34,197,94,0.42)] bg-[rgba(34,197,94,0.08)] p-3 text-[rgba(194,186,176,0.86)]">
                  <p className="font-semibold text-emerald-300">
                    Correct Answer: {selectedQuestion.correct_answer ?? "Unavailable"}
                  </p>
                  <p className="mt-2">
                    {selectedQuestion.explanation ??
                      "Detailed explanation is not available for this PYQ yet. Use the source link or grounded study chat for a walkthrough."}
                  </p>
                </div>
              ) : null}
            </>
          ) : (
            <p className="mt-4 text-sm text-[rgba(194,186,176,0.62)]">Select a question from the middle list.</p>
          )}
        </section>
      </section>
    </main>
  );
}

