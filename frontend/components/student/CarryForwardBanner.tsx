import { ArrowUpRight } from "lucide-react";

import {
  fireButtonClass,
  panelClass,
  StatusBadge,
} from "@/components/shared/brand-ui";
import { cn } from "@/lib/utils";

type CarryForwardBannerProps = {
  hasCarryForward: boolean;
  carryForwardFromPlanId: string | null;
  isApplying: boolean;
  onApplyCarryForward: () => void | Promise<void>;
};

export default function CarryForwardBanner({
  hasCarryForward,
  carryForwardFromPlanId,
  isApplying,
  onApplyCarryForward,
}: CarryForwardBannerProps) {
  return (
    <section className={cn(panelClass, "overflow-hidden p-5")}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.14),transparent_34%)]" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <StatusBadge tone="warning">Carry-forward tasks</StatusBadge>
          <p className="max-w-2xl text-sm leading-7 text-[rgba(194,186,176,0.74)]">
            {hasCarryForward
              ? `Today's plan already includes unfinished work from plan ${carryForwardFromPlanId?.slice(0, 8) ?? "previous day"}.`
              : "Bring unfinished tasks from the previous plan into today if the loop needs another pass."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onApplyCarryForward()}
          disabled={isApplying}
          className={cn(fireButtonClass, "justify-center")}
        >
          {isApplying ? "Applying..." : "Carry forward"}
          <ArrowUpRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
