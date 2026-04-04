"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";

import ScrapeJobCard from "@/components/admin/ScrapeJobCard";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import {
  type ExtractedScrapedQuestion,
  type ScrapeJob,
  useScrapeJobPoller,
} from "@/hooks/useScrapeJobPoller";
import { adminApi } from "@/lib/api";
import { cn } from "@/lib/utils";

type StartScrapeResponse = {
  job_id: string;
  status: string;
};

type ImportResponse = {
  imported: number;
};

const statusBadgeClassMap: Record<ScrapeJob["status"], string> = {
  pending: "border-yellow-500/35 bg-yellow-500/20 text-yellow-200",
  processing: "border-sky-500/35 bg-sky-500/20 text-sky-200",
  done: "border-emerald-500/35 bg-emerald-500/20 text-emerald-200",
  failed: "border-rose-500/35 bg-rose-500/20 text-rose-200",
};

const terminalStatuses = new Set<ScrapeJob["status"]>(["done", "failed"]);

const getErrorMessage = (error: unknown): string => {
  const detail = (error as { response?: { data?: { detail?: string } } })?.response
    ?.data?.detail;

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  return "Request failed. Please try again.";
};

const parseOptionLetter = (option: string, index: number): string => {
  const match = option.trim().match(/^([A-D])[\).:\-\s]+/i);
  if (match?.[1]) {
    return match[1].toUpperCase();
  }
  return String.fromCharCode(65 + index);
};

const normalizeImages = (question: ExtractedScrapedQuestion): string[] => {
  if (!Array.isArray(question.question_image_urls)) {
    return [];
  }

  return question.question_image_urls
    .filter((url): url is string => typeof url === "string")
    .map((url) => url.trim())
    .filter(Boolean);
};

const buildClassificationPath = (question: ExtractedScrapedQuestion) => {
  const parts = [question.subject, question.topic, question.subtopic]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);

  if (!parts.length) {
    return "Unclassified";
  }

  return parts.join(" -> ");
};

