"use client";

import { ProgressBar, StatusBadge } from "@/components/shared/brand-ui";
import { cn } from "@/lib/utils";

type SubjectOption = {
  id: string;
  name: string;
  description?: string | null;
  topic_count?: number;
};

type SubjectConfidence = {
  subject_id: string;
  confidence_pct: number;
};

type OnboardingSubjectConfidenceProps = {
  subjects: SubjectOption[];
  subjectConfidences: SubjectConfidence[];
  error?: string;
  onConfidenceChange: (subjectId: string, confidencePct: number) => void;
};

const getConfidenceValue = (
  subjectConfidences: SubjectConfidence[],
  subjectId: string
) =>
  subjectConfidences.find((item) => item.subject_id === subjectId)?.confidence_pct ??
  50;

export default function OnboardingSubjectConfidence({
  subjects,
  subjectConfidences,
  error,
  onConfidenceChange,
}: OnboardingSubjectConfidenceProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-4xl tracking-[0.08em] text-[var(--cream)]">
          RATE YOUR CONFIDENCE
        </h2>
        <p className="mt-3 text-sm leading-7 text-[rgba(194,186,176,0.72)]">
          Give each subject an honest starting confidence so the adaptive loop knows where to push first.
        </p>
      </div>

      {subjects.length > 0 ? (
        subjects.map((subject) => {
          const confidence = getConfidenceValue(subjectConfidences, subject.id);
          return (
            <div key={subject.id} className="rounded-[24px] border border-white/8 bg-white/3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-medium text-[var(--cream)]">{subject.name}</p>
                  <p className="mt-1 text-xs text-[rgba(194,186,176,0.58)]">
                    {subject.topic_count ?? 0} topics available
                  </p>
                </div>
                <StatusBadge tone={confidence >= 70 ? "success" : confidence >= 40 ? "warning" : "fire"}>
                  {confidence}%
                </StatusBadge>
              </div>
              <div className="mt-5 space-y-3">
                <ProgressBar value={confidence} tone={confidence >= 70 ? "success" : confidence >= 40 ? "warning" : "fire"} />
                <input
                  aria-label={`${subject.name} confidence`}
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={confidence}
                  onChange={(event) =>
                    onConfidenceChange(subject.id, Number(event.target.value))
                  }
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10"
                />
              </div>
            </div>
          );
        })
      ) : (
        <div className="rounded-[24px] border border-amber-500/20 bg-amber-500/10 p-4">
          <p className="text-sm text-amber-100">
            No subjects are available yet. Ask an admin to upload the syllabus before continuing.
          </p>
        </div>
      )}

      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
    </div>
  );
}
