import type { TopicSummary } from "@/store/dashboardStore";

type WeaknessBarProps = {
  topic: TopicSummary;
};

export default function WeaknessBar({ topic }: WeaknessBarProps) {
  const weakness = Math.min(Math.max(topic.weakness_score, 0), 100);

  const levelPalette: Record<
    TopicSummary["mastery_level"],
    { bar: string; text: string }
  > = {
    Weak: { bar: "bg-red-500", text: "text-red-300" },
    Moderate: { bar: "bg-amber-500", text: "text-amber-300" },
    Strong: { bar: "bg-emerald-500", text: "text-emerald-300" },
  };

  const palette = levelPalette[topic.mastery_level] ?? levelPalette.Moderate;

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{topic.topic_name}</p>
          <p className="text-xs text-slate-400">{topic.subject_name}</p>
        </div>
        <div className="text-right">
          <p className={`text-xs font-semibold ${palette.text}`}>
            {topic.mastery_level}
          </p>
          <p className="text-xs text-slate-400">
            {(topic.accuracy * 100).toFixed(0)}% accuracy
          </p>
        </div>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-700">
        <div
          className={`h-2 rounded-full ${palette.bar} transition-all duration-500`}
          style={{ width: `${weakness}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-slate-500">
        <span>Strong</span>
        <span>Weakness {Math.round(weakness)}/100</span>
        <span>Weak</span>
      </div>
    </div>
  );
}
