"use client";

type ReadinessGaugeProps = {
  score: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export default function ReadinessGauge({ score }: ReadinessGaugeProps) {
  const safeScore = clamp(Number.isFinite(score) ? score : 0, 0, 100);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (safeScore / 100) * circumference;

  const meterColor =
    safeScore >= 70 ? "#22c55e" : safeScore >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative flex h-36 w-36 items-center justify-center">
      <svg width="144" height="144" viewBox="0 0 144 144" className="-rotate-90">
        <circle
          cx="72"
          cy="72"
          r={radius}
          fill="none"
          stroke="#1e293b"
          strokeWidth="10"
        />
        <circle
          cx="72"
          cy="72"
          r={radius}
          fill="none"
          stroke={meterColor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeOffset}
          style={{ transition: "stroke-dashoffset 0.7s ease-out" }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-3xl font-bold text-white">{Math.round(safeScore)}</p>
        <p className="text-xs text-slate-400">Readiness</p>
      </div>
    </div>
  );
}
