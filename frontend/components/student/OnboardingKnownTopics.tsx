"use client";

import { ChevronDown } from "lucide-react";

import { StatusBadge } from "@/components/shared/brand-ui";
import { cn } from "@/lib/utils";

type SubjectOption = {
  id: string;
  name: string;
};

type TopicOption = {
  id: string;
  subject_id: string;
  name: string;
  subtopics: string[];
  difficulty_weight: number;
};

type OnboardingKnownTopicsProps = {
  subjects: SubjectOption[];
  topicCache: Record<string, TopicOption[]>;
  expandedSubjectId: string | null;
  loadingSubjectId: string | null;
  selectedTopicIds: string[];
  onToggleSubject: (subjectId: string) => void;
  onToggleTopic: (topicId: string) => void;
};

export default function OnboardingKnownTopics({
  subjects,
  topicCache,
  expandedSubjectId,
  loadingSubjectId,
  selectedTopicIds,
  onToggleSubject,
  onToggleTopic,
}: OnboardingKnownTopicsProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-4xl tracking-[0.08em] text-[var(--cream)]">
          MARK CONFIDENT TOPICS
        </h2>
        <p className="mt-3 text-sm leading-7 text-[rgba(194,186,176,0.72)]">
          Mark topics you already know well. If you are unsure, leave them unchecked and let the loop verify that later.
        </p>
      </div>

      {subjects.map((subject) => {
        const isExpanded = expandedSubjectId === subject.id;
        const topics = topicCache[subject.id] ?? [];
        const isLoading = loadingSubjectId === subject.id;

        return (
          <div key={subject.id} className="rounded-[24px] border border-white/8 bg-white/3 p-5">
            <button
              type="button"
              onClick={() => onToggleSubject(subject.id)}
              className="flex w-full items-center justify-between gap-4 text-left"
            >
              <div>
                <p className="text-lg font-medium text-[var(--cream)]">{subject.name}</p>
                <p className="mt-1 text-xs text-[rgba(194,186,176,0.58)]">
                  Expand to mark confident topics
                </p>
              </div>
              <ChevronDown className={cn("h-5 w-5 text-[rgba(194,186,176,0.58)] transition", isExpanded ? "rotate-180" : "")} />
            </button>

            {isExpanded ? (
              <div className="mt-5 space-y-3">
                {isLoading ? (
                  <p className="text-sm text-[rgba(194,186,176,0.68)]">Loading topics...</p>
                ) : topics.length > 0 ? (
                  topics.map((topic) => {
                    const checked = selectedTopicIds.includes(topic.id);

                    return (
                      <label
                        key={topic.id}
                        className="flex cursor-pointer items-start gap-3 rounded-[22px] border border-white/8 bg-[rgba(6,6,10,0.72)] px-4 py-4"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => onToggleTopic(topic.id)}
                          className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-[var(--fire)]"
                        />
                        <span className="space-y-2">
                          <span className="block text-sm font-medium text-[var(--cream)]">
                            {topic.name}
                          </span>
                          {topic.subtopics.length > 0 ? (
                            <span className="block text-xs text-[rgba(194,186,176,0.58)]">
                              {topic.subtopics.slice(0, 3).join(", ")}
                            </span>
                          ) : null}
                          <StatusBadge tone="warning">
                            Difficulty {topic.difficulty_weight.toFixed(1)}
                          </StatusBadge>
                        </span>
                      </label>
                    );
                  })
                ) : (
                  <p className="text-sm text-[rgba(194,186,176,0.68)]">
                    No topics available for this subject yet.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
