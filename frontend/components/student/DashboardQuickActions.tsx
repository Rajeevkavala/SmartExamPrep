import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { panelClass, StatusBadge } from "@/components/shared/brand-ui";
import type { DashboardQuickActionItem } from "@/store/dashboardStore";
import { cn } from "@/lib/utils";

type DashboardQuickActionsProps = {
  actions: DashboardQuickActionItem[];
};

const variantToneMap: Record<string, "fire" | "ice" | "success" | "warning" | "neutral"> =
  {
    primary: "fire",
    accent: "ice",
    secondary: "ice",
    success: "success",
    neutral: "neutral",
  };

export default function DashboardQuickActions({ actions }: DashboardQuickActionsProps) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {actions.map((action) => {
        const tone = variantToneMap[action.variant] ?? "neutral";

        return (
          <Link key={`${action.href}-${action.label}`} href={action.href} className={cn(panelClass, "p-5 transition hover:-translate-y-0.5")}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <StatusBadge tone={tone}>{action.label}</StatusBadge>
                <p className="mt-4 text-sm leading-7 text-[rgba(194,186,176,0.74)]">
                  {action.description}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-[rgba(194,186,176,0.58)]" />
            </div>
          </Link>
        );
      })}
    </section>
  );
}
