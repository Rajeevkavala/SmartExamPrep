"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CheckCircle2, Plus, RefreshCw, Trash2 } from "lucide-react";

import QuestionFormModal, {
  type AdminQuestion,
} from "@/components/admin/QuestionFormModal";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminApi } from "@/lib/api";

type QuestionsResponse = {
  total?: number;
  questions?: AdminQuestion[];
};

const PAGE_SIZE = 20;

const difficultyPills = ["easy", "medium", "hard"] as const;
const sourceTypePills = ["PYQ", "practice", "scraped"] as const;

const getErrorMessage = (error: unknown) => {
  const detail = (error as { response?: { data?: { detail?: string } } })
    ?.response?.data?.detail;

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  return "Unable to load questions right now. Please try again.";
};

const difficultyClassMap: Record<string, string> = {
  easy: "border-emerald-500/30 bg-emerald-500/15 text-emerald-200",
  medium: "border-amber-500/30 bg-amber-500/15 text-amber-200",
  hard: "border-rose-500/30 bg-rose-500/15 text-rose-200",
};

const sourceClassMap: Record<string, string> = {
  pyq: "border-indigo-500/30 bg-indigo-500/15 text-indigo-200",
  practice: "border-cyan-500/30 bg-cyan-500/15 text-cyan-200",
  scraped: "border-fuchsia-500/30 bg-fuchsia-500/15 text-fuchsia-200",
};

