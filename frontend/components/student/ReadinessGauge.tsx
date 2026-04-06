"use client";

import { ProgressRing } from "@/components/shared/brand-ui";

type ReadinessGaugeProps = {
  score: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export default function ReadinessGauge({ score }: ReadinessGaugeProps) {
  const safeScore = clamp(Number.isFinite(score) ? score : 0, 0, 100);
  const tone =
    safeScore >= 70 ? "success" : safeScore >= 40 ? "warning" : "fire";

  return <ProgressRing value={safeScore} label="Readiness" tone={tone} />;
}
