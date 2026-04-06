"use client";

import { useState } from "react";

import {
  fireButtonClass,
  panelClass,
  textareaClass,
} from "@/components/shared/brand-ui";
import { cn } from "@/lib/utils";

type StudyChatComposerProps = {
  disabled?: boolean;
  isSending?: boolean;
  onSend: (message: string) => Promise<void> | void;
};

export default function StudyChatComposer({
  disabled = false,
  isSending = false,
  onSend,
}: StudyChatComposerProps) {
  const [draft, setDraft] = useState("");

  const trimmedDraft = draft.trim();
  const canSend = !disabled && !isSending && trimmedDraft.length >= 2;

  const handleSubmit = async () => {
    if (!canSend) {
      return;
    }

    const current = trimmedDraft;
    setDraft("");
    await onSend(current);
  };

  return (
    <div className={cn(panelClass, "p-5")}>
      <label
        htmlFor="study-chat-input"
        className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-[rgba(194,186,176,0.58)]"
      >
        Ask your study assistant
      </label>
      <textarea
        id="study-chat-input"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void handleSubmit();
          }
        }}
        rows={3}
        disabled={disabled || isSending}
        placeholder="Ask about weak topics, planner tasks, roadmap priorities, or PYQ strategy..."
        className={cn(textareaClass, "mt-4 disabled:opacity-60")}
      />
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs uppercase tracking-[0.22em] text-[rgba(194,186,176,0.58)]">
          Press Enter to send, Shift+Enter for a new line.
        </p>
        <button
          type="button"
          disabled={!canSend}
          onClick={() => {
            void handleSubmit();
          }}
          className={fireButtonClass}
        >
          {isSending ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
