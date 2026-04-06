import { panelClass, StatusBadge } from "@/components/shared/brand-ui";
import type { StudyChatSessionSummary } from "@/store/chatStore";
import { cn } from "@/lib/utils";

type ChatSidebarContextProps = {
  session: StudyChatSessionSummary | null;
  groundingSnapshot?: Record<string, unknown> | null;
};

const toObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .map((item) => (typeof item === "string" ? item : ""))
        .filter(Boolean)
    : [];

export default function ChatSidebarContext({
  session,
  groundingSnapshot,
}: ChatSidebarContextProps) {
  const snapshot = toObject(groundingSnapshot);
  const userProfile = toObject(snapshot.user_profile);
  const planner = toObject(snapshot.planner);
  const roadmap = toObject(snapshot.roadmap);

  const weakTopics = Array.isArray(snapshot.weak_topics)
    ? (snapshot.weak_topics as Array<Record<string, unknown>>)
    : [];
  const topWeakTopic = weakTopics.find((item) => typeof item?.topic_name === "string");
  const roadmapTopics = toStringArray(roadmap.current_week_topics).slice(0, 4);
  const suggestedActions = toStringArray(snapshot.recommended_actions).slice(0, 3);

  return (
    <aside className={cn(panelClass, "space-y-5 p-5")}>
      <div className="space-y-2">
        <StatusBadge tone="ice">Session</StatusBadge>
        <p className="text-lg font-medium text-[var(--cream)]">
          {session?.title ?? "Study Chat"}
        </p>
        <p className="text-xs text-[rgba(194,186,176,0.58)]">
          Context mode: {session?.context_type ?? "general"}
        </p>
      </div>

      <div className="space-y-2">
        <StatusBadge tone="fire">Profile grounding</StatusBadge>
        <p className="text-sm text-[rgba(194,186,176,0.74)]">
          Daily target: {String(userProfile.daily_study_minutes ?? "-")} minutes
        </p>
        <p className="text-sm text-[rgba(194,186,176,0.74)]">
          Exam date: {String(userProfile.exam_target_date ?? "Not set")}
        </p>
      </div>

      <div className="space-y-2">
        <StatusBadge tone="warning">Current weak focus</StatusBadge>
        <p className="text-sm text-[var(--cream)]">
          {typeof topWeakTopic?.topic_name === "string"
            ? `${topWeakTopic.topic_name} (${String(topWeakTopic.subject_name ?? "")})`
            : "No weak-topic snapshot yet."}
        </p>
        <p className="text-xs text-[rgba(194,186,176,0.58)]">
          Planner status: {String(planner.status ?? "missing")}
        </p>
      </div>

      {roadmapTopics.length > 0 ? (
        <div className="space-y-3">
          <StatusBadge tone="success">Roadmap topics</StatusBadge>
          <ul className="space-y-2 text-sm text-[rgba(194,186,176,0.74)]">
            {roadmapTopics.map((topic) => (
              <li key={topic}>• {topic}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {suggestedActions.length > 0 ? (
        <div className="space-y-3">
          <StatusBadge tone="ice">Suggested next steps</StatusBadge>
          <ul className="space-y-2 text-sm text-[rgba(194,186,176,0.74)]">
            {suggestedActions.map((action) => (
              <li key={action}>• {action}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </aside>
  );
}
