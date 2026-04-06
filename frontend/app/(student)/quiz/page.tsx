import Link from "next/link";

import {
  PageHeader,
  panelClass,
  StatusBadge,
} from "@/components/shared/brand-ui";
import { cn } from "@/lib/utils";

const cards = [
  {
    title: "Diagnostic Quiz",
    description: "Baseline assessment across core GATE CSE topics before the loop starts adapting.",
    href: "/quiz/diagnostic",
    tone: "fire" as const,
  },
  {
    title: "Adaptive Quiz",
    description: "AI-targeted practice assembled around your current weak areas and planner context.",
    href: "/quiz/adaptive",
    tone: "ice" as const,
  },
  {
    title: "PYQ Practice",
    description: "Launch verified previous-year practice from the filtered PYQ browser.",
    href: "/pyq",
    tone: "warning" as const,
  },
];

export default function QuizIndexPage() {
  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="Quiz console"
        title="CHOOSE THE RIGHT TESTING MODE FOR THE NEXT LOOP."
        description="Use diagnostic mode for baseline, adaptive mode for weak-topic pressure, and PYQ practice when you want official-paper context."
        badge={<StatusBadge tone="fire">Assessment modes</StatusBadge>}
      />

      <section className="grid gap-4 lg:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className={cn(panelClass, "p-6 transition hover:-translate-y-0.5")}>
            <StatusBadge tone={card.tone}>{card.title}</StatusBadge>
            <p className="mt-5 font-display text-4xl tracking-[0.08em] text-[var(--cream)]">
              {card.title}
            </p>
            <p className="mt-4 text-sm leading-7 text-[rgba(194,186,176,0.74)]">
              {card.description}
            </p>
          </Link>
        ))}
      </section>
    </main>
  );
}
