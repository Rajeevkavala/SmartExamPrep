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
  ShieldAlert,
} from "lucide-react";

import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { adminApi } from "@/lib/api";

type QuestionsResponse = {
  total?: number;
};

type SubjectResponse = {
  topic_count?: number;
};

type DashboardStats = {
  totalQuestions: number;
  unverifiedQuestions: number;
  subjectsCount: number;
  topicsCount: number;
  scrapeJobsCount: number;
  pdfUploadsCount: number;
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
        ] = await Promise.all([
          adminApi.get<QuestionsResponse>("/questions/", {
            params: { limit: 1 },
          }),
          adminApi.get<QuestionsResponse>("/questions/", {
            params: { is_verified: false, limit: 1 },
          }),
          adminApi.get<SubjectResponse[]>("/content/subjects"),
          adminApi.get<unknown[]>("/scraper/jobs", {
            params: { limit: 100 },
          }),
          adminApi.get<unknown[]>("/syllabus/uploads", {
            params: { limit: 100 },
          }),
        ]);

        const subjects = Array.isArray(subjectsResponse.data)
          ? subjectsResponse.data
          : [];

        const topicsCount = subjects.reduce(
          (sum, subject) => sum + Number(subject.topic_count ?? 0),
          0
        );

        if (!cancelled) {
          setStats({
            totalQuestions: Number(totalQuestionsResponse.data?.total ?? 0),
            unverifiedQuestions: Number(unverifiedResponse.data?.total ?? 0),
            subjectsCount: subjects.length,
            topicsCount,
            scrapeJobsCount: Array.isArray(jobsResponse.data)
              ? jobsResponse.data.length
              : 0,
            pdfUploadsCount: Array.isArray(uploadsResponse.data)
              ? uploadsResponse.data.length
              : 0,
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
      <header className="rounded-2xl border border-slate-800 bg-linear-to-r from-slate-900 to-indigo-950 p-6">
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-slate-300">
          Monitor question quality, content inventory, and ingestion pipelines.
        </p>
      </header>

      {stats.unverifiedQuestions > 0 ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4">
          <p className="text-sm text-rose-100">
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
              className={`rounded-2xl border p-5 ${
                isDanger
                  ? "border-rose-500/30 bg-rose-500/10"
                  : "border-slate-800 bg-slate-900/70"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-300">{card.label}</p>
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
          className="group rounded-2xl border border-slate-800 bg-slate-900/70 p-5 transition hover:border-indigo-500/40 hover:bg-slate-900"
        >
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Quick Action</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Scrape Questions</h2>
          <p className="mt-1 text-sm text-slate-300">
            Start a new scrape job and import accepted questions.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-300">
            Open Scraper
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </Link>

        <Link
          href="/admin/syllabus"
          className="group rounded-2xl border border-slate-800 bg-slate-900/70 p-5 transition hover:border-indigo-500/40 hover:bg-slate-900"
        >
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Quick Action</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Upload Syllabus</h2>
          <p className="mt-1 text-sm text-slate-300">
            Parse syllabus PDFs and sync extracted structure to the database.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-300">
            Open Syllabus Upload
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </Link>

        <Link
          href="/admin/questions"
          className="group rounded-2xl border border-slate-800 bg-slate-900/70 p-5 transition hover:border-indigo-500/40 hover:bg-slate-900"
        >
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Quick Action</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Manage Questions</h2>
          <p className="mt-1 text-sm text-slate-300">
            Verify, edit, and curate all question bank entries.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-300">
            Open Questions Manager
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </Link>
      </section>
    </div>
  );
}
