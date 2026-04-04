"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ArrowLeft, CheckCircle2, Plus, RefreshCw } from "lucide-react";
import type { z, ZodIssue } from "zod";

import type { AdminQuestion } from "@/components/admin/QuestionFormModal";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import QuizCard from "@/components/student/QuizCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminApi } from "@/lib/api";
import { questionSchema } from "@/lib/validations";

type SubjectOption = {
  id: string;
  name: string;
};

type TopicOption = {
  id: string;
  subject_id: string;
  name: string;
};

type QuestionFormValues = z.input<typeof questionSchema>;

const getErrorMessage = (error: unknown) => {
  const detail = (error as { response?: { data?: { detail?: string } } })
    ?.response?.data?.detail;

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  return "Unable to complete this request right now.";
};

const normalizeIndexedStringArray = (
  value: unknown,
  expectedLength?: number
) => {
  const next: string[] = [];

  if (Array.isArray(value)) {
    value.forEach((item) => {
      next.push(typeof item === "string" ? item : String(item ?? ""));
    });
  } else if (value && typeof value === "object") {
    const indexed = value as Record<string, unknown>;
    Object.keys(indexed)
      .sort((a, b) => Number(a) - Number(b))
      .forEach((key) => {
        const item = indexed[key];
        next.push(typeof item === "string" ? item : String(item ?? ""));
      });
  }

  if (typeof expectedLength === "number") {
    while (next.length < expectedLength) {
      next.push("");
    }
    return next.slice(0, expectedLength);
  }

  return next;
};

const ensureOptionArray = (values?: unknown) => {
  const next = normalizeIndexedStringArray(values, 4);
  while (next.length < 4) {
    next.push("");
  }
  return next;
};

const toDifficulty = (value: string | undefined): "easy" | "medium" | "hard" => {
  const normalized = (value ?? "").toLowerCase();
  if (normalized === "easy" || normalized === "medium" || normalized === "hard") {
    return normalized;
  }
  return "medium";
};

const toSourceType = (
  value: string | undefined
): "PYQ" | "practice" | "scraped" => {
  if (value === "PYQ" || value === "practice" || value === "scraped") {
    return value;
  }
  return "practice";
};

const buildDefaultValues = (question?: AdminQuestion): QuestionFormValues => ({
  subject_id: question?.subject_id ?? "",
  topic_id: question?.topic_id ?? "",
  subtopic: question?.subtopic ?? "",
  question_text: question?.question_text ?? "",
  options: ensureOptionArray(question?.options),
  question_image_urls: Array.isArray(question?.question_image_urls)
    ? question.question_image_urls
    : [],
  correct_answer: question?.correct_answer ?? "A",
  explanation: question?.explanation ?? "",
  difficulty: toDifficulty(question?.difficulty),
  source_type: toSourceType(question?.source_type),
  source_url: question?.source_url ?? "",
  year: question?.year ?? undefined,
});

