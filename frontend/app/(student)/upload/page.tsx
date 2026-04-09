"use client";

import { UploadCloud } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { api } from "@/lib/api";

type ExamCatalogItem = {
  exam_id: string;
  title: string;
};

type GeneratedUploadQuestion = {
  question_id: string;
  question_text: string;
  options: string[];
  correct_answer?: string | null;
  explanation?: string | null;
  subject_name?: string | null;
  topic_name?: string | null;
  difficulty?: string | null;
  confidence_label?: string | null;
  provenance?: {
    source?: string;
    has_explanation?: boolean;
    has_answer_key?: boolean;
  };
};

type UploadRecord = {
  upload_id: string;
  exam_id?: string | null;
  exam_title?: string | null;
  filename: string;
  file_size_bytes: number;
  status: "pending" | "processing" | "done" | "failed";
  lifecycle_state: "queued" | "running" | "completed" | "failed";
  progress_pct: number;
  processing_mode: string;
  question_count: number;
  extracted_text_preview?: string | null;
  error_message?: string | null;
  can_retry: boolean;
  last_error?: string | null;
  job_summary?: {
    question_count?: number;
    preview_ready?: boolean;
    processing_mode?: string;
  };
  provenance?: {
    generation_source?: string;
    fallback_used?: boolean;
    confidence_label?: string;
    preview_ready?: boolean;
  };
  created_at: string;
  updated_at: string;
  questions?: GeneratedUploadQuestion[];
};

const POLLABLE_STATUSES = new Set(["pending", "processing"]);

