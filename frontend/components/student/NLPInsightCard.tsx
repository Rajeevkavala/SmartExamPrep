import { Lightbulb } from "lucide-react";

import { panelClass, SectionLabel } from "@/components/shared/brand-ui";
import { cn } from "@/lib/utils";

type NLPInsightCardProps = {
  insight: string;
};

export default function NLPInsightCard({ insight }: NLPInsightCardProps) {
  return (
    <section className={cn(panelClass, "overflow-hidden p-6")}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(232,82,10,0.16),transparent_34%)]" />
      <div className="relative space-y-4">
        <SectionLabel>AI focus hint</SectionLabel>
        <div className="flex items-start gap-4 rounded-[24px] border border-[rgba(232,82,10,0.18)] bg-[rgba(232,82,10,0.06)] p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[rgba(232,82,10,0.24)] bg-[rgba(232,82,10,0.08)]">
            <Lightbulb className="h-5 w-5 text-[var(--fire)]" />
          </div>
          <p className="font-serif text-lg italic leading-8 text-[var(--cream)]">{insight}</p>
        </div>
      </div>
    </section>
  );
}
