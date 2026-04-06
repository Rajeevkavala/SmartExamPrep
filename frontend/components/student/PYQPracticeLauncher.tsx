import { ArrowRight } from "lucide-react";

import {
  fireButtonClass,
  panelClass,
  StatusBadge,
} from "@/components/shared/brand-ui";
import { cn } from "@/lib/utils";

type PYQPracticeLauncherProps = {
  availableCount: number;
  isStarting: boolean;
  onStart: () => void;
};

export default function PYQPracticeLauncher({
  availableCount,
  isStarting,
  onStart,
}: PYQPracticeLauncherProps) {
  const canStart = availableCount > 0 && !isStarting;

  return (
    <section className={cn(panelClass, "p-6")}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <StatusBadge tone="fire">Start PYQ practice</StatusBadge>
          <p className="max-w-2xl text-sm leading-7 text-[rgba(194,186,176,0.74)]">
            Launch a scored PYQ attempt from the currently filtered verified question set.
          </p>
        </div>
        <div className="space-y-3 text-left lg:text-right">
          <p className="font-display text-5xl tracking-[0.08em] text-[var(--cream)]">
            {availableCount}
          </p>
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.24em] text-[rgba(194,186,176,0.58)]">
            Questions ready
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onStart}
        disabled={!canStart}
        className={cn(fireButtonClass, "mt-6")}
      >
        {isStarting ? "Preparing..." : "Start PYQ Practice"}
        <ArrowRight className="h-4 w-4" />
      </button>

      {!canStart && !isStarting ? (
        <p className="mt-3 text-xs uppercase tracking-[0.22em] text-[rgba(194,186,176,0.58)]">
          Apply broader filters to get at least one verified PYQ question.
        </p>
      ) : null}
    </section>
  );
}
