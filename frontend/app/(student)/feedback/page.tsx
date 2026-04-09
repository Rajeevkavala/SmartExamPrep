"use client";

import { useEffect, useMemo, useState } from "react";

import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import {
  fireButtonClass,
  inputClass,
  monoLabelClass,
  PageHeader,
  panelClass,
  StatusBadge,
  textareaClass,
} from "@/components/shared/brand-ui";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

type FeedbackPayload = {
  weakness_analysis_rating: number;
  recommendation_rating: number;
  revision_rating: number;
  ui_clarity_rating: number;
  overall_rating: number;
  comment: string;
  context_page: string;
};

type FeedbackRecord = FeedbackPayload & {
  feedback_id: string;
  created_at: string;
};

type RatingFieldKey =
  | "weakness_analysis_rating"
  | "recommendation_rating"
  | "revision_rating"
  | "ui_clarity_rating"
  | "overall_rating";

const RATING_FIELDS: Array<{
  key: RatingFieldKey;
  label: string;
  description: string;
}> = [
  {
    key: "weakness_analysis_rating",
    label: "Weakness Analysis",
    description: "Did the weakness breakdown feel accurate and actionable?",
  },
  {
    key: "recommendation_rating",
    label: "Recommendations",
    description: "Did the suggested quizzes and priorities feel relevant?",
  },
  {
    key: "revision_rating",
    label: "Revision Scheduling",
    description: "Did the revision plan help you decide what to revisit next?",
  },
  {
    key: "ui_clarity_rating",
    label: "UI Clarity",
    description: "Was the interface easy to understand while studying?",
  },
  {
    key: "overall_rating",
    label: "Overall Usefulness",
    description: "How useful was SmartExamPrep for your prep session overall?",
  },
];

export default function FeedbackPage() {
  const [form, setForm] = useState<FeedbackPayload>({
    weakness_analysis_rating: 4,
    recommendation_rating: 4,
    revision_rating: 4,
    ui_clarity_rating: 4,
    overall_rating: 4,
    comment: "",
    context_page: "dashboard",
  });
  const [history, setHistory] = useState<FeedbackRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const averageOverall = useMemo(() => {
    if (!history.length) {
      return 0;
    }
    return (
      history.reduce((sum, entry) => sum + entry.overall_rating, 0) / history.length
    ).toFixed(1);
  }, [history]);

  useEffect(() => {
    let cancelled = false;

    const loadFeedbackHistory = async () => {
      try {
        setLoadError(null);
        const { data } = await api.get<FeedbackRecord[]>("/feedback/me");
        if (!cancelled) {
          setHistory(data ?? []);
        }
      } catch (error) {
        const message =
          (error as { response?: { data?: { detail?: string } } }).response?.data
            ?.detail ?? "Unable to load previous feedback right now.";
        if (!cancelled) {
          setLoadError(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadFeedbackHistory();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const { data } = await api.post<FeedbackRecord>("/feedback/", form);
      setHistory((previous) => [data, ...previous].slice(0, 20));
      setForm((previous) => ({
        ...previous,
        comment: "",
      }));
      toast({
        title: "Feedback submitted",
        description: "Thanks. This helps us improve the product.",
      });
    } catch (error) {
      const message =
        (error as { response?: { data?: { detail?: string } } }).response?.data
          ?.detail ?? "Unable to submit feedback right now.";
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading feedback form..." />;
  }

  if (loadError) {
    return (
      <main>
        <EmptyState
          icon="!"
          title="Feedback unavailable"
          description={loadError}
          ctaLabel="Go to dashboard"
          ctaHref="/dashboard"
        />
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="Student feedback"
        title="TELL US WHAT HELPED AND WHAT DIDN'T."
        description="Rate how useful the AI guidance, revision flow, and interface felt during your prep."
        badge={<StatusBadge tone="ice">{history.length} past responses · avg {averageOverall}/5</StatusBadge>}
      />

      <section className={cn(panelClass, "space-y-5 p-6")}>
        {RATING_FIELDS.map((field) => (
          <div key={field.key} className="rounded-[24px] border border-white/8 bg-white/3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[var(--cream)]">{field.label}</p>
                <p className="mt-1 text-xs text-[rgba(194,186,176,0.58)]">{field.description}</p>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() =>
                      setForm((previous) => ({ ...previous, [field.key]: score }))
                    }
                    className={cn(
                      "h-10 w-10 rounded-full border font-mono text-[0.62rem] uppercase tracking-[0.22em] transition",
                      form[field.key] === score
                        ? "border-[rgba(232,82,10,0.22)] bg-[rgba(232,82,10,0.08)] text-[var(--cream)]"
                        : "border-white/10 bg-white/4 text-[rgba(194,186,176,0.72)]"
                    )}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}

        <div className="space-y-3">
          <label htmlFor="context_page" className={monoLabelClass}>
            Context page
          </label>
          <select
            id="context_page"
            value={form.context_page}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                context_page: event.target.value,
              }))
            }
            className={cn(inputClass, "mt-0 rounded-full border border-white/10 px-4")}
          >
            <option value="dashboard">Dashboard</option>
            <option value="quiz_result">Quiz Result</option>
            <option value="adaptive_quiz">Adaptive Quiz</option>
            <option value="revision">Revision</option>
            <option value="onboarding">Onboarding</option>
          </select>
        </div>

        <div className="space-y-3">
          <label htmlFor="comment" className={monoLabelClass}>
            Free-text comments
          </label>
          <textarea
            id="comment"
            value={form.comment}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                comment: event.target.value,
              }))
            }
            rows={5}
            placeholder="What felt useful, confusing, inaccurate, or missing?"
            className={textareaClass}
          />
        </div>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleSubmit}
          className={fireButtonClass}
        >
          {isSubmitting ? "Submitting..." : "Submit feedback"}
        </button>
      </section>

      <section className={cn(panelClass, "p-6")}>
        <div className="flex items-center justify-between gap-3">
          <p className="font-display text-3xl tracking-[0.08em] text-[var(--cream)]">
            Recent submissions
          </p>
          <StatusBadge tone="warning">{history.length} saved</StatusBadge>
        </div>

        {history.length === 0 ? (
          <p className="mt-4 text-sm text-[rgba(194,186,176,0.68)]">
            No feedback submitted yet. Your first entry will show up here.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {history.map((entry) => (
              <article
                key={entry.feedback_id}
                className="rounded-[22px] border border-white/8 bg-white/3 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-[var(--cream)]">
                    Overall {entry.overall_rating}/5
                  </p>
                  <p className="text-xs text-[rgba(194,186,176,0.58)]">
                    {new Date(entry.created_at).toLocaleString()}
                  </p>
                </div>
                <p className="mt-2 text-xs text-[rgba(194,186,176,0.58)]">
                  Weakness {entry.weakness_analysis_rating}/5 · Recommendations{" "}
                  {entry.recommendation_rating}/5 · Revision {entry.revision_rating}/5 · UI{" "}
                  {entry.ui_clarity_rating}/5
                </p>
                {entry.comment ? (
                  <p className="mt-3 text-sm leading-7 text-[rgba(194,186,176,0.74)]">
                    {entry.comment}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
