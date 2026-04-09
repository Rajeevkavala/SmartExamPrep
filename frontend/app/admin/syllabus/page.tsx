"use client";

import type { AxiosProgressEvent } from "axios";
import {
  type ChangeEvent,
  type DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AlertCircle, FileUp, Loader2, RefreshCw } from "lucide-react";

import SyllabusTreeViewer, {
  type SyllabusStructure,
} from "@/components/admin/SyllabusTreeViewer";
import {
  fireButtonClass,
  ghostButtonClass,
  PageHeader,
  panelClass,
  StatusBadge,
} from "@/components/shared/brand-ui";
import EmptyState from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { adminApi } from "@/lib/api";
import { cn } from "@/lib/utils";

type UploadStatus = "pending" | "processing" | "done" | "failed";

type SyllabusUploadRecord = {
  upload_id: string;
  filename: string;
  status: UploadStatus;
  lifecycle_state?: "queued" | "running" | "completed" | "failed";
  progress_pct?: number;
  extracted_structure: SyllabusStructure | null;
  subjects_imported: number;
  topics_imported: number;
  error_message?: string | null;
  can_retry?: boolean;
  job_summary?: {
    subject_count?: number;
    topic_count?: number;
    subjects_imported?: number;
    topics_imported?: number;
  };
  provenance?: {
    parser?: string;
    has_structure?: boolean;
    has_error?: boolean;
  };
  created_at: string;
};

type UploadInitResponse = {
  upload_id: string;
  status: UploadStatus;
};

type ImportResponse = {
  subjects_created?: number;
  topics_created?: number;
};

const statusBadgeClassMap: Record<UploadStatus, string> = {
  pending: "border-yellow-500/35 bg-yellow-500/20 text-yellow-200",
  processing: "border-sky-500/35 bg-sky-500/20 text-sky-200",
  done: "border-emerald-500/35 bg-emerald-500/20 text-emerald-200",
  failed: "border-rose-500/35 bg-rose-500/20 text-rose-200",
};

const terminalStatuses = new Set<UploadStatus>(["done", "failed"]);

const getErrorMessage = (error: unknown): string => {
  const detail = (error as { response?: { data?: { detail?: string } } })?.response
    ?.data?.detail;

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  return "Request failed. Please try again.";
};

const isPdfFile = (file: File): boolean => {
  const lower = file.name.toLowerCase();
  return lower.endsWith(".pdf") || file.type === "application/pdf";
};

const toStructure = (value: unknown): SyllabusStructure | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as SyllabusStructure;
};

const sortByNewest = (uploads: SyllabusUploadRecord[]) =>
  [...uploads].sort((a, b) => {
    const first = new Date(a.created_at).getTime();
    const second = new Date(b.created_at).getTime();
    return Number.isFinite(second) && Number.isFinite(first) ? second - first : 0;
  });

const upsertUpload = (
  uploads: SyllabusUploadRecord[],
  next: SyllabusUploadRecord
): SyllabusUploadRecord[] => {
  const index = uploads.findIndex((upload) => upload.upload_id === next.upload_id);

  if (index < 0) {
    return sortByNewest([next, ...uploads]);
  }

  const copy = [...uploads];
  copy[index] = next;
  return sortByNewest(copy);
};