export default function AdminScraperPage() {
  const [url, setUrl] = useState("");
  const [jobs, setJobs] = useState<ScrapeJob[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [acceptedIndices, setAcceptedIndices] = useState<number[]>([]);

  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [isRefreshingJobs, setIsRefreshingJobs] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const terminalSyncRef = useRef<string | null>(null);

  const {
    job: polledJob,
    isPolling,
    pollingError,
    refreshJob,
  } = useScrapeJobPoller(activeJobId);

  const fetchJobs = useCallback(async (showSkeleton = false) => {
    if (showSkeleton) {
      setIsLoadingJobs(true);
    } else {
      setIsRefreshingJobs(true);
    }

    try {
      setJobsError(null);
      const { data } = await adminApi.get<ScrapeJob[]>("/scraper/jobs", {
        params: {
          limit: 50,
          offset: 0,
        },
      });

      setJobs(Array.isArray(data) ? data : []);
    } catch (error) {
      setJobsError(getErrorMessage(error));
    } finally {
      setIsLoadingJobs(false);
      setIsRefreshingJobs(false);
    }
  }, []);

  useEffect(() => {
    void fetchJobs(true);
  }, [fetchJobs]);

  useEffect(() => {
    setAcceptedIndices([]);
  }, [activeJobId]);

  useEffect(() => {
    if (!polledJob) {
      return;
    }

    setJobs((previous) => {
      const existingIndex = previous.findIndex(
        (item) => item.job_id === polledJob.job_id
      );

      if (existingIndex < 0) {
        return [polledJob, ...previous];
      }

      const next = [...previous];
      next[existingIndex] = polledJob;
      return next;
    });

    if (!terminalStatuses.has(polledJob.status)) {
      return;
    }

    const terminalKey = `${polledJob.job_id}:${polledJob.status}`;
    if (terminalSyncRef.current === terminalKey) {
      return;
    }

    terminalSyncRef.current = terminalKey;
    void fetchJobs(false);
  }, [fetchJobs, polledJob]);

  const activeJob = useMemo(() => {
    if (polledJob) {
      return polledJob;
    }

    if (!activeJobId) {
      return null;
    }

    return jobs.find((job) => job.job_id === activeJobId) ?? null;
  }, [activeJobId, jobs, polledJob]);

  const isValidUrl = useMemo(() => {
    const trimmed = url.trim();
    if (!trimmed) {
      return false;
    }

    try {
      const parsed = new URL(trimmed);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }, [url]);

  const startScrape = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setActionError("Please enter a URL to scrape.");
      return;
    }

    if (!isValidUrl) {
      setActionError("Please enter a valid HTTP/HTTPS URL.");
      return;
    }

    setIsStarting(true);
    setActionError(null);

    try {
      const { data } = await adminApi.post<StartScrapeResponse>("/scraper/start", {
        url: trimmed,
      });

      setUrl("");
      setActiveJobId(data.job_id);
      setAcceptedIndices([]);
      await fetchJobs(false);

      toast({
        title: "Scrape job started",
        description: "Polling for live Gemini classification progress.",
      });
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setIsStarting(false);
    }
  };

  const toggleAccepted = (index: number) => {
    setAcceptedIndices((previous) => {
      if (previous.includes(index)) {
        return previous.filter((value) => value !== index);
      }
      return [...previous, index].sort((a, b) => a - b);
    });
  };

  const importAccepted = async () => {
    if (!activeJob || !acceptedIndices.length || isImporting) {
      return;
    }

    setIsImporting(true);
    setActionError(null);

    try {
      const { data } = await adminApi.post<ImportResponse>(
        `/scraper/jobs/${activeJob.job_id}/import`,
        { accepted_indices: acceptedIndices }
      );

      toast({
        title: "Import completed",
        description: `Imported ${data.imported} accepted question(s).`,
      });

      setAcceptedIndices([]);
      await refreshJob();
      await fetchJobs(false);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setIsImporting(false);
    }
  };

  if (isLoadingJobs) {
    return <LoadingSpinner message="Loading scraper jobs..." />;
  }

  if (jobsError) {
    return (
      <EmptyState
        icon="⚠"
        title="Scraper unavailable"
        description={jobsError}
        ctaLabel="Retry"
        ctaHref="/admin/scraper"
      />
    );
  }

  const extractedQuestions = Array.isArray(activeJob?.extracted_questions)
    ? activeJob.extracted_questions
    : [];

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-800 bg-linear-to-r from-slate-900 to-indigo-950 p-6">
        <h1 className="text-3xl font-bold text-white">URL Scraper</h1>
        <p className="mt-2 text-sm text-slate-300">
          Scrape public pages, classify extracted questions with Gemini, then import
          reviewed results.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com/gate-cse-questions"
            className="h-10 border-slate-700 bg-slate-900 text-slate-100"
            aria-label="Scrape source URL"
          />

          <Button
            type="button"
            onClick={() => void startScrape()}
            className="h-10 bg-indigo-600 text-white hover:bg-indigo-500"
            disabled={isStarting}
          >
            {isStarting ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />
                Starting...
              </>
            ) : (
              "Scrape"
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-10 border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
            onClick={() => void fetchJobs(false)}
            disabled={isRefreshingJobs}
          >
            <RefreshCw
              className={cn("mr-1 h-4 w-4", isRefreshingJobs && "animate-spin")}
              aria-hidden
            />
            Refresh Jobs
          </Button>
        </div>

        {actionError ? (
          <p className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {actionError}
          </p>
        ) : null}

        {pollingError ? (
          <p className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            {pollingError}
          </p>
        ) : null}
      </section>

      {activeJob ? (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Active Job Review</h2>
              <p className="mt-1 max-w-3xl break-all text-xs text-slate-400">
                {activeJob.url}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn("capitalize", statusBadgeClassMap[activeJob.status])}
              >
                {activeJob.status}
              </Badge>

              {isPolling ? (
                <span className="text-xs text-sky-300">Polling every 3s</span>
              ) : null}

              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
                onClick={() => void refreshJob()}
              >
                Refresh Status
              </Button>
            </div>
          </div>

          {activeJob.status === "processing" ? (
            <p className="mt-4 text-sm text-sky-200 animate-pulse">
              Scraping and classifying with Gemini...
            </p>
          ) : null}

          {activeJob.status === "pending" ? (
            <p className="mt-4 text-sm text-yellow-200">
              Job queued. Classification will begin shortly.
            </p>
          ) : null}

          {activeJob.status === "failed" ? (
            <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3">
              <p className="text-sm text-rose-100">
                <AlertCircle className="mr-1 inline h-4 w-4" aria-hidden />
                {activeJob.error_message || "Scrape job failed."}
              </p>
            </div>
          ) : null}

          {activeJob.status === "done" ? (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-300">
                  {extractedQuestions.length} extracted question(s) • {activeJob.questions_imported}{" "}
                  imported so far
                </p>
                <Button
                  type="button"
                  className="bg-emerald-600 text-white hover:bg-emerald-500"
                  onClick={() => void importAccepted()}
                  disabled={!acceptedIndices.length || isImporting}
                >
                  {isImporting
                    ? "Importing..."
                    : `Import ${acceptedIndices.length} Accepted`}
                </Button>
              </div>

              {extractedQuestions.length === 0 ? (
                <EmptyState
                  icon="○"
                  title="No extracted questions"
                  description="This job completed without importable question candidates."
                />
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-800">
                  <div className="overflow-x-auto">
                    <table className="min-w-280 w-full text-sm">
                      <thead className="bg-slate-900/90 text-xs uppercase tracking-widest text-slate-400">
                        <tr>
                          <th className="w-34 px-3 py-3 text-left">Review</th>
                          <th className="w-56 px-3 py-3 text-left">Detected Tag</th>
                          <th className="min-w-84 px-3 py-3 text-left">Question</th>
                          <th className="min-w-80 px-3 py-3 text-left">Options</th>
                          <th className="min-w-72 px-3 py-3 text-left">Explanation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {extractedQuestions.map((question, index) => {
                          const accepted = acceptedIndices.includes(index);
                          const questionImages = normalizeImages(question);
                          const correctAnswer =
                            typeof question.correct_answer === "string"
                              ? question.correct_answer.toUpperCase()
                              : "";
                          const options = Array.isArray(question.options)
                            ? question.options
                            : [];

                          return (
                            <tr
                              key={`${activeJob.job_id}-question-${index}`}
                              className="border-t border-slate-800 align-top"
                            >
                              <td className="px-3 py-3">
                                <Button
                                  type="button"
                                  size="sm"
                                  className={cn(
                                    accepted
                                      ? "bg-rose-600 text-white hover:bg-rose-500"
                                      : "bg-emerald-600 text-white hover:bg-emerald-500"
                                  )}
                                  onClick={() => toggleAccepted(index)}
                                >
                                  {accepted ? "Reject ❌" : "Accept ✅"}
                                </Button>
                              </td>

                              <td className="px-3 py-3">
                                <span className="inline-flex rounded-full border border-indigo-500/30 bg-indigo-500/15 px-2 py-1 text-xs font-semibold text-indigo-100">
                                  {buildClassificationPath(question)}
                                </span>
                              </td>

                              <td className="space-y-2 px-3 py-3">
                                <p className="whitespace-pre-wrap text-sm text-slate-100">
                                  {question.question_text || "-"}
                                </p>

                                {questionImages.length > 0 ? (
                                  <div className="grid grid-cols-1 gap-2">
                                    {questionImages.map((imageUrl, imageIndex) => (
                                      <a
                                        key={`${activeJob.job_id}-${index}-image-${imageIndex}`}
                                        href={imageUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block overflow-hidden rounded-lg border border-slate-700 bg-slate-950"
                                      >
                                        <Image
                                          src={imageUrl}
                                          alt={`Extracted question image ${imageIndex + 1}`}
                                          width={960}
                                          height={540}
                                          unoptimized
                                          className="h-auto w-full object-contain"
                                        />
                                      </a>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-500">No images</p>
                                )}
                              </td>

                              <td className="px-3 py-3">
                                {options.length ? (
                                  <ul className="space-y-1.5">
                                    {options.map((option, optionIndex) => {
                                      const optionLetter = parseOptionLetter(
                                        option,
                                        optionIndex
                                      );
                                      const isCorrect = optionLetter === correctAnswer;

                                      return (
                                        <li
                                          key={`${activeJob.job_id}-${index}-opt-${optionIndex}`}
                                          className={cn(
                                            "rounded-lg border px-2 py-1.5 text-xs",
                                            isCorrect
                                              ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-100"
                                              : "border-slate-700 bg-slate-900 text-slate-300"
                                          )}
                                        >
                                          {option}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                ) : (
                                  <p className="text-xs text-slate-500">No options parsed</p>
                                )}
                              </td>

                              <td className="px-3 py-3">
                                {question.explanation ? (
                                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-300">
                                    {question.explanation}
                                  </p>
                                ) : (
                                  <p className="text-xs text-slate-500">No explanation</p>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </section>
      ) : (
        <section>
          <EmptyState
            icon="S"
            title="No active scrape job"
            description="Start a new scrape or pick a past job below to review extracted questions."
          />
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Past Jobs</h2>

        {jobs.length === 0 ? (
          <EmptyState
            icon="○"
            title="No scrape jobs yet"
            description="Run your first URL scrape job to populate this history."
          />
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <ScrapeJobCard
                key={job.job_id}
                job={job}
                isActive={job.job_id === activeJobId}
                onClick={(jobId) => {
                  setActionError(null);
                  setActiveJobId(jobId);
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