const formatFileSize = (fileSizeBytes: number) => {
  if (fileSizeBytes >= 1024 * 1024) {
    return `${(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (fileSizeBytes >= 1024) {
    return `${Math.round(fileSizeBytes / 1024)} KB`;
  }
  return `${fileSizeBytes} B`;
};

export default function UploadPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [exams, setExams] = useState<ExamCatalogItem[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [history, setHistory] = useState<UploadRecord[]>([]);
  const [selectedUpload, setSelectedUpload] = useState<UploadRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadUploads = async () => {
    const [{ data: examsData }, { data: uploadsData }] = await Promise.all([
      api.get<ExamCatalogItem[]>("/exams"),
      api.get<UploadRecord[]>("/uploads"),
    ]);

    setExams(examsData ?? []);
    setSelectedExamId((current) => current || examsData?.[0]?.exam_id || "");
    setHistory(uploadsData ?? []);
  };

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        setLoadError(null);
        await loadUploads();
      } catch (error) {
        if (!active) {
          return;
        }

        const detail =
          (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
          "Unable to load upload history right now.";
        setLoadError(detail);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const needsPolling = history.some((item) => POLLABLE_STATUSES.has(item.status));
    if (!needsPolling) {
      return;
    }

    const timer = window.setInterval(() => {
      void loadUploads().catch(() => undefined);
    }, 3000);

    return () => {
      window.clearInterval(timer);
    };
  }, [history]);

  const handleSelectFiles = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsUploading(true);
    setLoadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      await api.post("/uploads", formData, {
        params: selectedExamId ? { exam_id: selectedExamId } : undefined,
      });

      await loadUploads();
      inputRef.current!.value = "";
    } catch (error) {
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Unable to upload this PDF.";
      setLoadError(detail);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (uploadId: string) => {
    try {
      await api.delete(`/uploads/${uploadId}`);
      setHistory((current) => current.filter((item) => item.upload_id !== uploadId));
      if (selectedUpload?.upload_id === uploadId) {
        setSelectedUpload(null);
      }
    } catch (error) {
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Unable to delete this upload.";
      setLoadError(detail);
    }
  };

  const handleRetry = async (uploadId: string) => {
    try {
      await api.post(`/uploads/${uploadId}/retry`);
      await loadUploads();
      if (selectedUpload?.upload_id === uploadId) {
        await handleOpen(uploadId);
      }
    } catch (error) {
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Unable to retry this upload.";
      setLoadError(detail);
    }
  };

  const handleOpen = async (uploadId: string) => {
    try {
      const { data } = await api.get<UploadRecord>(`/uploads/${uploadId}`);
      setSelectedUpload(data);
    } catch (error) {
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Unable to open this upload.";
      setLoadError(detail);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading upload workspace..." />;
  }

  if (loadError && history.length === 0) {
    return (
      <main>
        <EmptyState
          icon="!"
          title="Upload workspace unavailable"
          description={loadError}
          ctaLabel="Go to dashboard"
          ctaHref="/dashboard"
        />
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-[3rem] leading-none tracking-[0.03em] text-[var(--cream)] md:text-[4rem]">
          PDF UPLOAD & PROCESSING
        </h1>
        <p className="text-xl text-[rgba(194,186,176,0.72)]">
          Upload a study PDF and convert it into reviewable MCQs with backend processing.
        </p>
      </header>

      <section className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-4xl font-semibold text-[var(--cream)]">Upload PDF</h2>
            <p className="mt-2 text-xl text-[rgba(194,186,176,0.72)]">
              Text-based notes and question banks work best. The backend will parse or generate MCQs.
            </p>
          </div>

          <div className="w-full max-w-sm">
            <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-[rgba(194,186,176,0.58)]">
              Attach To Exam
            </p>
            <select
              value={selectedExamId}
              onChange={(event) => setSelectedExamId(event.target.value)}
              className="h-11 w-full border border-[rgba(240,232,218,0.08)] bg-[var(--bg)] px-4 text-[var(--cream)]"
            >
              {exams.map((exam) => (
                <option key={exam.exam_id} value={exam.exam_id}>
                  {exam.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSelectFiles}
          disabled={isUploading}
          className="mt-6 flex min-h-[180px] w-full flex-col items-center justify-center border border-dashed border-[rgba(240,232,218,0.14)] bg-[rgba(255,255,255,0.01)] px-4 text-center disabled:opacity-60"
        >
          <UploadCloud className="h-8 w-8 text-[var(--fire)]" />
          <p className="mt-4 text-[2rem] font-semibold text-[var(--cream)]">
            {isUploading ? "Uploading and queuing..." : "Drop your PDF here or click to browse"}
          </p>
          <p className="mt-2 text-[rgba(194,186,176,0.58)]">
            Up to 15 MB · Text PDFs recommended · Generated MCQs stay in your history
          </p>
        </button>

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="application/pdf"
          onChange={handleFileChange}
        />

        {loadError ? <p className="mt-4 text-sm text-rose-300">{loadError}</p> : null}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-6">
          <h2 className="text-4xl font-semibold text-[var(--cream)]">Upload History</h2>
          <p className="mt-2 text-xl text-[rgba(194,186,176,0.72)]">
            Total uploads: {history.length} · Questions generated:{" "}
            {history.reduce((sum, item) => sum + item.question_count, 0)}
          </p>

          <div className="mt-4 space-y-3">
            {history.map((item) => (
              <article
                key={item.upload_id}
                className="flex flex-col gap-3 border border-[rgba(240,232,218,0.08)] p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <p className="text-2xl font-semibold text-[var(--cream)]">{item.filename}</p>
                  <p className="mt-1 text-sm text-[rgba(194,186,176,0.6)]">
                    {formatFileSize(item.file_size_bytes)} ·{" "}
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                  {item.error_message ? (
                    <p className="mt-2 text-sm text-rose-300">{item.error_message}</p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[rgba(34,197,94,0.35)] bg-[rgba(34,197,94,0.12)] px-3 py-1 font-mono text-[0.56rem] uppercase tracking-[0.16em] text-emerald-300">
                    {item.lifecycle_state}
                  </span>
                  <span className="rounded-full border border-[rgba(240,232,218,0.14)] bg-[rgba(255,255,255,0.03)] px-3 py-1 font-mono text-[0.56rem] uppercase tracking-[0.16em] text-[rgba(194,186,176,0.72)]">
                    {item.question_count} Questions
                  </span>
                  <span className="rounded-full border border-[rgba(0,212,255,0.35)] bg-[rgba(0,212,255,0.12)] px-3 py-1 font-mono text-[0.56rem] uppercase tracking-[0.16em] text-[var(--ice)]">
                    {item.processing_mode}
                  </span>
                  <span className="rounded-full border border-[rgba(240,232,218,0.14)] bg-[rgba(255,255,255,0.03)] px-3 py-1 font-mono text-[0.56rem] uppercase tracking-[0.16em] text-[rgba(194,186,176,0.72)]">
                    {item.progress_pct}% progress
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      void handleOpen(item.upload_id);
                    }}
                    className="h-11 border border-[rgba(240,232,218,0.08)] px-4 text-[var(--cream)]"
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleDelete(item.upload_id);
                    }}
                    className="h-11 border border-[rgba(240,232,218,0.08)] px-4 text-[rgba(194,186,176,0.78)]"
                  >
                    Delete
                  </button>
                  {item.can_retry ? (
                    <button
                      type="button"
                      onClick={() => {
                        void handleRetry(item.upload_id);
                      }}
                      className="h-11 border border-[rgba(232,82,10,0.28)] px-4 text-[var(--fire)]"
                    >
                      Retry
                    </button>
                  ) : null}
                </div>
              </article>
            ))}

            {history.length === 0 ? (
              <div className="border border-[rgba(240,232,218,0.08)] p-6 text-center text-[rgba(194,186,176,0.68)]">
                No uploads yet.
              </div>
            ) : null}
          </div>
        </div>

        <div className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-6">
          <h2 className="text-4xl font-semibold text-[var(--cream)]">Generated MCQs</h2>
          {selectedUpload ? (
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xl font-semibold text-[var(--cream)]">
                  {selectedUpload.filename}
                </p>
                <p className="mt-1 text-sm text-[rgba(194,186,176,0.58)]">
                  {selectedUpload.question_count} questions · {selectedUpload.processing_mode}
                  {selectedUpload.exam_title ? ` · ${selectedUpload.exam_title}` : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-[rgba(34,197,94,0.35)] bg-[rgba(34,197,94,0.12)] px-3 py-1 font-mono text-[0.56rem] uppercase tracking-[0.16em] text-emerald-300">
                    {selectedUpload.lifecycle_state}
                  </span>
                  <span className="rounded-full border border-[rgba(240,232,218,0.14)] bg-[rgba(255,255,255,0.03)] px-3 py-1 font-mono text-[0.56rem] uppercase tracking-[0.16em] text-[rgba(194,186,176,0.72)]">
                    confidence {selectedUpload.provenance?.confidence_label ?? "unknown"}
                  </span>
                </div>
                {selectedUpload.extracted_text_preview ? (
                  <p className="mt-3 text-sm leading-7 text-[rgba(194,186,176,0.68)]">
                    {selectedUpload.extracted_text_preview}
                  </p>
                ) : null}
                <p className="mt-3 text-sm text-[rgba(194,186,176,0.64)]">
                  Source: {selectedUpload.provenance?.generation_source ?? selectedUpload.processing_mode}
                  {selectedUpload.provenance?.fallback_used ? " · AI fallback used" : ""}
                </p>
              </div>

              <div className="space-y-3">
                {(selectedUpload.questions ?? []).map((question, index) => (
                  <article
                    key={question.question_id}
                    className="border border-[rgba(240,232,218,0.08)] p-4"
                  >
                    <p className="text-sm text-[rgba(194,186,176,0.58)]">
                      Q{index + 1}
                      {question.topic_name ? ` · ${question.topic_name}` : ""}
                      {question.difficulty ? ` · ${question.difficulty}` : ""}
                      {question.confidence_label ? ` · ${question.confidence_label}` : ""}
                    </p>
                    <p className="mt-2 text-[var(--cream)]">{question.question_text}</p>
                    <div className="mt-3 space-y-2 text-sm text-[rgba(194,186,176,0.78)]">
                      {question.options.map((option) => (
                        <p key={`${question.question_id}-${option}`}>{option}</p>
                      ))}
                    </div>
                    {question.correct_answer ? (
                      <p className="mt-3 text-sm text-emerald-300">
                        Answer: {question.correct_answer}
                      </p>
                    ) : null}
                    {question.explanation ? (
                      <p className="mt-2 text-sm leading-7 text-[rgba(194,186,176,0.68)]">
                        {question.explanation}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-[rgba(194,186,176,0.54)]">
                      Provenance: {question.provenance?.source ?? selectedUpload.processing_mode}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[rgba(194,186,176,0.68)]">
              Open any completed upload to inspect the generated questions.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
