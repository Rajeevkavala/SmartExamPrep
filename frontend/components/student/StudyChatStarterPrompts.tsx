import { StatusBadge } from "@/components/shared/brand-ui";

type StudyChatStarterPromptsProps = {
  disabled?: boolean;
  onSelectPrompt: (prompt: string) => void;
};

const STARTER_PROMPTS = [
  "Help me understand my weakest topic using today's context.",
  "What should I prioritize in my roadmap this week?",
  "Give me a realistic 30-minute study plan for today.",
  "Which PYQ practice should I take next and why?",
];

export default function StudyChatStarterPrompts({
  disabled = false,
  onSelectPrompt,
}: StudyChatStarterPromptsProps) {
  return (
    <section className="space-y-3">
      <StatusBadge tone="ice">Starter prompts</StatusBadge>
      <div className="flex flex-wrap gap-2">
        {STARTER_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={disabled}
            onClick={() => onSelectPrompt(prompt)}
            className="rounded-full border border-[rgba(0,212,255,0.22)] bg-[rgba(0,212,255,0.08)] px-3 py-2 text-left font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[var(--ice)] transition hover:bg-[rgba(0,212,255,0.12)] disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>
    </section>
  );
}