export default function AdminQuestionDetailPage() {
  const params = useParams<{ id: string }>();
  const questionId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [question, setQuestion] = useState<AdminQuestion | null>(null);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [topics, setTopics] = useState<TopicOption[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [previewAnswer, setPreviewAnswer] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    getValues,
    setError,
    clearErrors,
    formState: { errors, isDirty },
  } = useForm<QuestionFormValues>({
    defaultValues: buildDefaultValues(),
  });

  const watchedSubjectId = watch("subject_id");
  const watchedTopicId = watch("topic_id");
  const watchedQuestionText = watch("question_text");
  const watchedOptions = watch("options");
  const watchedImages = normalizeIndexedStringArray(watch("question_image_urls"));
  const watchedDifficulty = watch("difficulty");
  const watchedSubtopic = watch("subtopic");

  useEffect(() => {
    let cancelled = false;

    const loadQuestion = async (showSkeleton: boolean) => {
      if (!questionId) {
        return;
      }

      if (showSkeleton) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        setLoadError(null);
        setActionError(null);

        const [questionResponse, subjectsResponse] = await Promise.all([
          adminApi.get<AdminQuestion>(`/questions/${questionId}`),
          adminApi.get<SubjectOption[]>("/content/subjects"),
        ]);

        if (cancelled) {
          return;
        }

        const nextQuestion = questionResponse.data;
        const nextSubjects = Array.isArray(subjectsResponse.data)
          ? subjectsResponse.data
          : [];

        setQuestion(nextQuestion);
        setSubjects(nextSubjects);
        setPreviewAnswer(null);
        reset(buildDefaultValues(nextQuestion));
      } catch (error) {
        if (!cancelled) {
          setLoadError(getErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    void loadQuestion(true);

    return () => {
      cancelled = true;
    };
  }, [questionId, reset]);

  useEffect(() => {
    let cancelled = false;

    const loadTopicsForSubject = async () => {
      if (!watchedSubjectId) {
        setTopics([]);
        setValue("topic_id", "");
        return;
      }

      try {
        const { data } = await adminApi.get<TopicOption[]>(
          `/content/subjects/${watchedSubjectId}/topics`
        );

        if (cancelled) {
          return;
        }

        const nextTopics = Array.isArray(data) ? data : [];
        const currentTopicId = getValues("topic_id");
        setTopics(nextTopics);

        if (!nextTopics.some((topic) => topic.id === currentTopicId)) {
          setValue("topic_id", "");
        }
      } catch {
        if (!cancelled) {
          setTopics([]);
        }
      }
    };

    void loadTopicsForSubject();

    return () => {
      cancelled = true;
    };
  }, [getValues, setValue, watchedSubjectId]);

  const selectedSubjectName =
    subjects.find((subject) => subject.id === watchedSubjectId)?.name ??
    question?.subject_name ??
    "Subject";

  const selectedTopicName =
    topics.find((topic) => topic.id === watchedTopicId)?.name ??
    question?.topic_name ??
    "Topic";

  const previewQuestion = useMemo(
    () => ({
      id: questionId || "preview-question",
      question_text:
        watchedQuestionText && watchedQuestionText.trim().length > 0
          ? watchedQuestionText
          : "Type question text to preview it here.",
      options: ensureOptionArray(watchedOptions).map((option, index) => {
        if (option.trim().length > 0) {
          return option;
        }
        const fallbackLetter = String.fromCharCode(65 + index);
        return `${fallbackLetter}. Option ${index + 1}`;
      }),
      question_image_urls: watchedImages,
      difficulty: watchedDifficulty || "medium",
      subject_name: selectedSubjectName,
      topic_name: selectedTopicName,
      subtopic: watchedSubtopic || undefined,
    }),
    [
      questionId,
      watchedQuestionText,
      watchedOptions,
      watchedImages,
      watchedDifficulty,
      selectedSubjectName,
      selectedTopicName,
      watchedSubtopic,
    ]
  );

  const addImageField = () => {
    setValue("question_image_urls", [...watchedImages, ""], {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const updateImageField = (index: number, value: string) => {
    const next = [...watchedImages];
    next[index] = value;
    setValue("question_image_urls", next, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const removeImageField = (index: number) => {
    setValue(
      "question_image_urls",
      watchedImages.filter((_, imageIndex) => imageIndex !== index),
      {
        shouldDirty: true,
        shouldValidate: true,
      }
    );
  };

  const applySchemaErrors = (issues: ZodIssue[]) => {
    clearErrors();

    issues.forEach((issue) => {
      const [head, second] = issue.path;

      if (head === "options" && typeof second === "number") {
        setError(`options.${second}` as any, {
          type: "manual",
          message: issue.message,
        });
        return;
      }

      if (head === "question_image_urls" && typeof second === "number") {
        setError(`question_image_urls.${second}` as any, {
          type: "manual",
          message: issue.message,
        });
        return;
      }

      if (typeof head === "string") {
        setError(head as any, {
          type: "manual",
          message: issue.message,
        });
      }
    });
  };

  const saveChanges = async (values: QuestionFormValues) => {
    if (!questionId) {
      return;
    }

    setIsSaving(true);
    setActionError(null);

    try {
      const normalizedOptions = [0, 1, 2, 3].map((index) => {
        const current = getValues(`options.${index}` as any);
        return typeof current === "string" ? current : String(current ?? "");
      });

      const payloadCandidate: QuestionFormValues = {
        ...values,
        options: normalizedOptions,
        question_image_urls: watchedImages,
      };

      const parsed = questionSchema.safeParse(payloadCandidate);
      if (!parsed.success) {
        applySchemaErrors(parsed.error.issues);
        setActionError("Please fix validation errors and try again.");
        return;
      }

      const { data } = await adminApi.put<AdminQuestion>(
        `/questions/${questionId}`,
        parsed.data
      );
      setQuestion(data);
      reset(buildDefaultValues(data));
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const verifyQuestion = async () => {
    if (!questionId || !question || question.is_verified || isVerifying) {
      return;
    }

    setIsVerifying(true);
    setActionError(null);

    try {
      await adminApi.post(`/questions/${questionId}/verify`);
      setQuestion({ ...question, is_verified: true });
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setIsVerifying(false);
    }
  };

  const refreshDetail = async () => {
    if (!questionId) {
      return;
    }

    setIsRefreshing(true);
    setActionError(null);

    try {
      const { data } = await adminApi.get<AdminQuestion>(`/questions/${questionId}`);
      setQuestion(data);
      reset(buildDefaultValues(data));
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!questionId) {
    return (
      <EmptyState
        icon="⚠"
        title="Missing question id"
        description="No question identifier was provided in this route."
        ctaLabel="Back to Questions"
        ctaHref="/admin/questions"
      />
    );
  }

  if (isLoading) {
    return <LoadingSpinner message="Loading question detail..." />;
  }

  if (loadError || !question) {
    return (
      <EmptyState
        icon="⚠"
        title="Question unavailable"
        description={loadError ?? "This question could not be found."}
        ctaLabel="Back to Questions"
        ctaHref="/admin/questions"
      />
    );
  }

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-slate-800 bg-linear-to-r from-slate-900 to-indigo-950 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/admin/questions"
              className="inline-flex items-center gap-1 text-sm text-indigo-300 hover:text-indigo-200"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to Questions
            </Link>

            <h1 className="mt-2 text-3xl font-bold text-white">Question Detail</h1>
            <p className="mt-2 text-sm text-slate-300">
              Edit the question and validate how it appears in the student quiz UI.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
            onClick={() => void refreshDetail()}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`mr-1 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              aria-hidden
            />
            Refresh
          </Button>
        </div>
      </header>

      {actionError ? (
        <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
          {actionError}
        </p>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <form className="space-y-5" onSubmit={handleSubmit(saveChanges)}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="subject_id" className="text-sm text-slate-300">
                  Subject
                </label>
                <select
                  id="subject_id"
                  {...register("subject_id")}
                  className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-500"
                >
                  <option value="">Select subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
                {errors.subject_id ? (
                  <p className="text-xs text-rose-300">
                    {String(errors.subject_id.message)}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="topic_id" className="text-sm text-slate-300">
                  Topic
                </label>
                <select
                  id="topic_id"
                  {...register("topic_id")}
                  className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-500"
                >
                  <option value="">Select topic</option>
                  {topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.name}
                    </option>
                  ))}
                </select>
                {errors.topic_id ? (
                  <p className="text-xs text-rose-300">
                    {String(errors.topic_id.message)}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="question_text" className="text-sm text-slate-300">
                Question Text
              </label>
              <textarea
                id="question_text"
                rows={4}
                {...register("question_text")}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-indigo-500"
              />
              {errors.question_text ? (
                <p className="text-xs text-rose-300">
                  {String(errors.question_text.message)}
                </p>
              ) : null}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {(["A", "B", "C", "D"] as const).map((letter, index) => (
                <div key={letter} className="space-y-1.5">
                  <label htmlFor={`option-${letter}`} className="text-sm text-slate-300">
                    Option {letter}
                  </label>
                  <Input
                    id={`option-${letter}`}
                    {...register(`options.${index}`)}
                    className="h-9 border-slate-700 bg-slate-900 text-slate-100"
                  />
                  {errors.options?.[index] ? (
                    <p className="text-xs text-rose-300">
                      {String(errors.options[index]?.message)}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <label htmlFor="correct_answer" className="text-sm text-slate-300">
                  Correct Answer
                </label>
                <select
                  id="correct_answer"
                  {...register("correct_answer")}
                  className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-500"
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="difficulty" className="text-sm text-slate-300">
                  Difficulty
                </label>
                <select
                  id="difficulty"
                  {...register("difficulty")}
                  className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-500"
                >
                  <option value="easy">easy</option>
                  <option value="medium">medium</option>
                  <option value="hard">hard</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="source_type" className="text-sm text-slate-300">
                  Source Type
                </label>
                <select
                  id="source_type"
                  {...register("source_type")}
                  className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-500"
                >
                  <option value="PYQ">PYQ</option>
                  <option value="practice">practice</option>
                  <option value="scraped">scraped</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="explanation" className="text-sm text-slate-300">
                Explanation
              </label>
              <textarea
                id="explanation"
                rows={3}
                {...register("explanation")}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-indigo-500"
              />
            </div>

            <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Question Images</h3>
                  <p className="text-xs text-slate-400">
                    These URLs are rendered in the student preview panel.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
                  onClick={addImageField}
                >
                  <Plus className="mr-1 h-4 w-4" aria-hidden />
                  Add Image URL
                </Button>
              </div>

              {watchedImages.length === 0 ? (
                <p className="text-xs text-slate-500">No image URLs added.</p>
              ) : null}

              {watchedImages.map((imageUrl, index) => (
                <div key={`image-url-${index}`} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Input
                      value={imageUrl}
                      onChange={(event) =>
                        updateImageField(index, event.target.value)
                      }
                      className="h-9 border-slate-700 bg-slate-900 text-slate-100"
                      placeholder="https://example.com/image.png"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      className="bg-rose-500/15 text-rose-200 hover:bg-rose-500/25"
                      onClick={() => removeImageField(index)}
                    >
                      Remove
                    </Button>
                  </div>

                  {errors.question_image_urls?.[index] ? (
                    <p className="text-xs text-rose-300">
                      {String(errors.question_image_urls[index]?.message)}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="flex justify-end border-t border-slate-800 pt-4">
              <Button
                type="submit"
                className="bg-indigo-600 text-white hover:bg-indigo-500"
                disabled={isSaving || !isDirty}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-white">Student Preview</h2>

              {question.is_verified ? (
                <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-200">
                  Verified
                </span>
              ) : (
                <Button
                  type="button"
                  className="bg-emerald-600 text-white hover:bg-emerald-500"
                  disabled={isVerifying}
                  onClick={() => void verifyQuestion()}
                >
                  <CheckCircle2 className="mr-1 h-4 w-4" aria-hidden />
                  {isVerifying ? "Verifying..." : "Verify Question"}
                </Button>
              )}
            </div>

            <QuizCard
              question={previewQuestion}
              selectedAnswer={previewAnswer}
              onSelect={(answer) => setPreviewAnswer(answer)}
            />
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">
              NLP Tags
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {question.nlp_keyword_tags && question.nlp_keyword_tags.length > 0 ? (
                question.nlp_keyword_tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-indigo-500/30 bg-indigo-500/15 px-2.5 py-1 text-xs font-semibold text-indigo-100"
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <p className="text-xs text-slate-500">No NLP tags available.</p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
