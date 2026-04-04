import Link from "next/link";

const featureCards = [
  {
    title: "Weakness Detection",
    description:
      "ML-powered scoring pinpoints topics where your mastery is dropping before it impacts your rank.",
  },
  {
    title: "Adaptive Quiz",
    description:
      "Every quiz is assembled around your weakest concepts so each session closes real learning gaps.",
  },
  {
    title: "Spaced Revision",
    description:
      "A smart revision engine schedules the next review at exactly the right time for long-term retention.",
  },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-linear-to-br from-slate-900 via-slate-900 to-indigo-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-24 -right-30 h-72 w-72 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="absolute -bottom-30 -left-25 h-80 w-80 rounded-full bg-sky-500/20 blur-3xl" />
      </div>

      <nav className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <p className="text-xl font-semibold tracking-tight text-indigo-300">
          SmartExamPrep
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-xl border border-indigo-400/40 px-4 py-2 text-sm font-medium text-indigo-200 transition hover:border-indigo-300 hover:bg-indigo-500/10"
          >
            Login
          </Link>
          <Link
            href="/login?mode=register"
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            Get Started
          </Link>
        </div>
      </nav>

      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-16 pt-8 text-center md:pb-24 md:pt-20">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.22em] text-indigo-300/90">
          AI Mentored GATE CSE Preparation
        </p>
        <h1 className="mx-auto max-w-4xl text-balance text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">
          Build Rank-Winning Momentum with Focused, Adaptive Study Loops
        </h1>
        <p className="mx-auto mt-6 max-w-3xl text-pretty text-base leading-relaxed text-slate-300 sm:text-lg">
          SmartExamPrep continuously analyzes your attempts, prioritizes your
          weak areas, and gives you a high-impact daily path so your prep stays
          sharp and consistent.
        </p>
        <div className="mt-10">
          <Link
            href="/login?mode=register"
            className="inline-flex items-center rounded-2xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-950/50 transition hover:-translate-y-0.5 hover:bg-indigo-500"
          >
            Start Your Smart Plan
          </Link>
        </div>
      </section>

      <section className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 gap-5 px-6 pb-20 md:grid-cols-3">
        {featureCards.map((feature) => (
          <article
            key={feature.title}
            className="rounded-2xl border border-slate-700/70 bg-slate-800/60 p-6 backdrop-blur-sm transition hover:border-indigo-400/50 hover:bg-slate-800/90"
          >
            <h2 className="text-xl font-semibold text-white">{feature.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              {feature.description}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
