import Link from "next/link";
import type { ReactNode } from "react";

import {
  fireButtonClass,
  panelClass,
  SectionLabel,
} from "@/components/shared/brand-ui";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export default function EmptyState({
  icon,
  title,
  description,
  ctaLabel,
  ctaHref,
}: EmptyStateProps) {
  const hasCta = Boolean(ctaLabel && ctaHref);

  return (
    <div
      className={cn(
        panelClass,
        "app-noise flex min-h-70 w-full flex-col items-center justify-center px-6 py-12 text-center"
      )}
    >
      <SectionLabel className="justify-center">Recovery State</SectionLabel>
      <div className="mt-5 flex h-16 w-16 items-center justify-center rounded-full border border-[rgba(232,82,10,0.2)] bg-[rgba(232,82,10,0.08)] text-3xl text-[var(--fire)]" aria-hidden>
        {icon ?? "o"}
      </div>
      <h3 className="mt-5 font-display text-4xl leading-none tracking-[0.08em] text-[var(--cream)]">
        {title}
      </h3>
      <p className="mt-3 max-w-lg text-sm leading-7 text-[rgba(194,186,176,0.76)]">
        {description}
      </p>
      {hasCta ? (
        <Link href={ctaHref as string} className={cn(fireButtonClass, "mt-7")}>
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}
