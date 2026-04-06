import { panelClass, StatusBadge } from "@/components/shared/brand-ui";
import { cn } from "@/lib/utils";

export type PYQBrowseItem = {
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
};

type PYQQuestionTableProps = {
  total: number;
  questions: PYQBrowseItem[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
};

export default function PYQQuestionTable({
  total,
  questions,
  isLoading,
  error,
  onRetry,
}: PYQQuestionTableProps) {
  return (
    <section className={cn(panelClass, "p-6")}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-3xl tracking-[0.08em] text-[var(--cream)]">
          Verified PYQ Bank
        </p>
        <StatusBadge tone="ice">
          {total} question{total === 1 ? "" : "s"}
        </StatusBadge>
      </div>

      {error ? (
        <div className="rounded-[22px] border border-rose-500/20 bg-rose-500/10 p-4">
          <p className="text-sm text-rose-200">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-2 font-mono text-[0.58rem] uppercase tracking-[0.22em] text-rose-100"
          >
            Retry
          </button>
        </div>
      ) : null}

      {!error && isLoading ? (
        <p className="text-sm text-[rgba(194,186,176,0.72)]">Loading filtered PYQs...</p>
      ) : null}

      {!error && !isLoading && questions.length === 0 ? (
        <p className="rounded-[22px] border border-white/8 bg-white/3 p-4 text-sm text-[rgba(194,186,176,0.68)]">
          No verified PYQ questions match the current filters.
        </p>
      ) : null}

      {!error && !isLoading && questions.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-225 w-full text-sm">
            <thead className="border-b border-white/8 font-mono text-[0.58rem] uppercase tracking-[0.24em] text-[rgba(194,186,176,0.58)]">
              <tr>
                <th className="px-3 py-3 text-left">Year</th>
                <th className="px-3 py-3 text-left">Subject</th>
                <th className="px-3 py-3 text-left">Topic</th>
                <th className="px-3 py-3 text-left">Difficulty</th>
                <th className="px-3 py-3 text-left">Question</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((question) => (
                <tr key={question.id} className="border-t border-white/6 align-top text-[rgba(194,186,176,0.76)]">
                  <td className="px-3 py-4">{question.year ?? "-"}</td>
                  <td className="px-3 py-4">{question.subject_name}</td>
                  <td className="px-3 py-4">
                    <p className="text-[var(--cream)]">{question.topic_name}</p>
                    {question.subtopic ? (
                      <p className="mt-1 text-xs text-[rgba(194,186,176,0.58)]">{question.subtopic}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-4">
                    <StatusBadge
                      tone={
                        question.difficulty.toLowerCase() === "hard"
                          ? "fire"
                          : question.difficulty.toLowerCase() === "medium"
                            ? "warning"
                            : "success"
                      }
                    >
                      {question.difficulty}
                    </StatusBadge>
                  </td>
                  <td className="px-3 py-4">
                    <p className="line-clamp-3 text-[var(--cream)]">{question.question_text}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
