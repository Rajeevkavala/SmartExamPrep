"use client";

import { ArrowRight, BookOpen, ChevronDown, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { api } from "@/lib/api";

type ExamCatalogItem = {
  exam_id: string;
  code: string;
  title: string;
  category: string;
  description?: string | null;
  topic_count: number;
  pyq_count: number;
  enrolled_count: number;
};

type SortKey = "popular" | "topics" | "pyqs";

export default function ExamsPage() {
  const router = useRouter();
  const [exams, setExams] = useState<ExamCatalogItem[]>([]);
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState<SortKey>("popular");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadExams = async () => {
      try {
        setLoadError(null);
        const { data } = await api.get<ExamCatalogItem[]>("/exams");
        if (active) {
          setExams(data ?? []);
        }
      } catch (error) {
        if (!active) {
          return;
        }

        const detail =
          (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
          "Unable to load exam catalog right now.";
        setLoadError(detail);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadExams();

    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(() => {
    const dynamicCategories = Array.from(new Set(exams.map((exam) => exam.category))).sort();
    return ["All", ...dynamicCategories];
  }, [exams]);

  const filteredExams = useMemo(() => {
    const next = exams.filter((exam) => category === "All" || exam.category === category);

    return [...next].sort((left, right) => {
      if (sortBy === "topics") {
        return right.topic_count - left.topic_count;
      }
      if (sortBy === "pyqs") {
        return right.pyq_count - left.pyq_count;
      }
      return right.enrolled_count - left.enrolled_count;
    });
  }, [category, exams, sortBy]);

  if (isLoading) {
    return <LoadingSpinner message="Loading exam tracks..." />;
  }

  if (loadError) {
    return (
      <main>
        <EmptyState
          icon="!"
          title="Exam catalog unavailable"
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
        <h1 className="font-display text-[3.2rem] leading-none tracking-[0.03em] text-[var(--cream)] md:text-[4.1rem]">
          CHOOSE YOUR EXAM
        </h1>
        <p className="text-xl text-[rgba(194,186,176,0.72)]">
          Explore supported exam tracks, topic coverage, and PYQ depth before you
          launch predictions or mock sessions.
        </p>
      </header>

      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={
                item === category
                  ? "h-11 border border-[rgba(232,82,10,0.6)] bg-[rgba(232,82,10,0.12)] px-4 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[var(--cream)]"
                  : "h-11 border border-[rgba(240,232,218,0.08)] bg-transparent px-4 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[rgba(194,186,176,0.72)]"
              }
            >
              {item}
            </button>
          ))}
        </div>

        <div className="relative">
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as SortKey)}
            className="flex h-11 min-w-[184px] appearance-none items-center justify-between gap-3 border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.02)] px-4 pr-10 text-sm text-[var(--cream)]"
          >
            <option value="popular">Popular</option>
            <option value="topics">Most Topics</option>
            <option value="pyqs">Most PYQs</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgba(194,186,176,0.62)]" />
        </div>
      </section>

      {filteredExams.length === 0 ? (
        <section className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-6">
          <p className="text-sm text-[rgba(194,186,176,0.68)]">
            No exam tracks matched the current filters.
          </p>
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filteredExams.map((exam) => (
            <article
              key={exam.exam_id}
              className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-5"
            >
              <h2 className="text-[2.25rem] font-semibold leading-tight text-[var(--cream)]">
                {exam.title}
              </h2>

              <span className="mt-3 inline-flex rounded-full border border-[rgba(0,212,255,0.35)] bg-[rgba(0,212,255,0.1)] px-3 py-1 font-mono text-[0.56rem] uppercase tracking-[0.18em] text-[var(--ice)]">
                {exam.category}
              </span>

              <p className="mt-4 min-h-[72px] text-sm leading-7 text-[rgba(194,186,176,0.72)]">
                {exam.description ?? "Launch predictions, roadmap planning, and mock tests from this exam track."}
              </p>

              <div className="mt-4 space-y-1 text-[rgba(194,186,176,0.74)]">
                <p className="flex items-center gap-2 text-sm">
                  <BookOpen className="h-4 w-4 text-[var(--fire)]" />
                  {exam.topic_count} topics · {exam.pyq_count} PYQs
                </p>
                <p className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-[var(--ice)]" />
                  {exam.enrolled_count} learners have launched sessions here
                </p>
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => router.push(`/predict?exam_id=${exam.exam_id}`)}
                  className="flex h-11 flex-1 items-center justify-between bg-[var(--fire)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--fire2)]"
                >
                  Start Exam Track
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/mock-tests?exam_id=${exam.exam_id}`)}
                  className="h-11 border border-[rgba(240,232,218,0.08)] px-4 text-sm text-[var(--cream)]"
                >
                  Mock
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      <footer className="border-t border-[rgba(240,232,218,0.08)] pt-4 text-sm text-[rgba(194,186,176,0.58)]">
        Showing {filteredExams.length} exam track{filteredExams.length === 1 ? "" : "s"}.
      </footer>
    </main>
  );
}
