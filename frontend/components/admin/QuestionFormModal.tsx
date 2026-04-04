"use client";

import { useForm } from "react-hook-form";
import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import type { z, ZodIssue } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
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

export type AdminQuestion = {
  id: string;
  subject_id: string;
  topic_id: string;
  subject_name?: string | null;
  topic_name?: string | null;
  subtopic?: string | null;
  question_text: string;
  options: string[];
  question_image_urls?: string[];
  correct_answer: "A" | "B" | "C" | "D";
  explanation?: string | null;
  difficulty: "easy" | "medium" | "hard";
  source_type: "PYQ" | "practice" | "scraped";
  source_url?: string | null;
  year?: number | null;
  nlp_keyword_tags?: string[];
  is_verified: boolean;
};

type QuestionFormValues = z.input<typeof questionSchema>;

type QuestionFormModalProps = {
  question?: AdminQuestion;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

const difficultyOptions = ["easy", "medium", "hard"] as const;
const sourceTypeOptions = ["PYQ", "practice", "scraped"] as const;

const getErrorMessage = (error: unknown) => {
  const detail = (error as { response?: { data?: { detail?: string } } })
    ?.response?.data?.detail;

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  return "Unable to save this question right now. Please try again.";
};

const ensureOptionArray = (values?: string[]) => {
  const next = Array.isArray(values) ? [...values.slice(0, 4)] : [];
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

const normalizeIndexedStringArray = (
  value: unknown,
  expectedLength?: number
): string[] => {
  const result: string[] = [];

  if (Array.isArray(value)) {
    value.forEach((item) => {
      result.push(typeof item === "string" ? item : String(item ?? ""));
    });
  } else if (value && typeof value === "object") {
    const indexed = value as Record<string, unknown>;
    Object.keys(indexed)
      .sort((a, b) => Number(a) - Number(b))
      .forEach((key) => {
        const item = indexed[key];
        result.push(typeof item === "string" ? item : String(item ?? ""));
      });
  }

  if (typeof expectedLength === "number") {
    while (result.length < expectedLength) {
      result.push("");
    }
    return result.slice(0, expectedLength);
  }

  return result;
};

export default function QuestionFormModal({
  question,
  onClose,
  onSaved,
}: QuestionFormModalProps) {
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [isSubjectsLoading, setIsSubjectsLoading] = useState(true);
  const [isTopicsLoading, setIsTopicsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [optionValues, setOptionValues] = useState<string[]>(
    ensureOptionArray(question?.options)
  );
  const [imageUrls, setImageUrls] = useState<string[]>(
    Array.isArray(question?.question_image_urls)
      ? question.question_image_urls
      : []
  );
  const [optionErrors, setOptionErrors] = useState<string[]>([
    "",
    "",
    "",
    "",
  ]);
  const [imageErrors, setImageErrors] = useState<string[]>([]);

  const defaultValues = useMemo(() => buildDefaultValues(question), [question]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    getValues,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<QuestionFormValues>({
    defaultValues,
  });

  const selectedSubjectId = watch("subject_id");

  useEffect(() => {
    reset(defaultValues);
    setOptionValues(ensureOptionArray(defaultValues.options));
    setImageUrls(Array.isArray(defaultValues.question_image_urls) ? defaultValues.question_image_urls : []);
    setOptionErrors(["", "", "", ""]);
    setImageErrors([]);
  }, [defaultValues, reset]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadSubjects = async () => {
      try {
        setActionError(null);
        const { data } = await adminApi.get<SubjectOption[]>("/content/subjects");

        if (!cancelled) {
          setSubjects(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (!cancelled) {
          setActionError(getErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setIsSubjectsLoading(false);
        }
      }
    };

    void loadSubjects();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadTopics = async () => {
      if (!selectedSubjectId) {
        setTopics([]);
        setValue("topic_id", "");
        return;
      }

      try {
        setIsTopicsLoading(true);
        const { data } = await adminApi.get<TopicOption[]>(
          `/content/subjects/${selectedSubjectId}/topics`
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
      } catch (error) {
        if (!cancelled) {
          setActionError(getErrorMessage(error));
          setTopics([]);
        }
      } finally {
        if (!cancelled) {
          setIsTopicsLoading(false);
        }
      }
    };

    void loadTopics();

    return () => {
      cancelled = true;
    };
  }, [getValues, selectedSubjectId, setValue]);

  const applySchemaErrors = (issues: ZodIssue[]) => {
    clearErrors();
    const nextOptionErrors = ["", "", "", ""];
    const nextImageErrors = Array.from(
      { length: Math.max(imageUrls.length, 1) },
      () => ""
    );

    issues.forEach((issue) => {
      const [head, second] = issue.path;

      if (head === "options" && typeof second === "number") {
        if (second >= 0 && second < nextOptionErrors.length) {
          nextOptionErrors[second] = issue.message;
        }
        return;
      }

      if (head === "question_image_urls" && typeof second === "number") {
        if (second >= 0 && second < nextImageErrors.length) {
          nextImageErrors[second] = issue.message;
        }
        return;
      }

      if (typeof head === "string") {
        setError(head as any, {
          type: "manual",
          message: issue.message,
        });
      }
    });

    setOptionErrors(nextOptionErrors);
    setImageErrors(nextImageErrors);
  };

  const submit = async (values: QuestionFormValues) => {
    setIsSubmitting(true);
    setActionError(null);

    try {
      setOptionErrors(["", "", "", ""]);
      setImageErrors([]);

      const normalizedOptions = ensureOptionArray(optionValues);
      const normalizedImageUrls = [...imageUrls];

      const payloadCandidate: QuestionFormValues = {
        ...values,
        options: normalizedOptions,
        question_image_urls: normalizedImageUrls,
      };

      const parsed = questionSchema.safeParse(payloadCandidate);
      if (!parsed.success) {
        applySchemaErrors(parsed.error.issues);
        setActionError("Please fix validation errors and try again.");
        return;
      }

      if (question?.id) {
        await adminApi.put(`/questions/${question.id}`, parsed.data);
      } else {
        await adminApi.post("/questions/", parsed.data);
      }

      toast({
        title: question?.id ? "Question updated" : "Question created",
        description: question?.id
          ? "The question has been updated successfully."
          : "The question has been created successfully.",
      });

      await onSaved();
      onClose();
    } catch (error) {
      setActionError(getErrorMessage(error));
      toast({
        variant: "destructive",
        title: "Save failed",
        description: getErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm">
      <div className="flex h-full w-full items-start justify-center overflow-y-auto p-4 md:p-6">
        <div className="w-full max-w-5xl rounded-2xl border border-slate-800 bg-slate-900/95 shadow-2xl shadow-black/40">
          <header className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-5">
            <div>
              <h2 className="text-2xl font-semibold text-white">
                {question ? "Edit Question" : "Add Question"}
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                Create or update question metadata used by quizzes and analytics.
              </p>
            </div>

            <button
              type="button"
              className="rounded-lg border border-slate-700 p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white"
              onClick={onClose}
              aria-label="Close question form"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </header>

          <form className="space-y-5 p-6" onSubmit={handleSubmit(submit)}>
            {actionError ? (
              <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
                {actionError}
              </p>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="subject_id" className="text-sm text-slate-300">
                  Subject
                </label>
                <select
                  id="subject_id"
                  {...register("subject_id")}
                  className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-500"
                  disabled={isSubjectsLoading}
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
                  className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-500 disabled:opacity-60"
                  disabled={!selectedSubjectId || isTopicsLoading}
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
                placeholder="Enter question statement"
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
                    value={optionValues[index] ?? ""}
                    onChange={(event) => {
                      setOptionValues((previous) => {
                        const next = ensureOptionArray(previous);
                        next[index] = event.target.value;
                        return next;
                      });
                      setOptionErrors((previous) => {
                        const next = [...previous];
                        next[index] = "";
                        return next;
                      });
                    }}
                    className="h-9 border-slate-700 bg-slate-900 text-slate-100"
                    placeholder={`Option ${letter}`}
                  />
                  {optionErrors[index] ? (
                    <p className="text-xs text-rose-300">{optionErrors[index]}</p>
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
                  {difficultyOptions.map((difficulty) => (
                    <option key={difficulty} value={difficulty}>
                      {difficulty}
                    </option>
                  ))}
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
                  {sourceTypeOptions.map((sourceType) => (
                    <option key={sourceType} value={sourceType}>
                      {sourceType}
                    </option>
                  ))}
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
                placeholder="Optional explanation for answer reasoning"
              />
            </div>

            <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    Question Image URLs
                  </h3>
                  <p className="text-xs text-slate-400">
                    Add zero or more image URLs shown above options.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
                  onClick={() => {
                    setImageUrls((previous) => [...previous, ""]);
                    setImageErrors((previous) => [...previous, ""]);
                  }}
                >
                  <Plus className="mr-1 h-4 w-4" aria-hidden />
                  Add Image URL
                </Button>
              </div>

              {imageUrls.length === 0 ? (
                <p className="text-xs text-slate-500">No image URLs added.</p>
              ) : null}

              {imageUrls.map((url, index) => (
                <div key={`question-image-${index}`} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Input
                      value={url}
                      onChange={(event) => {
                        setImageUrls((previous) => {
                          const next = [...previous];
                          next[index] = event.target.value;
                          return next;
                        });
                        setImageErrors((previous) => {
                          const next = [...previous];
                          if (index < next.length) {
                            next[index] = "";
                          }
                          return next;
                        });
                      }}
                      className="h-9 border-slate-700 bg-slate-900 text-slate-100"
                      placeholder="https://example.com/question-image.png"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      className="bg-rose-500/15 text-rose-200 hover:bg-rose-500/25"
                      onClick={() => {
                        setImageUrls((previous) =>
                          previous.filter((_, imageIndex) => imageIndex !== index)
                        );
                        setImageErrors((previous) =>
                          previous.filter((_, imageIndex) => imageIndex !== index)
                        );
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                  {imageErrors[index] ? (
                    <p className="text-xs text-rose-300">{imageErrors[index]}</p>
                  ) : null}
                </div>
              ))}
            </div>

            <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-800 pt-4">
              <Button
                type="button"
                variant="outline"
                className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 text-white hover:bg-indigo-500"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save Question"}
              </Button>
            </footer>
          </form>
        </div>
      </div>
    </div>
  );
}
