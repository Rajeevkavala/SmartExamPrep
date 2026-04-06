import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

export const pageFrameClass = "mx-auto w-full max-w-[1500px]";

export const panelClass =
  "relative overflow-hidden rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(17,17,24,0.94),rgba(8,8,12,0.96))] shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl";

export const insetPanelClass =
  "rounded-[22px] border border-white/8 bg-[rgba(255,255,255,0.03)]";

export const fireButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-full border border-[rgba(232,82,10,0.3)] bg-[var(--fire)] px-5 py-3 font-mono text-[0.68rem] font-medium uppercase tracking-[0.32em] text-white transition duration-300 hover:-translate-y-0.5 hover:bg-[var(--fire2)] disabled:cursor-not-allowed disabled:opacity-50";

export const iceButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-full border border-[rgba(0,212,255,0.22)] bg-[rgba(0,212,255,0.08)] px-5 py-3 font-mono text-[0.68rem] font-medium uppercase tracking-[0.32em] text-[var(--ice)] transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(0,212,255,0.4)] hover:bg-[rgba(0,212,255,0.14)] disabled:cursor-not-allowed disabled:opacity-50";

export const ghostButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-transparent px-5 py-3 font-mono text-[0.68rem] font-medium uppercase tracking-[0.32em] text-[var(--cream)] transition duration-300 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50";

export const monoLabelClass =
  "font-mono text-[0.68rem] uppercase tracking-[0.3em] text-[rgba(194,186,176,0.7)]";

export const inputClass =
  "w-full border-b border-white/12 bg-transparent px-0 py-3 text-sm text-[var(--cream)] outline-none transition placeholder:text-[rgba(194,186,176,0.45)] focus:border-[var(--fire)]";

export const selectClass =
  "w-full border-b border-white/12 bg-transparent px-0 py-3 text-sm text-[var(--cream)] outline-none transition focus:border-[var(--fire)]";

export const textareaClass =
  "w-full rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.025)] px-4 py-3 text-sm text-[var(--cream)] outline-none transition placeholder:text-[rgba(194,186,176,0.45)] focus:border-[var(--fire)]";

type SectionLabelProps = {
  children: ReactNode;
  tone?: "fire" | "ice" | "cream";
  className?: string;
};

export function SectionLabel({
  children,
  tone = "fire",
  className,
}: SectionLabelProps) {
  const toneClass =
    tone === "ice"
      ? "text-[var(--ice)] before:bg-[var(--ice)]"
      : tone === "cream"
        ? "text-[var(--cream)] before:bg-[var(--cream)]"
        : "text-[var(--fire)] before:bg-[var(--fire)]";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 font-mono text-[0.68rem] uppercase tracking-[0.3em] before:h-px before:w-6 before:content-['']",
        toneClass,
        className
      )}
    >
      {children}
    </div>
  );
}

type SectionTitleProps = ComponentProps<"h2"> & {
  accent?: ReactNode;
};

export function SectionTitle({
  children,
  accent,
  className,
  ...props
}: SectionTitleProps) {
  return (
    <h2
      className={cn(
        "font-display text-[clamp(2.8rem,7vw,6rem)] leading-[0.92] tracking-[0.08em] text-[var(--cream)]",
        className
      )}
      {...props}
    >
      {children}
      {accent ? (
        <span className="font-serif text-[0.66em] italic tracking-normal text-[var(--fire)]">
          {" "}
          {accent}
        </span>
      ) : null}
    </h2>
  );
}

type PanelProps = ComponentProps<"section">;

export function Panel({ className, ...props }: PanelProps) {
  return <section className={cn(panelClass, className)} {...props} />;
}

type StatusBadgeProps = {
  children: ReactNode;
  tone?: "fire" | "ice" | "success" | "warning" | "neutral";
  className?: string;
};

export function StatusBadge({
  children,
  tone = "neutral",
  className,
}: StatusBadgeProps) {
  const toneClass =
    tone === "fire"
      ? "border-[rgba(232,82,10,0.28)] bg-[rgba(232,82,10,0.09)] text-[var(--fire)]"
      : tone === "ice"
        ? "border-[rgba(0,212,255,0.24)] bg-[rgba(0,212,255,0.08)] text-[var(--ice)]"
        : tone === "success"
          ? "border-[rgba(34,197,94,0.24)] bg-[rgba(34,197,94,0.08)] text-emerald-300"
          : tone === "warning"
            ? "border-[rgba(245,158,11,0.24)] bg-[rgba(245,158,11,0.08)] text-amber-300"
            : "border-white/10 bg-white/5 text-[var(--ink)]";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[0.62rem] uppercase tracking-[0.24em]",
        toneClass,
        className
      )}
    >
      {children}
    </span>
  );
}