export default function AdminQuestionsPage() {
  const searchParams = useSearchParams();
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [difficultyFilter, setDifficultyFilter] =
    useState<(typeof difficultyPills)[number] | "">("");
  const [sourceTypeFilter, setSourceTypeFilter] =
    useState<(typeof sourceTypePills)[number] | "">("");
  const [unverifiedOnly, setUnverifiedOnly] = useState(false);

  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBulkVerifying, setIsBulkVerifying] = useState(false);
  const [activeVerifyId, setActiveVerifyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<AdminQuestion | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (searchParams.get("is_verified") === "false") {
      setUnverifiedOnly(true);
    }
  }, [searchParams]);

  const fetchQuestions = useCallback(
    async (showSkeleton: boolean) => {
      if (showSkeleton) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        setError(null);

        const params: Record<string, string | number | boolean> = {
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        };

        if (difficultyFilter) {
          params.difficulty = difficultyFilter;
        }

        if (sourceTypeFilter) {
          params.source_type = sourceTypeFilter;
        }

        if (unverifiedOnly) {
          params.is_verified = false;
        }

        const normalizedSearch = deferredSearch.trim();
        if (normalizedSearch) {
          params.search = normalizedSearch;
        }

        const { data } = await adminApi.get<QuestionsResponse>("/questions/", {
          params,
        });

        const nextQuestions = Array.isArray(data?.questions) ? data.questions : [];
        const nextTotal = Number(data?.total ?? 0);

        setQuestions(nextQuestions);
        setTotal(nextTotal);
        setSelectedQuestionIds((previous) =>
          previous.filter((questionId) =>
            nextQuestions.some((question) => question.id === questionId)
          )
        );

        if (nextQuestions.length === 0 && page > 0 && nextTotal > 0) {
          setPage((previous) => Math.max(previous - 1, 0));
        }
      } catch (loadError) {
        setError(getErrorMessage(loadError));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [deferredSearch, difficultyFilter, page, sourceTypeFilter, unverifiedOnly]
  );

  useEffect(() => {
    void fetchQuestions(true);
  }, [fetchQuestions]);

  const allVisibleSelected = useMemo(() => {
    if (!questions.length) {
      return false;
    }
    return questions.every((question) =>
      selectedQuestionIds.includes(question.id)
    );
  }, [questions, selectedQuestionIds]);

  const rangeStart = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const rangeEnd =
    total === 0 ? 0 : Math.min(total, page * PAGE_SIZE + questions.length);

  const toggleSelectVisible = () => {
    if (!questions.length) {
      return;
    }

    if (allVisibleSelected) {
      setSelectedQuestionIds((previous) =>
        previous.filter(
          (questionId) => !questions.some((question) => question.id === questionId)
        )
      );
      return;
    }

    const visibleSet = new Set(selectedQuestionIds);
    questions.forEach((question) => {
      visibleSet.add(question.id);
    });
    setSelectedQuestionIds(Array.from(visibleSet));
  };

  const toggleSelectOne = (questionId: string) => {
    setSelectedQuestionIds((previous) => {
      if (previous.includes(questionId)) {
        return previous.filter((id) => id !== questionId);
      }
      return [...previous, questionId];
    });
  };

  const toggleDifficultyFilter = (difficulty: (typeof difficultyPills)[number]) => {
    setPage(0);
    setDifficultyFilter((previous) => (previous === difficulty ? "" : difficulty));
  };

  const toggleSourceTypeFilter = (
    sourceType: (typeof sourceTypePills)[number]
  ) => {
    setPage(0);
    setSourceTypeFilter((previous) => (previous === sourceType ? "" : sourceType));
  };

  const toggleUnverifiedFilter = () => {
    setPage(0);
    setUnverifiedOnly((previous) => !previous);
  };

  const refreshList = async () => {
    await fetchQuestions(false);
  };

  const verifySingleQuestion = async (questionId: string) => {
    if (activeVerifyId || isBulkVerifying) {
      return;
    }

    setActiveVerifyId(questionId);
    setQuestions((previous) =>
      previous.map((question) =>
        question.id === questionId ? { ...question, is_verified: true } : question
      )
    );

    try {
      await adminApi.post(`/questions/${questionId}/verify`);
    } catch {
      setQuestions((previous) =>
        previous.map((question) =>
          question.id === questionId
            ? { ...question, is_verified: false }
            : question
        )
      );
    } finally {
      setActiveVerifyId(null);
    }
  };

  const verifySelectedQuestions = async () => {
    if (!selectedQuestionIds.length || isBulkVerifying) {
      return;
    }

    const idsToVerify = [...selectedQuestionIds];
    setIsBulkVerifying(true);

    setQuestions((previous) =>
      previous.map((question) =>
        idsToVerify.includes(question.id)
          ? { ...question, is_verified: true }
          : question
      )
    );

    try {
      await adminApi.post("/questions/bulk-verify", {
        question_ids: idsToVerify,
      });
      setSelectedQuestionIds([]);
    } catch {
      await fetchQuestions(false);
    } finally {
      setIsBulkVerifying(false);
    }
  };

  const deleteQuestion = async () => {
    if (!questionToDelete || isDeleting) {
      return;
    }

    setIsDeleting(true);

    try {
      await adminApi.delete(`/questions/${questionToDelete.id}`);
      setSelectedQuestionIds((previous) =>
        previous.filter((id) => id !== questionToDelete.id)
      );

      const shouldMoveToPreviousPage = questions.length === 1 && page > 0;
      setQuestionToDelete(null);

      if (shouldMoveToPreviousPage) {
        setPage((previous) => previous - 1);
      } else {
        await fetchQuestions(false);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading questions manager..." />;
  }

  if (error) {
    return (
      <EmptyState
        icon="⚠"
        title="Questions Manager unavailable"
        description={error}
        ctaLabel="Retry"
        ctaHref="/admin/questions"
      />
    );
  }

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-slate-800 bg-linear-to-r from-slate-900 to-indigo-950 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Questions Manager</h1>
            <p className="mt-2 text-sm text-slate-300">
              Review, verify, and curate question bank quality before student use.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
              onClick={() => void refreshList()}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`mr-1 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                aria-hidden
              />
              Refresh
            </Button>

            <Button
              type="button"
              className="bg-indigo-600 text-white hover:bg-indigo-500"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="mr-1 h-4 w-4" aria-hidden />
              Add Question
            </Button>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={search}
              onChange={(event) => {
                setPage(0);
                setSearch(event.target.value);
              }}
              placeholder="Search questions..."
              className="h-9 w-full max-w-md border-slate-700 bg-slate-900 text-slate-100"
            />

            {selectedQuestionIds.length > 0 ? (
              <Button
                type="button"
                className="bg-emerald-600 text-white hover:bg-emerald-500"
                onClick={() => void verifySelectedQuestions()}
                disabled={isBulkVerifying}
              >
                <CheckCircle2 className="mr-1 h-4 w-4" aria-hidden />
                {isBulkVerifying
                  ? "Verifying..."
                  : `Verify ${selectedQuestionIds.length} selected`}
              </Button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {difficultyPills.map((difficulty) => {
              const active = difficultyFilter === difficulty;
              return (
                <button
                  key={difficulty}
                  type="button"
                  onClick={() => toggleDifficultyFilter(difficulty)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] transition ${
                    active
                      ? "border-indigo-400 bg-indigo-500/25 text-indigo-100"
                      : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  {difficulty}
                </button>
              );
            })}

            {sourceTypePills.map((sourceType) => {
              const active = sourceTypeFilter === sourceType;
              return (
                <button
                  key={sourceType}
                  type="button"
                  onClick={() => toggleSourceTypeFilter(sourceType)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    active
                      ? "border-cyan-400 bg-cyan-500/25 text-cyan-100"
                      : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  {sourceType}
                </button>
              );
            })}

            <button
              type="button"
              onClick={toggleUnverifiedFilter}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                unverifiedOnly
                  ? "border-rose-400 bg-rose-500/25 text-rose-100"
                  : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
              }`}
            >
              Unverified Only
            </button>
          </div>
        </div>
      </section>

      {questions.length === 0 ? (
        <EmptyState
          icon="❓"
          title="No questions found"
          description="Try adjusting your filters or add a new question to start building the bank."
        />
      ) : (
        <>
          <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
            <div className="overflow-x-auto">
              <table className="min-w-225 w-full text-sm">
                <thead className="bg-slate-900/90 text-xs uppercase tracking-widest text-slate-400">
                  <tr>
                    <th className="w-12 px-3 py-3 text-left">
                      <input
                        type="checkbox"
                        aria-label="Select all visible questions"
                        checked={allVisibleSelected}
                        onChange={toggleSelectVisible}
                      />
                    </th>
                    <th className="px-3 py-3 text-left">Question</th>
                    <th className="px-3 py-3 text-left">Topic</th>
                    <th className="px-3 py-3 text-left">Difficulty</th>
                    <th className="px-3 py-3 text-left">Source</th>
                    <th className="px-3 py-3 text-left">Verified</th>
                    <th className="px-3 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((question) => {
                    const isSelected = selectedQuestionIds.includes(question.id);
                    const difficultyKey = (question.difficulty || "").toLowerCase();
                    const sourceKey = (question.source_type || "").toLowerCase();

                    return (
                      <tr
                        key={question.id}
                        className="border-t border-slate-800 hover:bg-slate-900/80"
                      >
                        <td className="px-3 py-3 align-top">
                          <input
                            type="checkbox"
                            aria-label={`Select question ${question.id}`}
                            checked={isSelected}
                            onChange={() => toggleSelectOne(question.id)}
                          />
                        </td>

                        <td className="px-3 py-3 align-top">
                          <Link
                            href={`/admin/questions/${question.id}`}
                            className="block max-w-136 truncate font-medium text-slate-100 hover:text-indigo-300"
                            title={question.question_text}
                          >
                            {question.question_text}
                          </Link>
                        </td>

                        <td className="px-3 py-3 align-top text-slate-300">
                          {question.topic_name ?? "-"}
                        </td>

                        <td className="px-3 py-3 align-top">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${
                              difficultyClassMap[difficultyKey] ??
                              "border-slate-600/40 bg-slate-700/40 text-slate-200"
                            }`}
                          >
                            {question.difficulty}
                          </span>
                        </td>

                        <td className="px-3 py-3 align-top">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${
                              sourceClassMap[sourceKey] ??
                              "border-slate-600/40 bg-slate-700/40 text-slate-200"
                            }`}
                          >
                            {question.source_type}
                          </span>
                        </td>

                        <td className="px-3 py-3 align-top">
                          {question.is_verified ? (
                            <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-200">
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full border border-rose-500/30 bg-rose-500/15 px-2 py-0.5 text-xs font-semibold text-rose-200">
                              Pending
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-3 align-top">
                          <div className="flex items-center gap-2">
                            {!question.is_verified ? (
                              <Button
                                type="button"
                                size="sm"
                                className="bg-emerald-600 text-white hover:bg-emerald-500"
                                disabled={
                                  activeVerifyId === question.id || isBulkVerifying
                                }
                                onClick={() => void verifySingleQuestion(question.id)}
                              >
                                {activeVerifyId === question.id
                                  ? "Verifying..."
                                  : "Verify"}
                              </Button>
                            ) : null}

                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              className="bg-rose-500/15 text-rose-200 hover:bg-rose-500/25"
                              onClick={() => setQuestionToDelete(question)}
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden />
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
            <p>
              {rangeStart}-{rangeEnd} of {total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
                disabled={page === 0}
                onClick={() => setPage((previous) => Math.max(previous - 1, 0))}
              >
                Prev
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
                disabled={(page + 1) * PAGE_SIZE >= total}
                onClick={() => setPage((previous) => previous + 1)}
              >
                Next
              </Button>
            </div>
          </footer>
        </>
      )}

      {showCreateModal ? (
        <QuestionFormModal
          onClose={() => setShowCreateModal(false)}
          onSaved={async () => {
            setPage(0);
            await fetchQuestions(false);
          }}
        />
      ) : null}

      <AlertDialog
        open={Boolean(questionToDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setQuestionToDelete(null);
          }
        }}
      >
        <AlertDialogContent className="border-slate-800 bg-slate-900 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete question?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              This action cannot be undone and will permanently remove the
              selected question.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={() => void deleteQuestion()}
            >
              {isDeleting ? "Deleting..." : "Delete Question"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
