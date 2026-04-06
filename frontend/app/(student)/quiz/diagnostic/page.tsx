"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import {
  fireButtonClass,
  ghostButtonClass,
  MetricCard,
  PageHeader,
  panelClass,
  ProgressBar,
  SectionLabel,
  StatusBadge,
} from "@/components/shared/brand-ui";
import QuizCard from "@/components/student/QuizCard";
import { api } from "@/lib/api";
import {
  type AnswerState,
  buildStoredQuizResult,
  buildTopicComparisons,
  type QuizQuestionsResponse,
  type SubmitQuizResponse,
  type WeaknessItem,
} from "@/lib/quiz-session";
import { cn } from "@/lib/utils";
import { useQuizStore } from "@/store/quizStore";

export default function DiagnosticQuizPage() {
  const router = useRouter();
  const setLatestResult = useQuizStore((state) => state.setLatestResult);

  const [questions, setQuestions] = useState<QuizQuestionsResponse["questions"]>([]);
  const [weaknessBefore, setWeaknessBefore] = useState<WeaknessItem[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questionStartedAt, setQuestionStartedAt] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const currentQuestion = questions[currentIndex] ?? null;
  const selectedAnswer = currentQuestion
    ? (answers[currentQuestion.id]?.selected_answer ?? null)
    : null;

  useEffect(() => {
    let cancelled = false;

    const loadDiagnosticQuiz = async () => {
      setIsLoading(true);
      setLoadError(null);
      setSubmitError(null);

      try {
        const quizResponse = await api.get<QuizQuestionsResponse>("/quiz/diagnostic");

        let weaknessData: WeaknessItem[] = [];
        try {
          const weaknessResponse = await api.get<WeaknessItem[]>("/analysis/weakness");
          weaknessData = weaknessResponse.data ?? [];
        } catch {
          weaknessData = [];
        }

        if (cancelled) {
          return;
        }

        setQuestions(quizResponse.data.questions ?? []);
        setWeaknessBefore(weaknessData);
        setAnswers({});
        setCurrentIndex(0);
        setQuestionStartedAt(Date.now());
      } catch (error) {
        const message =
          (error as { response?: { data?: { detail?: string } } }).response?.data
            ?.detail ?? "Unable to load diagnostic quiz right now.";
        if (!cancelled) {
          setLoadError(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadDiagnosticQuiz();

    return () => {
      cancelled = true;
    };
  }, []);

  const progressPercent = useMemo(() => {
    if (!questions.length) {
      return 0;
    }
    return Math.round(((currentIndex + 1) / questions.length) * 100);
  }, [currentIndex, questions.length]);

  const answeredCount = useMemo(
    () =>
      questions.filter((question) => Boolean(answers[question.id]?.selected_answer)).length,
    [answers, questions]
  );

  const handleSelectAnswer = (optionLetter: string) => {
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

  const handleNext = () => {
    if (currentIndex >= questions.length - 1) {
      return;
    }

    setCurrentIndex((index) => index + 1);
    setQuestionStartedAt(Date.now());
  };

  const handleSubmit = async () => {
    if (!questions.length) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        quiz_type: "diagnostic",
        answers: questions.map((question) => ({
          question_id: question.id,
          selected_answer: answers[question.id]?.selected_answer ?? "A",
          time_taken_s: answers[question.id]?.time_taken_s ?? 1,
        })),
      };

      const { data } = await api.post<SubmitQuizResponse>("/quiz/submit", payload);

      let weaknessAfter: WeaknessItem[] = [];
      try {
        const weaknessResponse = await api.get<WeaknessItem[]>("/analysis/weakness");
        weaknessAfter = weaknessResponse.data ?? [];
      } catch {
        weaknessAfter = [];
      }

      const topicComparisons = buildTopicComparisons(
        data.topic_scores ?? {},
        weaknessBefore,
        weaknessAfter
      );

      setLatestResult(
        buildStoredQuizResult(data, "diagnostic", topicComparisons, null)
      );

      router.push(`/quiz/result/${data.attempt_id}`);
    } catch (error) {
      const message =
        (error as { response?: { data?: { detail?: string } } }).response?.data
          ?.detail ?? "Unable to submit your diagnostic quiz.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading diagnostic quiz..." />;
  }

  if (loadError) {
    return (
      <main>
        <EmptyState
          icon="!"
          title="Diagnostic quiz unavailable"
          description={loadError}
          ctaLabel="Retry"
          ctaHref="/quiz/diagnostic"
        />
      </main>
    );
  }

  if (!currentQuestion) {
    return (
      <main>
        <EmptyState
          icon="?"
          title="No diagnostic questions available"
          description="Please ask an admin to verify question data and try again."
          ctaLabel="Go to Dashboard"
          ctaHref="/dashboard"
        />
      </main>
    );
  }

  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="Diagnostic mode"
        title="Diagnostic Quiz"
        description="Establish your baseline across core GATE CSE topics before the adaptive loop starts narrowing the pressure."
        badge={
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone="fire">Baseline assessment</StatusBadge>
            <StatusBadge tone="ice">{questions.length} questions</StatusBadge>
          </div>
        }
        actions={
          <Link href="/quiz" className={ghostButtonClass}>
            Back to Quiz Console
          </Link>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <QuizCard
          question={currentQuestion}
          selectedAnswer={selectedAnswer}
          onSelect={handleSelectAnswer}
        />

        <aside className={cn(panelClass, "space-y-6 p-6")}>
          <div className="space-y-3">
            <SectionLabel>Attempt progress</SectionLabel>
            <div>
              <p className="font-display text-5xl leading-none tracking-[0.08em] text-[var(--cream)]">
                {progressPercent}%
              </p>
              <p className="mt-2 text-sm text-[rgba(194,186,176,0.72)]">
                Question {currentIndex + 1} of {questions.length}
              </p>
            </div>
            <ProgressBar value={progressPercent} tone="fire" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <MetricCard
              label="Answered"
              value={answeredCount}
              helper={`${questions.length - answeredCount} remaining`}
              tone="fire"
            />
            <MetricCard
              label="Weak topics tracked"
              value={weaknessBefore.length}
              helper="Pre-quiz weakness snapshot loaded"
              tone="warning"
            />
          </div>

          <div className="rounded-[24px] border border-white/8 bg-white/4 p-4">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[rgba(194,186,176,0.6)]">
              Current question
            </p>
            <p className="mt-3 text-lg font-medium text-[var(--cream)]">
              {currentQuestion.topic_name}
            </p>
            <p className="mt-2 text-sm leading-7 text-[rgba(194,186,176,0.74)]">
              Stay deliberate. The diagnostic is meant to map truth, not chase a perfect score.
            </p>
          </div>
        </aside>
      </section>

      {submitError ? (
        <p className="rounded-[22px] border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {submitError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard" className={ghostButtonClass}>
          Back to Dashboard
        </Link>

        {isLastQuestion ? (
          <button
            type="button"
            disabled={isSubmitting || !selectedAnswer}
            onClick={handleSubmit}
            className={fireButtonClass}
          >
            {isSubmitting ? "Submitting..." : "Submit Quiz"}
          </button>
        ) : (
          <button
            type="button"
            disabled={!selectedAnswer}
            onClick={handleNext}
            className={fireButtonClass}
          >
            Next
          </button>
        )}
      </div>
    </main>
  );
}