type LiveIndicatorProps = {
  children: ReactNode;
  tone?: "fire" | "ice" | "success";
  className?: string;
};

export function LiveIndicator({
  children,
  tone = "fire",
  className,
}: LiveIndicatorProps) {
  const dotClass =
    tone === "ice"
      ? "bg-[var(--ice)]"
      : tone === "success"
        ? "bg-emerald-400"
        : "bg-[var(--fire)]";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.26em] text-[rgba(194,186,176,0.74)]",
        className
      )}
    >
      <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", dotClass)}>
        <span
          className={cn(
            "absolute inset-0 animate-ping rounded-full opacity-60",
            dotClass
          )}
        />
      </span>
      {children}
    </span>
  );
}

type MetricCardProps = {
  label: string;
  value: ReactNode;
  helper?: ReactNode;
  tone?: "fire" | "ice" | "success" | "warning" | "neutral";
  className?: string;
};

export function MetricCard({
  label,
  value,
  helper,
  tone = "neutral",
  className,
}: MetricCardProps) {
  const accentClass =
    tone === "fire"
      ? "text-[var(--fire)] after:bg-[var(--fire)]"
      : tone === "ice"
        ? "text-[var(--ice)] after:bg-[var(--ice)]"
        : tone === "success"
          ? "text-emerald-300 after:bg-emerald-400"
          : tone === "warning"
            ? "text-amber-300 after:bg-amber-400"
            : "text-[var(--cream)] after:bg-white/20";

  return (
    <article
      className={cn(
        insetPanelClass,
        "relative overflow-hidden p-5 after:absolute after:inset-x-5 after:top-0 after:h-px after:content-['']",
        className
      )}
    >
      <p className={cn(monoLabelClass, accentClass)}>{label}</p>
      <div
        className={cn(
          "mt-4 text-4xl font-display leading-none tracking-[0.08em]",
          accentClass
        )}
      >
        {value}
      </div>
      {helper ? (
        <div className="mt-3 text-sm leading-relaxed text-[rgba(194,186,176,0.76)]">
          {helper}
        </div>
      ) : null}
    </article>
  );
}

type ProgressBarProps = {
  value: number;
  tone?: "fire" | "ice" | "success" | "warning";
  className?: string;
};

export function ProgressBar({
  value,
  tone = "fire",
  className,
}: ProgressBarProps) {
  const safeValue = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const fillClass =
    tone === "ice"
      ? "from-[var(--ice2)] to-[var(--ice)]"
      : tone === "success"
        ? "from-emerald-500 to-emerald-300"
        : tone === "warning"
          ? "from-amber-500 to-amber-300"
          : "from-[var(--ember)] to-[var(--fire2)]";

  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-white/6", className)}>
      <div
        className={cn(
          "h-full rounded-full bg-gradient-to-r transition-[width] duration-700 ease-out",
          fillClass
        )}
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

type ProgressRingProps = {
  value: number;
  label?: string;
  tone?: "fire" | "ice" | "success" | "warning";
  size?: number;
  stroke?: number;
  valueSuffix?: string;
  className?: string;
};

export function ProgressRing({
  value,
  label = "Readiness",
  tone = "fire",
  size = 168,
  stroke = 14,
  valueSuffix = "%",
  className,
}: ProgressRingProps) {
  const safeValue = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const radius = size / 2 - stroke;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safeValue / 100) * circumference;
  const strokeColor =
    tone === "ice"
      ? "var(--ice)"
      : tone === "success"
        ? "#34d399"
        : tone === "warning"
          ? "#f59e0b"
          : "var(--fire)";

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeLinecap="round"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="font-display text-5xl leading-none tracking-[0.08em] text-[var(--cream)]">
          {Math.round(safeValue)}
          <span className="text-2xl text-[rgba(194,186,176,0.75)]">{valueSuffix}</span>
        </p>
        <p className="mt-2 font-mono text-[0.62rem] uppercase tracking-[0.28em] text-[rgba(194,186,176,0.68)]">
          {label}
        </p>
      </div>
    </div>
  );
}

type PageHeaderProps = {
  eyebrow: ReactNode;
  title: ReactNode;
  description: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  badge,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn(panelClass, "p-6 sm:p-8", className)}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,212,255,0.1),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(232,82,10,0.14),transparent_36%)]" />
      <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl space-y-4">
          <SectionLabel>{eyebrow}</SectionLabel>
          <h1 className="font-display text-[clamp(2.8rem,7vw,5.8rem)] leading-[0.9] tracking-[0.08em] text-[var(--cream)]">
            {title}
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-[rgba(194,186,176,0.78)] sm:text-base">
            {description}
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 xl:items-end">
          {badge}
          {actions}
        </div>
      </div>
    </header>
  );
}
