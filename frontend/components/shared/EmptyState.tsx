import Link from "next/link";
import type { ReactNode } from "react";

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
    <div className="flex min-h-70 w-full flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/70 px-6 text-center">
      <div className="mb-4 text-3xl text-indigo-300" aria-hidden>
        {icon ?? "○"}
      </div>
      <h3 className="text-xl font-semibold text-white">{title}</h3>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-300">
        {description}
      </p>
      {hasCta ? (
        <Link
          href={ctaHref as string}
          className="mt-6 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}
