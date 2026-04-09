"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookOpenText,
  Bug,
  CircleHelp,
  FileText,
  ListChecks,
  MessageSquareQuote,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

import { PageHeader, panelClass, StatusBadge } from "@/components/shared/brand-ui";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { adminApi, api } from "@/lib/api";
import { cn } from "@/lib/utils";

type QuestionsResponse = {
  total?: number;
};

type SubjectResponse = {
  topic_count?: number;
};

type PipelineItem = {
  status?: string;
  lifecycle_state?: string;
};

type FeedbackSummary = {
  total_responses?: number;
  average_overall_rating?: number;
};

type DashboardStats = {
  totalQuestions: number;
  unverifiedQuestions: number;
  subjectsCount: number;
  topicsCount: number;
  scrapeJobsCount: number;
  pdfUploadsCount: number;
  activeIngestionJobs: number;
  feedbackCount: number;
  feedbackAverage: number;
};

type StatCard = {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: "default" | "danger";
};

const getErrorMessage = (error: unknown) => {
  const message = (error as { response?: { data?: { detail?: string } } })
    ?.response?.data?.detail;

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  return "Unable to load admin dashboard data right now.";
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchDashboard = async () => {
      try {
        setError(null);

        const [
          totalQuestionsResponse,
          unverifiedResponse,
          subjectsResponse,
          jobsResponse,
          uploadsResponse,
          feedbackSummaryResponse,
        ] = await Promise.all([
          adminApi.get<QuestionsResponse>("/questions/", {
            params: { limit: 1 },
          }),
          adminApi.get<QuestionsResponse>("/questions/", {
            params: { is_verified: false, limit: 1 },
          }),
          adminApi.get<SubjectResponse[]>("/content/subjects"),
          adminApi.get<PipelineItem[]>("/scraper/jobs", {
            params: { limit: 100 },
          }),
          adminApi.get<PipelineItem[]>("/syllabus/uploads", {
            params: { limit: 100 },
          }),
          api.get<FeedbackSummary>("/feedback/admin/summary"),
        ]);

        const subjects = Array.isArray(subjectsResponse.data)
          ? subjectsResponse.data
          : [];

        const topicsCount = subjects.reduce(
          (sum, subject) => sum + Number(subject.topic_count ?? 0),
          0
        );

        const scrapeJobs = Array.isArray(jobsResponse.data) ? jobsResponse.data : [];
        const syllabusUploads = Array.isArray(uploadsResponse.data)
          ? uploadsResponse.data
          : [];
        const activeIngestionJobs = [...scrapeJobs, ...syllabusUploads].filter((item) => {
          const state = item.lifecycle_state ?? item.status;
          return (
            state === "queued" ||
            state === "running" ||
            state === "pending" ||
            state === "processing"
          );
        }).length;

        if (!cancelled) {
          setStats({
            totalQuestions: Number(totalQuestionsResponse.data?.total ?? 0),
            unverifiedQuestions: Number(unverifiedResponse.data?.total ?? 0),
            subjectsCount: subjects.length,
            topicsCount,
            scrapeJobsCount: scrapeJobs.length,
            pdfUploadsCount: syllabusUploads.length,
            activeIngestionJobs,
            feedbackCount: Number(feedbackSummaryResponse.data?.total_responses ?? 0),
            feedbackAverage: Number(feedbackSummaryResponse.data?.average_overall_rating ?? 0),
          });
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(getErrorMessage(fetchError));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const statCards: StatCard[] = useMemo(() => {
    if (!stats) {
      return [];
    }

    return [
      {
        label: "Total Questions",
        value: stats.totalQuestions,
        icon: CircleHelp,
      },
      {
        label: "Unverified",
        value: stats.unverifiedQuestions,
        icon: ShieldAlert,
        tone: "danger",
      },
      {
        label: "Subjects",
        value: stats.subjectsCount,
        icon: BookOpenText,
      },
      {
        label: "Topics",
        value: stats.topicsCount,
        icon: ListChecks,
      },
      {
        label: "Scrape Jobs",
        value: stats.scrapeJobsCount,
        icon: Bug,
      },
      {
        label: "PDF Uploads",
        value: stats.pdfUploadsCount,
        icon: FileText,
      },
      {
        label: "Active Pipelines",
        value: stats.activeIngestionJobs,
        icon: RefreshCw,
      },
      {
        label: "Feedback Avg",
        value: Number(stats.feedbackAverage.toFixed(1)),
        icon: MessageSquareQuote,
      },
    ];
  }, [stats]);

  if (isLoading) {
    return <LoadingSpinner message="Loading admin dashboard..." />;
  }

  if (error) {
    return (
      <EmptyState
        icon="⚠"
        title="Dashboard unavailable"
        description={error}
        ctaLabel="Retry"
        ctaHref="/admin"
      />
    );
  }

  if (!stats) {
    return (
      <EmptyState
        icon="○"
        title="No dashboard data"
        description="Admin analytics are not available yet."
        ctaLabel="Go to Subjects"
        ctaHref="/admin/subjects"
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        className="app-noise"
        eyebrow="Admin control"
        title="CONTENT OPS DASHBOARD"
        description="Track question quality, subject coverage, ingestion queues, and feedback health from one operations surface."
        badge={
          <StatusBadge tone={stats.unverifiedQuestions > 0 ? "warning" : "success"}>
            {stats.unverifiedQuestions > 0
              ? `${stats.unverifiedQuestions} pending verification`
              : "All scraped questions verified"}
          </StatusBadge>
        }
      />

      {stats.unverifiedQuestions > 0 ? (
        <div className="rounded-[22px] border border-rose-500/30 bg-rose-500/10 p-4">
          <p className="text-sm text-rose-100/95">
            <span className="font-semibold">⚠ {stats.unverifiedQuestions}</span>{" "}
            scraped questions need verification before going live.
          </p>
          <Link
            href="/admin/questions?is_verified=false"
            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-rose-200 underline-offset-2 hover:underline"
          >
            Review unverified questions
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          const isDanger = card.tone === "danger";

          return (
            <article
              key={card.label}
              className={cn("rounded-[22px] border p-5", 
                isDanger
                  ? "border-rose-500/30 bg-rose-500/10"
                  : "border-white/10 bg-[rgba(255,255,255,0.03)]"
              )}
            >
              <div className="flex items-center justify-between">
                <p className="font-mono text-[0.64rem] uppercase tracking-[0.2em] text-[rgba(194,186,176,0.72)]">
                  {card.label}
                </p>
                <Icon
                  className={`h-5 w-5 ${isDanger ? "text-rose-300" : "text-indigo-300"}`}
                  aria-hidden
                />
              </div>
              <p
                className={`mt-3 text-3xl font-bold ${
                  isDanger ? "text-rose-100" : "text-white"
                }`}
              >
                {card.value}
              </p>
            </article>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Link
          href="/admin/scraper"
          className={cn(panelClass, "group p-5 transition duration-300 hover:-translate-y-0.5")}
        >
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.24em] text-[rgba(194,186,176,0.62)]">
            Quick Action
          </p>
          <h2 className="mt-2 font-display text-4xl leading-none tracking-[0.06em] text-[var(--cream)]">
            SCRAPE QUESTIONS
          </h2>
          <p className="mt-2 text-sm text-[rgba(194,186,176,0.76)]">
            Start a new scrape job and import accepted questions.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--ice)]">
            Open Scraper
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </Link>

        <Link
          href="/admin/syllabus"
          className={cn(panelClass, "group p-5 transition duration-300 hover:-translate-y-0.5")}
        >
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.24em] text-[rgba(194,186,176,0.62)]">
            Quick Action
          </p>
          <h2 className="mt-2 font-display text-4xl leading-none tracking-[0.06em] text-[var(--cream)]">
            UPLOAD SYLLABUS
          </h2>
          <p className="mt-2 text-sm text-[rgba(194,186,176,0.76)]">
            Parse syllabus PDFs and sync extracted structure to the database.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--ice)]">
            Open Syllabus Upload
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </Link>

        <Link
          href="/admin/questions"
          className={cn(panelClass, "group p-5 transition duration-300 hover:-translate-y-0.5")}
        >
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.24em] text-[rgba(194,186,176,0.62)]">
            Quick Action
          </p>
          <h2 className="mt-2 font-display text-4xl leading-none tracking-[0.06em] text-[var(--cream)]">
            MANAGE QUESTIONS
          </h2>
          <p className="mt-2 text-sm text-[rgba(194,186,176,0.76)]">
            Verify, edit, and curate all question bank entries.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--ice)]">
            Open Questions Manager
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </Link>
      </section>
    </div>
  );
}
