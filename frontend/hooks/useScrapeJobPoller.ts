"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { adminApi } from "@/lib/api";

export type ScrapeJobStatus = "pending" | "processing" | "done" | "failed";

export type ExtractedScrapedQuestion = {
  subject?: string | null;
  topic?: string | null;
  subtopic?: string | null;
  question_text?: string;
  question_image_urls?: string[];
  options?: string[];
  correct_answer?: string | null;
  explanation?: string | null;
};

export type ScrapeJob = {
  job_id: string;
  url: string;
  status: ScrapeJobStatus;
  lifecycle_state?: "queued" | "running" | "completed" | "failed";
  progress_pct?: number;
  notes?: string | null;
  extracted_questions: ExtractedScrapedQuestion[];
  questions_imported: number;
  error_message?: string | null;
  can_retry?: boolean;
  job_summary?: {
    extracted_count?: number;
    questions_imported?: number;
  };
  provenance?: {
    classification_source?: string;
    has_error?: boolean;
  };
  created_at: string;
};

type UseScrapeJobPollerResult = {
  job: ScrapeJob | null;
  isPolling: boolean;
  pollingError: string | null;
  refreshJob: () => Promise<void>;
};

const TERMINAL_STATUSES: ReadonlySet<ScrapeJobStatus> = new Set(["done", "failed"]);
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_DURATION_MS = 5 * 60 * 1000;

const getErrorMessage = (error: unknown): string => {
  const detail = (error as { response?: { data?: { detail?: string } } })?.response
    ?.data?.detail;

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  return "Unable to refresh scrape job status.";
};

export function useScrapeJobPoller(jobId: string | null): UseScrapeJobPollerResult {
  const [job, setJob] = useState<ScrapeJob | null>(null);
  const [pollingError, setPollingError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeJobIdRef = useRef<string | null>(jobId);
  const startedAtRef = useRef<number | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    startedAtRef.current = null;
    setIsPolling(false);
  }, []);

  const fetchJob = useCallback(async (targetJobId: string): Promise<ScrapeJob | null> => {
    const response = await adminApi.get<ScrapeJob>(`/scraper/jobs/${targetJobId}`);
    return response.data;
  }, []);

  const refreshJob = useCallback(async () => {
    const targetJobId = activeJobIdRef.current;
    if (!targetJobId) {
      setJob(null);
      setPollingError(null);
      stopPolling();
      return;
    }

    try {
      if (
        startedAtRef.current &&
        Date.now() - startedAtRef.current > MAX_POLL_DURATION_MS
      ) {
        setPollingError("Scrape job polling timed out. Refresh manually to check the latest state.");
        stopPolling();
        return;
      }

      const latest = await fetchJob(targetJobId);
      setJob(latest);
      setPollingError(null);

      if (latest && TERMINAL_STATUSES.has(latest.status)) {
        stopPolling();
      }
    } catch (error) {
      setPollingError(getErrorMessage(error));
    }
  }, [fetchJob, stopPolling]);

  useEffect(() => {
    activeJobIdRef.current = jobId;
    stopPolling();
    setJob(null);
    setPollingError(null);

    if (!jobId) {
      return;
    }

    let isCancelled = false;

    const poll = async () => {
      if (isCancelled || activeJobIdRef.current !== jobId) {
        return;
      }

      try {
        const latest = await fetchJob(jobId);
        if (isCancelled || activeJobIdRef.current !== jobId) {
          return;
        }

        setJob(latest);
        setPollingError(null);

        if (latest && TERMINAL_STATUSES.has(latest.status)) {
          stopPolling();
        }
      } catch (error) {
        if (!isCancelled) {
          setPollingError(getErrorMessage(error));
        }
      }
    };

    setIsPolling(true);
    startedAtRef.current = Date.now();
    void poll();

    intervalRef.current = setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);

    return () => {
      isCancelled = true;
      stopPolling();
    };
  }, [fetchJob, jobId, stopPolling]);

  return {
    job,
    isPolling,
    pollingError,
    refreshJob,
  };
}
