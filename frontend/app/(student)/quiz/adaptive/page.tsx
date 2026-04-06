"use client";

import Link from "next/link";
import { Pause, Play, Send } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { api, isRequestCanceled } from "@/lib/api";
import {
  type AnswerState,
  buildStoredQuizResult,
  buildTopicComparisons,
  type QuizQuestionsResponse,
  type SubmitQuizResponse,
  type WeaknessItem,
} from "@/lib/quiz-session";
import { type QuizContextPayload, useQuizStore } from "@/store/quizStore";

const DEFAULT_DURATION_SECONDS = 60 * 60;

type MockSessionResponse = {
  session_id: string;
  mock_type: string;
  time_limit_seconds: number;
  question_count: number;
  questions: QuizQuestionsResponse["questions"];
  context_payload: QuizContextPayload | null;
};

const parseOption = (optionText: string, fallbackIndex: number) => {
  const fallbackLetter = String.fromCharCode(65 + fallbackIndex);
  const trimmed = optionText.trim();
  const match = trimmed.match(/^([A-D])[).:\-\s]+(.*)$/i);

  if (!match) {
    return {
      letter: fallbackLetter,
      label: trimmed,
    };
  }

  return {
    letter: match[1].toUpperCase(),
    label: match[2].trim() || trimmed,
  };
};

