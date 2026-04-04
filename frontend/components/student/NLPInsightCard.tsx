type NLPInsightCardProps = {
  insight: string;
};

export default function NLPInsightCard({ insight }: NLPInsightCardProps) {
  return (
    <section className="rounded-2xl border border-indigo-500/30 bg-linear-to-r from-slate-900 via-indigo-900/50 to-slate-900 p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
        AI Insight
      </p>
      <p className="mt-3 text-sm leading-relaxed text-slate-200">{insight}</p>
    </section>
  );
}
