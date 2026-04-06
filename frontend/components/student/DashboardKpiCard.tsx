import { MetricCard } from "@/components/shared/brand-ui";

type DashboardKpiCardProps = {
  label: string;
  value: string | number;
  helperText?: string;
  tone?: "sky" | "emerald" | "amber" | "indigo" | "slate";
};

const toneMap: Record<
  NonNullable<DashboardKpiCardProps["tone"]>,
  "ice" | "success" | "warning" | "fire" | "neutral"
> = {
  sky: "ice",
  emerald: "success",
  amber: "warning",
  indigo: "fire",
  slate: "neutral",
};

export default function DashboardKpiCard({
  label,
  value,
  helperText,
  tone = "slate",
}: DashboardKpiCardProps) {
  return <MetricCard label={label} value={value} helper={helperText} tone={toneMap[tone]} />;
}