const formatDuration = (totalSeconds: number) => {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((safe % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(safe % 60)
    .toString()
    .padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
};

export default function AdaptiveQuizPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setLatestResult = useQuizStore((state) => state.setLatestResult);

  const mockSessionId = searchParams.get("mock_session_id");
  const requestedCount = Math.max(
    1,
    Math.min(60, Number(searchParams.get("questionCount") ?? "30") || 30)
  );
  const requestedDuration = Math.max(
    300,
    Number(searchParams.get("timeLimitSeconds") ?? String(DEFAULT_DURATION_SECONDS)) ||
      DEFAULT_DURATION_SECONDS
  );

  const [questions, setQuestions] = useState<QuizQuestionsResponse["questions"]>([]);
  const [weaknessBefore, setWeaknessBefore] = useState<WeaknessItem[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [reviewFlags, setReviewFlags] = useState<Record<string, boolean>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questionStartedAt, setQuestionStartedAt] = useState(Date.now());
  const [remainingSeconds, setRemainingSeconds] = useState(requestedDuration);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [weaknessBaselineWarning, setWeaknessBaselineWarning] = useState<string | null>(null);
  const [sessionContextPayload, setSessionContextPayload] =
    useState<QuizContextPayload | null>(null);
  const loadAbortRef = useRef<AbortController | null>(null);

  const fallbackContextPayload = useMemo<QuizContextPayload | null>(() => {
    if (mockSessionId) {
      return null;
    }

    const source = searchParams.get("source");
    const taskId = searchParams.get("taskId");
    const mode = searchParams.get("mode");

    const payload: QuizContextPayload & {
      mock_mode?: string;
      mock_exam?: string;
      mock_type?: string;
      mock_question_count?: number;
      mock_time_limit_seconds?: number;
      mock_year_filter?: string;
    } = {};

    if (taskId) {
      payload.daily_task_id = taskId;
      payload.source = "daily_planner";
      payload.planner_task_type = "practice";
    } else if (mode) {
      payload.source = "mock_test";
      payload.mock_mode = mode;
      payload.mock_exam = searchParams.get("exam") ?? undefined;
      payload.mock_type = searchParams.get("mockType") ?? undefined;
      payload.mock_question_count = requestedCount;
      payload.mock_time_limit_seconds = requestedDuration;
      payload.mock_year_filter = searchParams.get("yearFilter") ?? undefined;
    } else if (source) {
      payload.source = source === "planner" ? "daily_planner" : source;
    }

    return Object.keys(payload).length > 0 ? payload : null;
  }, [mockSessionId, requestedCount, requestedDuration, searchParams]);

  const contextPayload = sessionContextPayload ?? fallbackContextPayload;
  const currentQuestion = questions[currentIndex] ?? null;

  const answeredCount = useMemo(
    () => questions.filter((question) => Boolean(answers[question.id]?.selected_answer)).length,
    [answers, questions]
  );

  const pseudoAccuracy = useMemo(() => {
    if (questions.length === 0) {
      return 0;
    }

    return (answeredCount / questions.length) * 100;
  }, [answeredCount, questions.length]);

  const submitQuiz = useCallback(async () => {
    if (!questions.length) {
      return;
    }

    const firstUnansweredIndex = questions.findIndex(
      (question) => !answers[question.id]?.selected_answer
    );
    if (firstUnansweredIndex !== -1) {
      setCurrentIndex(firstUnansweredIndex);
      setQuestionStartedAt(Date.now());
      setSubmitError(
        `Please answer all questions before submitting. ${questions.length - answeredCount} unanswered question(s) remaining.`
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const resolvedQuizType =
        typeof contextPayload?.mock_type === "string" && contextPayload.mock_type.trim()
          ? contextPayload.mock_type
          : "adaptive";

      const payload = {
        quiz_type: resolvedQuizType,
        answers: questions.map((question) => {
          const selected = answers[question.id];
          if (!selected?.selected_answer) {
            throw new Error(`Missing answer for question ${question.id}`);
          }

          return {
            question_id: question.id,
            selected_answer: selected.selected_answer,
            time_taken_s: selected.time_taken_s ?? 1,
          };
        }),
        context_payload: contextPayload,
      };

      const { data } = await api.post<SubmitQuizResponse>("/quiz/submit", payload);

      let weaknessAfter: WeaknessItem[] = [];
      try {
        const weaknessResponse = await api.get<WeaknessItem[]>("/analysis/weakness");
        weaknessAfter = weaknessResponse.data ?? [];
      } catch (error) {
        if (!isRequestCanceled(error)) {
          setWeaknessBaselineWarning(
            "Weakness baseline could not be refreshed after submission. Result analytics may be partially degraded."
          );
        }
        weaknessAfter = [];
      }

      const topicComparisons = buildTopicComparisons(
        data.topic_scores ?? {},
        weaknessBefore,
        weaknessAfter
      );

      setLatestResult(
        buildStoredQuizResult(data, resolvedQuizType, topicComparisons, contextPayload)
      );

      router.push(`/quiz/result/${data.attempt_id}`);
    } catch (error) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Unable to submit your mock session.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    answeredCount,
    answers,
    contextPayload,
    questions,
    router,
    setLatestResult,
    weaknessBefore,
  ]);

  useEffect(() => {
    let cancelled = false;

    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;

    const loadAdaptiveQuiz = async () => {
      setIsLoading(true);
      setLoadError(null);
      setSubmitError(null);
      setWeaknessBaselineWarning(null);
      setSessionContextPayload(null);

      try {
        let loadedQuestions: QuizQuestionsResponse["questions"] = [];
        let nextDuration = requestedDuration;
        let nextContextPayload: QuizContextPayload | null = null;

        if (mockSessionId) {
          const { data } = await api.get<MockSessionResponse>(
            `/quiz/mock-session/${mockSessionId}`,
            {
              signal: controller.signal,
            }
          );
          loadedQuestions = data.questions ?? [];
          nextDuration = Number(data.time_limit_seconds) || requestedDuration;
          nextContextPayload = data.context_payload ?? null;
        } else {
          const quizResponse = await api.get<QuizQuestionsResponse>("/quiz/adaptive", {
            signal: controller.signal,
          });
          loadedQuestions = (quizResponse.data.questions ?? []).slice(0, requestedCount);
          nextContextPayload = null;
        }

        let weaknessData: WeaknessItem[] = [];
        try {
          const weaknessResponse = await api.get<WeaknessItem[]>("/analysis/weakness", {
            signal: controller.signal,
          });
          weaknessData = weaknessResponse.data ?? [];
        } catch (error) {
          if (!isRequestCanceled(error)) {
            setWeaknessBaselineWarning(
              "Weakness baseline is currently unavailable. Quiz can continue, but comparisons may be limited."
            );
          }
          weaknessData = [];
        }

        if (cancelled) {
          return;
        }

        if (!loadedQuestions.length) {
          setLoadError("No questions were returned for this session.");
          setQuestions([]);
          return;
        }

        setQuestions(loadedQuestions);
        setWeaknessBefore(weaknessData);
        setAnswers({});
        setReviewFlags({});
        setCurrentIndex(0);
        setQuestionStartedAt(Date.now());
        setRemainingSeconds(nextDuration);
        setSessionContextPayload(nextContextPayload);
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (isRequestCanceled(error)) {
          return;
        }

        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 404 || status === 410) {
          setLoadError(
            "This mock session has expired or is no longer available. Please start a new mock session."
          );
          return;
        }

        const message =
          (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
          "Unable to load mock test session right now.";
        setLoadError(message);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadAdaptiveQuiz();

    return () => {
      cancelled = true;
      controller.abort();
      if (loadAbortRef.current === controller) {
        loadAbortRef.current = null;
      }
    };
  }, [mockSessionId, requestedCount, requestedDuration]);

  useEffect(() => {
    if (isLoading || isPaused || isSubmitting || remainingSeconds <= 0 || questions.length === 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [isLoading, isPaused, isSubmitting, questions.length, remainingSeconds]);

  useEffect(() => {
    if (remainingSeconds !== 0 || isSubmitting || questions.length === 0) {
      return;
    }

    void submitQuiz();
  }, [isSubmitting, questions.length, remainingSeconds, submitQuiz]);

  const selectAnswer = (optionLetter: string) => {
    if (!currentQuestion) {
      return;
    }

    const elapsedSeconds = Math.max((Date.now() - questionStartedAt) / 1000, 1);
    setAnswers((previous) => ({
      ...previous,
      [currentQuestion.id]: {
        selected_answer: optionLetter,
        time_taken_s: Number(elapsedSeconds.toFixed(2)),
      },
    }));
  };

  if (isLoading) {
    return <LoadingSpinner message="Starting mock session..." />;
  }

  if (loadError) {
    return (
      <main>
        <EmptyState
          icon="!"
          title="Mock session unavailable"
          description={loadError}
          ctaLabel="Back to Mock Tests"
          ctaHref="/mock-tests"
        />
      </main>
    );
  }

  if (!currentQuestion) {
    return (
      <main>
        <EmptyState
          icon="?"
          title="No questions ready"
          description="No adaptive questions were returned. Please retry with another session setup."
          ctaLabel="Back to Mock Tests"
          ctaHref="/mock-tests"
        />
      </main>
    );
  }

  const parsedOptions = currentQuestion.options.map((option, index) =>
    parseOption(option, index)
  );

  return (
    <main className="space-y-4">
      <section className="flex flex-wrap items-center justify-between border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] px-4 py-3">
        <div className="flex flex-wrap items-center gap-4 text-[var(--cream)]">
          <p className="text-4xl font-semibold">Timer: {formatDuration(remainingSeconds)}</p>
          <p className="text-2xl text-[rgba(194,186,176,0.75)]">
            Progress: {answeredCount}/{questions.length}
          </p>
          <p className="text-2xl text-[rgba(194,186,176,0.75)]">
            Accuracy: {pseudoAccuracy.toFixed(1)}%
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsPaused((value) => !value)}
            className="inline-flex h-11 items-center gap-2 border border-[rgba(240,232,218,0.08)] px-5 text-[var(--cream)]"
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            {isPaused ? "Resume" : "Pause"}
          </button>

          <button
            type="button"
            onClick={() => {
              void submitQuiz();
            }}
            disabled={isSubmitting}
            className="inline-flex h-11 items-center gap-2 bg-[#f15151] px-5 text-white disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {isSubmitting ? "Submitting" : "Submit"}
          </button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[280px_1fr]">
        <aside className="space-y-4 border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-4">
          <div>
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-[rgba(194,186,176,0.58)]">
              Question Navigator
            </p>
            <div className="mt-3 grid grid-cols-5 gap-1">
              {questions.map((question, index) => {
                const answered = Boolean(answers[question.id]?.selected_answer);
                const review = Boolean(reviewFlags[question.id]);
                const active = index === currentIndex;

                const className = active
                  ? "border border-[rgba(232,82,10,0.55)] bg-[rgba(232,82,10,0.2)] text-[var(--cream)]"
                  : review
                    ? "border border-[rgba(245,158,11,0.45)] bg-[rgba(245,158,11,0.14)] text-amber-300"
                    : answered
                      ? "border border-[rgba(34,197,94,0.45)] bg-[rgba(34,197,94,0.14)] text-emerald-300"
                      : "border border-[rgba(240,232,218,0.08)] text-[rgba(194,186,176,0.76)]";

                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => {
                      setCurrentIndex(index);
                      setQuestionStartedAt(Date.now());
                    }}
                    className={`h-10 ${className}`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-sm text-[rgba(194,186,176,0.6)]">
            <p>Legend: Green Answered · Orange Review · Gray Skipped</p>
            <p className="mt-1">This session came from a validated backend question set.</p>
          </div>

          <div className="border border-[rgba(240,232,218,0.08)] p-3">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[rgba(194,186,176,0.58)]">
              Calculator
            </p>
            <div className="mt-2 h-10 border border-[rgba(240,232,218,0.08)] px-3 text-[rgba(194,186,176,0.62)]">
              (12*4)+6
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="h-9 border border-[rgba(240,232,218,0.08)] text-[var(--cream)]"
              >
                Evaluate
              </button>
              <button
                type="button"
                className="h-9 border border-[rgba(240,232,218,0.08)] text-[rgba(194,186,176,0.72)]"
              >
                Clear
              </button>
            </div>
          </div>
        </aside>

        <section className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-4">
          {weaknessBaselineWarning ? (
            <p className="mb-3 border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.02)] px-3 py-2 text-sm text-[rgba(194,186,176,0.86)]">
              {weaknessBaselineWarning}
            </p>
          ) : null}

          <p className="text-2xl text-[rgba(194,186,176,0.68)]">
            Question {currentIndex + 1} · {currentQuestion.difficulty.toUpperCase()} ·{" "}
            {currentQuestion.topic_name}
          </p>
          <h1 className="mt-3 text-[2.2rem] leading-tight text-[var(--cream)]">
            {currentQuestion.question_text}
          </h1>

          <div className="mt-4 space-y-2">
            {parsedOptions.map((option) => {
              const selected = answers[currentQuestion.id]?.selected_answer === option.letter;
              return (
                <button
                  key={`${currentQuestion.id}-${option.letter}`}
                  type="button"
                  onClick={() => selectAnswer(option.letter)}
                  className={
                    selected
                      ? "flex w-full items-center gap-3 border border-[rgba(232,82,10,0.45)] bg-[rgba(232,82,10,0.12)] px-3 py-4 text-left text-[var(--cream)]"
                      : "flex w-full items-center gap-3 border border-[rgba(240,232,218,0.08)] px-3 py-4 text-left text-[rgba(194,186,176,0.84)]"
                  }
                >
                  <span className="h-3 w-3 rounded-full border border-current" />
                  <span>
                    {option.letter}. {option.label}
                  </span>
                </button>
              );
            })}
          </div>

          <label className="mt-4 inline-flex items-center gap-3 text-[var(--cream)]">
            <input
              type="checkbox"
              checked={Boolean(reviewFlags[currentQuestion.id])}
              onChange={(event) =>
                setReviewFlags((current) => ({
                  ...current,
                  [currentQuestion.id]: event.target.checked,
                }))
              }
              className="h-5 w-5 border border-[rgba(240,232,218,0.2)] bg-transparent"
            />
            Mark for review
          </label>

          {submitError ? (
            <p className="mt-3 text-sm text-rose-300">{submitError}</p>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(240,232,218,0.08)] pt-4">
            <button
              type="button"
              onClick={() => {
                setCurrentIndex((index) => Math.max(0, index - 1));
                setQuestionStartedAt(Date.now());
              }}
              disabled={currentIndex === 0}
              className="h-11 border border-[rgba(240,232,218,0.08)] px-6 text-[var(--cream)] disabled:opacity-50"
            >
              Previous
            </button>

            <div className="flex gap-2">
              {currentIndex < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    setCurrentIndex((index) => Math.min(questions.length - 1, index + 1));
                    setQuestionStartedAt(Date.now());
                  }}
                  className="h-11 border border-[rgba(240,232,218,0.08)] px-6 text-[var(--cream)]"
                >
                  Next
                </button>
              ) : null}

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  void submitQuiz();
                }}
                className="h-11 bg-[#f15151] px-6 text-white disabled:opacity-60"
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>

          <div className="mt-4 text-sm text-[rgba(194,186,176,0.62)]">
            <Link href="/mock-tests" className="text-[var(--ice)] hover:underline">
              Exit session
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}