export default function AdminSyllabusPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [uploads, setUploads] = useState<SyllabusUploadRecord[]>([]);
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);
  const [activeUpload, setActiveUpload] = useState<SyllabusUploadRecord | null>(null);

  const [isLoadingUploads, setIsLoadingUploads] = useState(true);
  const [isRefreshingUploads, setIsRefreshingUploads] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);
  const [pollingError, setPollingError] = useState<string | null>(null);

  const fetchUploads = useCallback(async (showSkeleton = false) => {
    if (showSkeleton) {
      setIsLoadingUploads(true);
    } else {
      setIsRefreshingUploads(true);
    }

    try {
      setActionError(null);
      const { data } = await adminApi.get<SyllabusUploadRecord[]>("/syllabus/uploads", {
        params: {
          limit: 50,
          offset: 0,
        },
      });

      const nextUploads = Array.isArray(data) ? sortByNewest(data) : [];
      setUploads(nextUploads);

      if (!nextUploads.length) {
        setActiveUploadId(null);
        setActiveUpload(null);
      } else if (!activeUploadId) {
        setActiveUploadId(nextUploads[0].upload_id);
        setActiveUpload(nextUploads[0]);
      } else {
        const matchedUpload = nextUploads.find(
          (upload) => upload.upload_id === activeUploadId
        );

        if (matchedUpload) {
          setActiveUpload(matchedUpload);
        } else {
          setActiveUploadId(nextUploads[0].upload_id);
          setActiveUpload(nextUploads[0]);
        }
      }
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setIsLoadingUploads(false);
      setIsRefreshingUploads(false);
    }
  }, [activeUploadId]);

  useEffect(() => {
    void fetchUploads(true);
  }, [fetchUploads]);

  useEffect(() => {
    if (!activeUploadId) {
      setIsPolling(false);
      setPollingError(null);
      return;
    }

    let cancelled = false;

    const pollUpload = async (): Promise<boolean> => {
      try {
        const { data } = await adminApi.get<SyllabusUploadRecord>(
          `/syllabus/uploads/${activeUploadId}`
        );

        if (cancelled) {
          return true;
        }

        setPollingError(null);
        setActiveUpload(data);
        setUploads((previous) => upsertUpload(previous, data));

        return terminalStatuses.has(data.status);
      } catch (error) {
        if (!cancelled) {
          setPollingError(getErrorMessage(error));
        }
        return false;
      }
    };

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startPolling = async () => {
      const reachedTerminal = await pollUpload();
      if (cancelled || reachedTerminal) {
        setIsPolling(false);
        return;
      }

      setIsPolling(true);
      intervalId = setInterval(async () => {
        const reachedTerminalStatus = await pollUpload();
        if (reachedTerminalStatus && intervalId) {
          clearInterval(intervalId);
          intervalId = null;
          setIsPolling(false);
        }
      }, 2000);
    };

    void startPolling();

    return () => {
      cancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
      setIsPolling(false);
    };
  }, [activeUploadId]);

  const onSelectFile = (file: File | null) => {
    if (!file) {
      return;
    }

    if (!isPdfFile(file)) {
      setSelectedFile(null);
      setActionError("Only .pdf files are accepted.");
      return;
    }

    setSelectedFile(file);
    setActionError(null);
    setUploadProgress(0);
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    onSelectFile(file);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const dropped = event.dataTransfer.files?.[0] ?? null;
    onSelectFile(dropped);
  };

  const handleUpload = async () => {
    if (!selectedFile || isUploading) {
      return;
    }

    setActionError(null);
    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const { data } = await adminApi.post<UploadInitResponse>(
        "/syllabus/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent: AxiosProgressEvent) => {
            if (!progressEvent.total) {
              return;
            }

            const percent = Math.round(
              (progressEvent.loaded / progressEvent.total) * 100
            );
            setUploadProgress(Math.min(Math.max(percent, 0), 100));
          },
        }
      );

      const placeholderRecord: SyllabusUploadRecord = {
        upload_id: data.upload_id,
        filename: selectedFile.name,
        status: data.status,
        extracted_structure: null,
        subjects_imported: 0,
        topics_imported: 0,
        error_message: null,
        created_at: new Date().toISOString(),
      };

      setActiveUploadId(data.upload_id);
      setActiveUpload(placeholderRecord);
      setUploads((previous) => upsertUpload(previous, placeholderRecord));
      setSelectedFile(null);
      setUploadProgress(100);

      toast({
        title: "Upload started",
        description: "Polling extraction status every 2 seconds.",
      });

      await fetchUploads(false);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setIsUploading(false);
    }
  };

  const importToDatabase = async () => {
    if (!activeUpload || activeUpload.status !== "done" || isImporting) {
      return;
    }

    setIsImporting(true);
    setActionError(null);

    try {
      const { data } = await adminApi.post<ImportResponse>(
        `/syllabus/uploads/${activeUpload.upload_id}/import`,
        {}
      );

      const subjects = Number(data.subjects_created ?? 0);
      const topics = Number(data.topics_created ?? 0);

      toast({
        title: `✅ ${subjects} subjects + ${topics} topics imported`,
      });

      await fetchUploads(false);
      const latestActive = await adminApi.get<SyllabusUploadRecord>(
        `/syllabus/uploads/${activeUpload.upload_id}`
      );
      setActiveUpload(latestActive.data);
      setUploads((previous) => upsertUpload(previous, latestActive.data));
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setIsImporting(false);
    }
  };

  const retryUpload = async () => {
    if (!activeUploadId) {
      return;
    }

    setActionError(null);
    try {
      await adminApi.post(`/syllabus/uploads/${activeUploadId}/retry`);
      await fetchUploads(false);
      toast({
        title: "Retry queued",
        description: "The syllabus PDF will be parsed again.",
      });
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  };

  const activeStructure = useMemo(
    () => toStructure(activeUpload?.extracted_structure),
    [activeUpload?.extracted_structure]
  );

  const hasImportableSubjects = useMemo(() => {
    const subjects = activeStructure?.subjects;
    if (!Array.isArray(subjects)) {
      return false;
    }

    return subjects.some(
      (subject) => typeof subject?.name === "string" && subject.name.trim().length > 0
    );
  }, [activeStructure]);

  if (isLoadingUploads) {
    return <EmptyState icon="○" title="Loading uploads" description="Fetching syllabus upload history..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        className="app-noise"
        eyebrow="Admin workflow"
        title="SYLLABUS UPLOAD"
        description="Upload syllabus PDFs, inspect parsed hierarchy, and import normalized subject/topic trees into content storage."
        badge={
          <StatusBadge tone={activeUpload ? "ice" : "neutral"}>
            {activeUpload ? `Current status ${activeUpload.status}` : `${uploads.length} uploads tracked`}
          </StatusBadge>
        }
      />

      <section className={cn(panelClass, "p-5")}>
        <div
          className={cn(
            "rounded-2xl border-2 border-dashed bg-slate-900 p-7 text-center transition",
            dragActive
              ? "border-indigo-500/80 bg-indigo-950/20"
              : "border-slate-700 hover:border-slate-500"
          )}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          aria-label="Drop PDF syllabus here"
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <FileUp className="mx-auto h-10 w-10 text-indigo-300" aria-hidden />
          <p className="mt-3 text-sm font-medium text-slate-100">
            Drag and drop your syllabus PDF here
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Only .pdf files are accepted
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            aria-label="Syllabus PDF file"
            onChange={handleFileInputChange}
          />

          <div className="mt-5 flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              className={cn(ghostButtonClass, "h-10 px-4 py-0 text-[0.62rem]")}
              onClick={(event) => {
                event.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Browse PDF
            </Button>

            <Button
              type="button"
              className={cn(fireButtonClass, "h-10 px-4 py-0 text-[0.62rem]")}
              disabled={!selectedFile || isUploading}
              onClick={(event) => {
                event.stopPropagation();
                void handleUpload();
              }}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />
                  Uploading...
                </>
              ) : (
                "Upload & Extract"
              )}
            </Button>
          </div>

          {selectedFile ? (
            <p className="mt-3 text-xs text-slate-300">Selected: {selectedFile.name}</p>
          ) : null}

          {(isUploading || (uploadProgress > 0 && uploadProgress < 100)) &&
          uploadProgress <= 100 ? (
            <div className="mx-auto mt-4 w-full max-w-lg">
              <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                <span>Upload Progress</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all"
                  style={{ width: `${uploadProgress}%` }}
                  role="progressbar"
                  aria-valuenow={uploadProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>
          ) : null}
        </div>

        {actionError ? (
          <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3">
            <p className="text-sm text-rose-100">{actionError}</p>
          </div>
        ) : null}

        {pollingError ? (
          <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
            <p className="text-sm text-amber-100">{pollingError}</p>
          </div>
        ) : null}
      </section>

      {activeUpload ? (
        <section className={cn(panelClass, "p-5")}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-4xl leading-none tracking-[0.06em] text-[var(--cream)]">
                CURRENT UPLOAD
              </h2>
              <p className="mt-1 text-xs text-slate-400">{activeUpload.filename}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn("capitalize", statusBadgeClassMap[activeUpload.status])}
              >
                {activeUpload.lifecycle_state ?? activeUpload.status}
              </Badge>

              {typeof activeUpload.progress_pct === "number" ? (
                <span className="text-xs text-slate-300">{activeUpload.progress_pct}%</span>
              ) : null}

              {isPolling && !terminalStatuses.has(activeUpload.status) ? (
                <span className="text-xs text-sky-300">Polling every 2s</span>
              ) : null}

              <Button
                type="button"
                size="sm"
                variant="outline"
                className={cn(ghostButtonClass, "h-9 px-4 py-0 text-[0.6rem]")}
                onClick={() => void fetchUploads(false)}
                disabled={isRefreshingUploads}
              >
                <RefreshCw
                  className={cn("mr-1 h-4 w-4", isRefreshingUploads && "animate-spin")}
                  aria-hidden
                />
                Refresh
              </Button>

              {activeUpload.can_retry ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={cn(ghostButtonClass, "h-9 px-4 py-0 text-[0.6rem]")}
                  onClick={() => void retryUpload()}
                >
                  Retry
                </Button>
              ) : null}
            </div>
          </div>

          {activeUpload.job_summary ? (
            <p className="mt-4 text-xs text-slate-400">
              Parsed {activeUpload.job_summary.subject_count ?? 0} subjects ·{" "}
              {activeUpload.job_summary.topic_count ?? 0} topics · Parser{" "}
              {activeUpload.provenance?.parser ?? "ai_then_rule_fallback"}
            </p>
          ) : null}

          {activeUpload.status === "processing" || activeUpload.status === "pending" ? (
            <p className="mt-4 text-sm text-sky-200 animate-pulse">
              Extracting PDF text and parsing structure with the AI layer...
            </p>
          ) : null}

          {activeUpload.status === "failed" ? (
            <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3">
              <p className="text-sm text-rose-100">
                <AlertCircle className="mr-1 inline h-4 w-4" aria-hidden />
                {activeUpload.error_message || "Syllabus extraction failed."}
              </p>
            </div>
          ) : null}

          {activeUpload.status === "done" ? (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-sm text-slate-300">
                  Imported so far: {activeUpload.subjects_imported} subjects • {" "}
                  {activeUpload.topics_imported} topics
                </p>
                <Button
                  type="button"
                  className={cn(fireButtonClass, "h-9 px-4 py-0 text-[0.6rem]")}
                  onClick={() => void importToDatabase()}
                  disabled={isImporting || !activeStructure}
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />
                      Importing...
                    </>
                  ) : (
                    "Import to Database"
                  )}
                </Button>
              </div>

              {!hasImportableSubjects ? (
                <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                  No subjects were parsed from this file yet. Import will attempt a local fallback parse from the uploaded PDF.
                </p>
              ) : null}

              {activeStructure ? (
                <SyllabusTreeViewer structure={activeStructure} />
              ) : (
                <p className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-sm text-slate-300">
                  Upload completed, but no extracted structure is available.
                </p>
              )}
            </div>
          ) : null}
        </section>
      ) : (
        <EmptyState
          icon="○"
          title="No active upload"
          description="Upload a syllabus PDF or select one from past uploads."
        />
      )}

      <section className={cn(panelClass, "p-5")}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-4xl leading-none tracking-[0.06em] text-[var(--cream)]">
            PAST UPLOADS
          </h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn(ghostButtonClass, "h-9 px-4 py-0 text-[0.6rem]")}
            onClick={() => void fetchUploads(false)}
            disabled={isRefreshingUploads}
          >
            <RefreshCw
              className={cn("mr-1 h-4 w-4", isRefreshingUploads && "animate-spin")}
              aria-hidden
            />
            Refresh List
          </Button>
        </div>

        {uploads.length === 0 ? (
          <EmptyState
            icon="○"
            title="No uploads yet"
            description="Upload your first syllabus PDF to start extraction."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-900 text-xs uppercase tracking-widest text-slate-400">
                  <tr>
                    <th className="px-3 py-3 text-left">Filename</th>
                    <th className="px-3 py-3 text-left">Status</th>
                    <th className="px-3 py-3 text-left">Subjects Imported</th>
                    <th className="px-3 py-3 text-left">Topics Imported</th>
                    <th className="px-3 py-3 text-left">Created</th>
                    <th className="px-3 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {uploads.map((upload) => (
                    <tr key={upload.upload_id} className="border-t border-slate-800">
                      <td className="px-3 py-3 text-slate-200">{upload.filename}</td>
                      <td className="px-3 py-3">
                        <Badge
                          variant="outline"
                          className={cn("capitalize", statusBadgeClassMap[upload.status])}
                        >
                          {upload.lifecycle_state ?? upload.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-slate-300">{upload.subjects_imported}</td>
                      <td className="px-3 py-3 text-slate-300">{upload.topics_imported}</td>
                      <td className="px-3 py-3 text-slate-400">
                        {new Date(upload.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-slate-100 hover:bg-slate-800"
                          onClick={() => {
                            setActionError(null);
                            setPollingError(null);
                            setActiveUploadId(upload.upload_id);
                            setActiveUpload(upload);
                          }}
                          aria-label={`View syllabus upload ${upload.filename}`}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
