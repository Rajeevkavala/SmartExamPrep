"use client";

import { Badge } from "@/components/ui/badge";
import type { ScrapeJob } from "@/hooks/useScrapeJobPoller";
import { cn } from "@/lib/utils";

type ScrapeJobCardProps = {
  job: ScrapeJob;
  onClick: (jobId: string) => void;
  isActive?: boolean;
};

const statusBadgeClassMap: Record<ScrapeJob["status"], string> = {
  pending: "border-yellow-500/35 bg-yellow-500/20 text-yellow-200",
  processing: "border-sky-500/35 bg-sky-500/20 text-sky-200",
  done: "border-emerald-500/35 bg-emerald-500/20 text-emerald-200",
  failed: "border-rose-500/35 bg-rose-500/20 text-rose-200",
};

const truncateText = (value: string, maxChars = 92) => {
  if (value.length <= maxChars) {
    return value;
  }
  return `${value.slice(0, maxChars - 1)}…`;
};

export default function ScrapeJobCard({
  job,
  onClick,
  isActive = false,
}: ScrapeJobCardProps) {
  const extractedCount = Array.isArray(job.extracted_questions)
    ? job.extracted_questions.length
    : 0;

  return (
    <button
      type="button"
      onClick={() => onClick(job.job_id)}
      className={cn(
        "w-full rounded-2xl border bg-slate-900/70 px-4 py-3 text-left transition",
        "hover:border-slate-600 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
        isActive
          ? "border-indigo-500/60 shadow-[0_0_0_1px_rgba(99,102,241,0.35)]"
          : "border-slate-800"
      )}
      aria-label={`Review scrape job ${job.job_id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-58 flex-1">
          <p className="text-sm font-medium text-slate-100" title={job.url}>
            {truncateText(job.url)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {new Date(job.created_at).toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-300">{extractedCount} extracted</span>
          <span className="text-xs text-emerald-300">
            {job.questions_imported} imported
          </span>
          <Badge
            variant="outline"
            className={cn("capitalize", statusBadgeClassMap[job.status])}
          >
            {job.status}
          </Badge>
        </div>
      </div>
    </button>
  );
}
