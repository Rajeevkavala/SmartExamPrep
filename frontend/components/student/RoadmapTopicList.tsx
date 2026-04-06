import { ExternalLink } from "lucide-react";

import { insetPanelClass, StatusBadge } from "@/components/shared/brand-ui";
import type { RoadmapTopicItem } from "@/store/roadmapStore";
import { cn } from "@/lib/utils";

type RoadmapTopicListProps = {
  topics: RoadmapTopicItem[];
};

export default function RoadmapTopicList({ topics }: RoadmapTopicListProps) {
  if (!topics.length) {
    return (
      <p className="rounded-[22px] border border-white/8 bg-white/3 px-4 py-4 text-sm text-[rgba(194,186,176,0.66)]">
        No topics planned for this week yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {topics.map((topic) => (
        <article
          key={`${topic.topic_id}-${topic.sequence_order}`}
          className={cn(insetPanelClass, "space-y-4 p-4")}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[var(--cream)]">{topic.topic_name}</p>
              <p className="mt-1 text-xs text-[rgba(194,186,176,0.62)]">{topic.subject_name}</p>
            </div>
            <StatusBadge
              tone={
                topic.goal_type === "learn"
                  ? "ice"
                  : topic.goal_type === "revise"
                    ? "success"
                    : "warning"
              }
            >
              {topic.goal_type}
            </StatusBadge>
          </div>

          <div className="flex flex-wrap gap-2 text-[0.62rem] uppercase tracking-[0.22em] text-[rgba(194,186,176,0.58)]">
            <span>{topic.planned_minutes} min</span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span>priority {topic.priority_score.toFixed(1)}</span>
          </div>

          {(topic.resources ?? []).length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {(topic.resources ?? []).slice(0, 3).map((resource, index) => (
                <a
                  key={`${topic.topic_id}-resource-${index}`}
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/4 px-3 py-2 font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[var(--cream)] transition hover:border-white/20 hover:bg-white/7"
                >
                  {resource.title}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
