import { Loader2 } from "lucide-react";

import { panelClass } from "@/components/shared/brand-ui";
import { cn } from "@/lib/utils";

type LoadingSpinnerProps = {
  message?: string;
};

export default function LoadingSpinner({
  message = "Loading...",
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        panelClass,
        "app-noise flex min-h-80 w-full flex-col items-center justify-center gap-4 p-8 text-center"
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[rgba(232,82,10,0.2)] bg-[rgba(232,82,10,0.08)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--fire)]" aria-hidden />
      </div>
      <p className="font-mono text-[0.72rem] uppercase tracking-[0.28em] text-[rgba(194,186,176,0.72)]">
        {message}
      </p>
    </div>
  );
}
