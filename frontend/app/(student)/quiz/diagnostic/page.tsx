"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import QuizCard, { type QuizQuestion } from "@/components/student/QuizCard";
import { api } from "@/lib/api";
import {
  type MasteryLevel,
  type TopicComparison,
  type TopicWeaknessSnapshot,
  useQuizStore,
} from "@/store/quizStore";

type QuizQuestionsResponse = {
  questions: QuizQuestion[];
  total: number;
};

type WeaknessItem = {
  topic_id: string;
  topic_name: string;
  subject_name: string;
  weakness_score: number;
  mastery_level: string;
  accuracy: number;
};

type SubmitQuizResponse = {
  attempt_id: string;
  score: number;
  correct_count: number;
  total_questions: number;
  topic_scores: Record<string, number>;
};

type AnswerState = {
  selected_answer: string;
  time_taken_s: number;
};

const normalizeTopic = (topicName: string) => topicName.trim().toLowerCase();

const toMasteryLevel = (value: string): MasteryLevel => {
  if (value === "Weak" || value === "Strong" || value === "Moderate") {
    return value;
  }

  const normalized = value.toLowerCase();
  if (normalized === "weak") {
    return "Weak";
  }
  if (normalized === "strong") {
    return "Strong";
  }
  return "Moderate";
};

const toWeaknessSnapshot = (item: WeaknessItem): TopicWeaknessSnapshot => ({
  topic_id: item.topic_id,
  topic_name: item.topic_name,
  subject_name: item.subject_name,
  weakness_score: item.weakness_score,
  mastery_level: toMasteryLevel(item.mastery_level),
  accuracy: item.accuracy,
});

const buildTopicComparisons = (
  topicScores: Record<string, number>,
  beforeWeakness: WeaknessItem[],
  afterWeakness: WeaknessItem[]
): TopicComparison[] => {
  const beforeMap = new Map(
    beforeWeakness.map((item) => [normalizeTopic(item.topic_name), item])
  );
  const afterMap = new Map(
    afterWeakness.map((item) => [normalizeTopic(item.topic_name), item])
  );

  return Object.entries(topicScores).map(([topicName, score]) => {
    const normalized = normalizeTopic(topicName);
    const before = beforeMap.get(normalized);
    const after = afterMap.get(normalized);

    return {
      topic_id: after?.topic_id ?? before?.topic_id ?? topicName,
      topic_name: topicName,
      subject_name: after?.subject_name ?? before?.subject_name ?? "General",
      topic_score_pct: score,
      before: before ? toWeaknessSnapshot(before) : undefined,
      after: after ? toWeaknessSnapshot(after) : undefined,
    };
  });
};

export default function DiagnosticQuizPage() {
  const router = useRouter();
  const setLatestResult = useQuizStore((state) => state.setLatestResult);

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
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

  const handleSelectAnswer = (optionLetter: string) => {
    if (!currentQuestion) {
      return;
    }

    const elapsedSeconds = Math.max((Date.now() - questionStartedAt) / 1000, 1);

    setAnswers((prev) => ({
      ...prev,
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

      const submitResponse = await api.post<SubmitQuizResponse>(
        "/quiz/submit",
        payload
      );

      let weaknessAfter: WeaknessItem[] = [];
      try {
        const weaknessResponse = await api.get<WeaknessItem[]>("/analysis/weakness");
        weaknessAfter = weaknessResponse.data ?? [];
      } catch {
        weaknessAfter = [];
      }

      const topicComparisons = buildTopicComparisons(
        submitResponse.data.topic_scores ?? {},
        weaknessBefore,
        weaknessAfter
      );

      setLatestResult({
        attempt_id: submitResponse.data.attempt_id,
        quiz_type: "diagnostic",
        score: submitResponse.data.score,
        correct_count: submitResponse.data.correct_count,
        total_questions: submitResponse.data.total_questions,
        topic_scores: submitResponse.data.topic_scores,
        topic_comparisons: topicComparisons,
        submitted_at: new Date().toISOString(),
      });

      router.push(`/quiz/result/${submitResponse.data.attempt_id}`);
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
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <EmptyState
          icon="⚠"
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
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <EmptyState
          icon="🧠"
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
    <main className="mx-auto w-full max-w-4xl space-y-5 px-4 py-8">
      <header className="rounded-2xl border border-slate-800 bg-linear-to-r from-slate-900 to-indigo-950 p-5">
        <h1 className="text-2xl font-bold text-white">Diagnostic Quiz</h1>
        <p className="mt-2 text-sm text-slate-300">
          Baseline assessment across your core GATE CSE topics.
        </p>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span>{progressPercent}% complete</span>
          </div>
          <div className="h-2 rounded-full bg-slate-700">
            <div
              className="h-2 rounded-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </header>

      <QuizCard
        question={currentQuestion}
        selectedAnswer={selectedAnswer}
        onSelect={handleSelectAnswer}
      />

      {submitError ? (
        <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
          {submitError}
        </p>
      ) : null}

      <div className="flex items-center justify-end">
        {isLastQuestion ? (
          <button
            type="button"
            disabled={isSubmitting || !selectedAnswer}
            onClick={handleSubmit}
            className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Submitting..." : "Submit Quiz"}
          </button>
        ) : (
          <button
            type="button"
            disabled={!selectedAnswer}
            onClick={handleNext}
            className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Next
          </button>
        )}
      </div>
    </main>
  );
}
