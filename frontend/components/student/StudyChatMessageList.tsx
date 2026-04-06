import { panelClass, StatusBadge } from "@/components/shared/brand-ui";
import type { StudyChatMessage } from "@/store/chatStore";
import { cn } from "@/lib/utils";

type StudyChatMessageListProps = {
  messages: StudyChatMessage[];
  isLoading?: boolean;
};

const formatTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export default function StudyChatMessageList({
  messages,
  isLoading = false,
}: StudyChatMessageListProps) {
  if (isLoading) {
    return (
      <section className={cn(panelClass, "p-6")}>
        <p className="text-sm text-[rgba(194,186,176,0.72)]">Loading conversation...</p>
      </section>
    );
  }

  if (messages.length === 0) {
    return (
      <section className={cn(panelClass, "p-8 text-center")}>
        <p className="text-sm text-[rgba(194,186,176,0.68)]">
          Start the conversation with a grounded study question.
        </p>
      </section>
    );
  }

  return (
    <section className={cn(panelClass, "max-h-[640px] space-y-4 overflow-y-auto p-5")}>
      {messages.map((message) => {
        const isUser = message.role === "user";

        return (
          <article key={message.id} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[88%] rounded-[24px] border px-4 py-4",
                isUser
                  ? "border-[rgba(0,212,255,0.22)] bg-[rgba(0,212,255,0.08)] text-[var(--cream)]"
                  : "border-[rgba(232,82,10,0.18)] bg-[rgba(232,82,10,0.06)] text-[rgba(194,186,176,0.78)]"
              )}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <StatusBadge tone={isUser ? "ice" : "fire"}>
                  {isUser ? "You" : message.role === "system" ? "System" : "AI"}
                </StatusBadge>
                <p className="font-mono text-[0.56rem] uppercase tracking-[0.22em] text-[rgba(194,186,176,0.58)]">
                  {formatTime(message.created_at)}
                </p>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-7">{message.message_text}</p>
            </div>
          </article>
        );
      })}
    </section>
  );
}
